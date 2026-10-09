import {
  appointmentStatusSchema,
  auditActionSchema,
  auditedFieldSchema,
  venueTimeToUtc,
  type Appointment,
  type AppointmentSummary,
  type AuditAction,
  type AuditChanges,
  type AuditEntry,
  type CreateAppointmentBody,
  type ListAppointmentsQuery,
  type ListAppointmentsResponse,
  type UpdateAppointmentBody,
} from '@venue/contract';
import { ConflictError, NotFoundError } from '../../shared/errors';
import {
  MINUTE,
  toAppointment,
  toAuditEntry,
  toAuditedValues,
  toStatus,
  toUtcStart,
  type AuditedValues,
} from './appointments.mapper';
import * as repository from './appointments.repository';

const DAY = 24 * 60 * MINUTE;
const statuses = appointmentStatusSchema.enum;
const auditActions = auditActionSchema.enum;
const REVENUE_STATUSES: string[] = [statuses.confirmed, statuses.completed];

/** Returns the UTC instant at which a date starts in the venue. */
function startOfVenueDay(date: string): string {
  return venueTimeToUtc(`${date}T00:00`);
}

/** Returns the date after a `YYYY-MM-DD` date. */
function nextDate(date: string): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + DAY).toISOString().slice(0, 10);
}

/** Lists one page of appointments. `from` and `to` are inclusive dates in venue time, so a day runs from midnight in the venue. */
export function listAppointments(query: ListAppointmentsQuery): ListAppointmentsResponse {
  const filter: repository.AppointmentFilter = {
    status: query.status,
    startsFrom: query.from ? startOfVenueDay(query.from) : undefined,
    // The day of `to` is included, so the list ends before the next day starts.
    startsBefore: query.to ? startOfVenueDay(nextDate(query.to)) : undefined,
  };
  // One transaction, so a write of another replica cannot make the total and the items disagree.
  const { rows, total } = repository.inReadTransaction(() => ({
    rows: repository.listAppointmentRows(filter, {
      sortBy: query.sortBy,
      sortDir: query.sortDir,
      limit: query.pageSize,
      offset: (query.page - 1) * query.pageSize,
    }),
    total: repository.countAppointmentRows(filter),
  }));
  return { items: rows.map(toAppointment), page: query.page, pageSize: query.pageSize, total };
}

/** Counts appointments per status. Revenue counts confirmed and completed appointments only. */
export function getAppointmentSummary(): AppointmentSummary {
  const rows = repository.listAppointmentStatusesAndPrices();
  const byStatus: Record<string, number> = {};
  let revenue = 0;
  for (const row of rows) {
    const status = toStatus(row.status);
    byStatus[status] = (byStatus[status] ?? 0) + 1;
    if (REVENUE_STATUSES.includes(status)) {
      revenue += row.price;
    }
  }
  return { total: rows.length, byStatus, revenue };
}

/** Returns one appointment. An unknown id is a not-found error. */
export function getAppointment(id: number): Appointment {
  const row = repository.findAppointmentRow(id);
  if (!row) {
    throw new NotFoundError('Appointment not found');
  }
  return toAppointment(row);
}

/** Writes an ISO 8601 time with an offset as the same instant in UTC. */
function toUtcIso(startsAt: string): string {
  return new Date(startsAt).toISOString();
}

type OverlapCheck = { customerId: number; startsAt: string; durationMin: number; ignoreAppointmentId?: number };

function isCancelled(status: string): boolean {
  return toStatus(status) === statuses.cancelled;
}

/** Rejects a start time that makes an overlap with another appointment of the customer. Cancelled appointments do not count. */
function assertNoOverlap({ customerId, startsAt, durationMin, ignoreAppointmentId }: OverlapCheck): void {
  const start = new Date(startsAt).getTime();
  const end = start + durationMin * MINUTE;
  const hasOverlap = repository.listAppointmentRowsOfCustomer(customerId).some((existing) => {
    if (existing.appointment.id === ignoreAppointmentId || isCancelled(existing.appointment.status)) {
      return false;
    }
    const existingStart = new Date(toUtcStart(existing.appointment)).getTime();
    const existingEnd = existingStart + existing.treatment.durationMin * MINUTE;
    // Back-to-back is fine: an appointment can start at the instant another one ends.
    return start < existingEnd && end > existingStart;
  });
  if (hasOverlap) {
    throw new ConflictError('Customer already has an appointment at this time');
  }
}

type AuditOptions = { appointmentId: number; action: AuditAction; before: AuditedValues | null; after: AuditedValues | null };

/**
 * Writes the audit entry of a change, with each field whose value differs. A create has no `before`, and a delete
 * has no `after`. It writes nothing when no value differs. It runs inside the transaction of the change.
 */
function recordAudit({ appointmentId, action, before, after }: AuditOptions): void {
  const changes: AuditChanges = {};
  for (const field of auditedFieldSchema.options) {
    const from = before ? before[field] : null;
    const to = after ? after[field] : null;
    if (before === null || after === null || from !== to) {
      changes[field] = { from, to };
    }
  }
  if (Object.keys(changes).length > 0) {
    repository.insertAuditRecord({ appointmentId, action, at: new Date().toISOString(), changes });
  }
}

/** Books a pending appointment. The price is copied from the treatment, and a customer cannot be double-booked. */
export function createAppointment(body: CreateAppointmentBody): Appointment {
  // The checks, the insert and the audit entry are one transaction, so two replicas cannot both pass the overlap check.
  return repository.inWriteTransaction(() => {
    const customer = repository.findCustomer(body.customerId);
    if (!customer) {
      throw new NotFoundError('Customer not found');
    }
    const treatment = repository.findTreatment(body.treatmentId);
    if (!treatment) {
      throw new NotFoundError('Treatment not found');
    }
    assertNoOverlap({ customerId: customer.id, startsAt: body.startsAt, durationMin: treatment.durationMin });

    const appointment = repository.insertAppointment({
      customerId: customer.id,
      treatmentId: treatment.id,
      startsAt: toUtcIso(body.startsAt),
      status: statuses.pending,
      price: treatment.price,
      notes: body.notes || null,
      createdAt: Date.now(),
    });
    recordAudit({
      appointmentId: appointment.id,
      action: auditActions.create,
      before: null,
      after: toAuditedValues(appointment),
    });
    return toAppointment({ appointment, customer, treatment });
  });
}

/** Changes the status, the notes or the start time. Cancelling is final, and a new start time cannot double-book. */
export function updateAppointment(id: number, body: UpdateAppointmentBody): Appointment {
  // The checks, the update and the audit entry are one transaction, as in createAppointment.
  return repository.inWriteTransaction(() => applyUpdate(id, body));
}

/** Checks the status rule and the overlap rule, then writes the values that differ. It runs inside the transaction. */
function applyUpdate(id: number, body: UpdateAppointmentBody): Appointment {
  const row = repository.findAppointmentRow(id);
  if (!row) {
    throw new NotFoundError('Appointment not found');
  }
  const before = toAuditedValues(row.appointment);
  if (before.status === statuses.cancelled && body.status !== undefined && body.status !== statuses.cancelled) {
    throw new ConflictError('A cancelled appointment cannot get another status');
  }
  // The request in the form that the API shows, so that it compares with the current values.
  const after: AuditedValues = { ...before };
  if (body.status !== undefined) {
    after.status = body.status;
  }
  if (body.notes !== undefined) {
    after.notes = body.notes;
  }
  if (body.startsAt !== undefined) {
    after.startsAt = toUtcIso(body.startsAt);
  }
  if (after.startsAt !== before.startsAt && after.status !== statuses.cancelled) {
    assertNoOverlap({
      customerId: row.customer.id,
      startsAt: after.startsAt,
      durationMin: row.treatment.durationMin,
      ignoreAppointmentId: id,
    });
  }
  // Only a value that differs is written. A legacy appointment keeps its stored status and start time
  // when the request repeats the values that the API shows.
  const changes: repository.AppointmentChanges = {};
  if (after.status !== before.status) {
    changes.status = after.status;
  }
  if (after.notes !== before.notes) {
    changes.notes = after.notes;
  }
  if (after.startsAt !== before.startsAt) {
    changes.startsAt = after.startsAt;
  }
  if (Object.keys(changes).length === 0) {
    return toAppointment(row);
  }
  repository.updateAppointment(id, changes);
  recordAudit({ appointmentId: id, action: auditActions.update, before, after });
  return getAppointment(id);
}

/** Deletes an appointment. It stays in the database, and each read and each rule leaves it out from then on. */
export function deleteAppointment(id: number): void {
  // The delete and its audit entry are one transaction.
  repository.inWriteTransaction(() => {
    const row = repository.findAppointmentRow(id);
    if (!row) {
      throw new NotFoundError('Appointment not found');
    }
    repository.markAppointmentDeleted(id, new Date().toISOString());
    recordAudit({ appointmentId: id, action: auditActions.delete, before: toAuditedValues(row.appointment), after: null });
  });
}

/** Returns the audit trail of an appointment, oldest first. A deleted appointment keeps its trail. */
export function getAppointmentAudit(id: number): AuditEntry[] {
  if (!repository.hasAppointmentRecord(id)) {
    throw new NotFoundError('Appointment not found');
  }
  return repository.listAuditRecords(id).map(toAuditEntry);
}
