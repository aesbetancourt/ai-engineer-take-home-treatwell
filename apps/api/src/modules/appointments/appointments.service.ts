import {
  appointmentStatusSchema,
  type Appointment,
  type AppointmentSummary,
  type CreateAppointmentBody,
  type ListAppointmentsQuery,
  type UpdateAppointmentBody,
} from '@venue/contract';
import { ConflictError, NotFoundError } from '../../shared/errors';
import { MINUTE, toAppointment } from './appointments.mapper';
import * as repository from './appointments.repository';

const statuses = appointmentStatusSchema.enum;
const REVENUE_STATUSES: string[] = [statuses.confirmed, statuses.completed];

/** Lists appointments by start time, with an optional status and an optional date prefix. */
export function listAppointments(query: ListAppointmentsQuery): Appointment[] {
  return repository.listAppointmentRows(query).map(toAppointment);
}

/** Counts appointments per status. Revenue counts confirmed and completed appointments only. */
export function getAppointmentSummary(): AppointmentSummary {
  const rows = repository.listAppointmentStatusesAndPrices();
  const byStatus: Record<string, number> = {};
  let revenue = 0;
  for (const row of rows) {
    byStatus[row.status] = (byStatus[row.status] ?? 0) + 1;
    if (REVENUE_STATUSES.includes(row.status)) {
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

/** Books a pending appointment. The price is copied from the treatment, and a customer cannot be double-booked. */
export function createAppointment(body: CreateAppointmentBody): Appointment {
  const customer = repository.findCustomer(body.customerId);
  if (!customer) {
    throw new NotFoundError('Customer not found');
  }
  const treatment = repository.findTreatment(body.treatmentId);
  if (!treatment) {
    throw new NotFoundError('Treatment not found');
  }

  const start = new Date(body.startsAt).getTime();
  const end = start + treatment.durationMin * MINUTE;
  const hasOverlap = repository.listAppointmentRowsOfCustomer(customer.id).some((existing) => {
    const existingStart = new Date(existing.appointment.startsAt).getTime();
    const existingEnd = existingStart + existing.treatment.durationMin * MINUTE;
    return start <= existingEnd && end >= existingStart;
  });
  if (hasOverlap) {
    throw new ConflictError('Customer already has an appointment at this time');
  }

  const appointment = repository.insertAppointment({
    customerId: customer.id,
    treatmentId: treatment.id,
    startsAt: body.startsAt,
    status: statuses.pending,
    price: treatment.price,
    notes: body.notes || null,
    createdAt: Date.now(),
  });
  return toAppointment({ appointment, customer, treatment });
}

/** Changes the status, the notes or the start time of an appointment. */
export function updateAppointment(id: number, body: UpdateAppointmentBody): Appointment {
  repository.updateAppointment(id, body);
  return getAppointment(id);
}
