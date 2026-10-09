import { and, asc, count, desc, eq, gte, inArray, isNull, lt, type SQL } from 'drizzle-orm';
import {
  LEGACY_CANCELLED_STATUS,
  appointmentStatusSchema,
  sortDirectionSchema,
  type AppointmentSortField,
  type AppointmentStatus,
  type SortDirection,
} from '@venue/contract';
import { db } from '../../db';
import { appointments, customers, treatments } from '../../db/schema';

const CANCELLED = appointmentStatusSchema.enum.cancelled;
const CONFIRMED = appointmentStatusSchema.enum.confirmed;

type AppointmentRecord = typeof appointments.$inferSelect;
type NewAppointmentRecord = typeof appointments.$inferInsert;
type AppointmentChanges = Partial<Pick<AppointmentRecord, 'status' | 'notes' | 'startsAt'>>;

/** An appointment with the customer and the treatment it books. */
export type AppointmentRow = {
  appointment: AppointmentRecord;
  customer: typeof customers.$inferSelect;
  treatment: typeof treatments.$inferSelect;
};

/**
 * Runs the reads and the writes of `work` as one transaction. It takes the write lock at the start, so another
 * replica cannot write between a check and the write that depends on it. `work` must be synchronous.
 */
export function inReadTransaction<T>(work: () => T): T {
  // A deferred transaction: each read inside `work` sees the same state of the database.
  return db.transaction(work);
}

export function inWriteTransaction<T>(work: () => T): T {
  // The module has one connection, so each query inside `work` is part of this transaction.
  return db.transaction(work, { behavior: 'immediate' });
}

function selectAppointmentRows() {
  return db
    .select({ appointment: appointments, customer: customers, treatment: treatments })
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .innerJoin(treatments, eq(treatments.id, appointments.treatmentId));
}

/** The filters of the appointment list. The start times are UTC ISO 8601. */
export type AppointmentFilter = { status?: AppointmentStatus; startsFrom?: string; startsBefore?: string };

type AppointmentPage = { sortBy: AppointmentSortField; sortDir: SortDirection; limit: number; offset: number };

const SORT_COLUMNS = {
  startsAt: appointments.startsAtUtc,
  createdAt: appointments.createdAt,
  price: appointments.price,
};

// Each read and each rule leaves out a deleted appointment.
const isNotDeleted = isNull(appointments.deletedAt);

function toCondition(filter: AppointmentFilter): SQL | undefined {
  const conditions: SQL[] = [isNotDeleted];
  if (filter.status === CANCELLED) {
    // Legacy appointments store the status `canceled`.
    conditions.push(inArray(appointments.status, [CANCELLED, LEGACY_CANCELLED_STATUS]));
  } else if (filter.status) {
    conditions.push(eq(appointments.status, filter.status));
  }
  if (filter.startsFrom) {
    conditions.push(gte(appointments.startsAtUtc, filter.startsFrom));
  }
  if (filter.startsBefore) {
    conditions.push(lt(appointments.startsAtUtc, filter.startsBefore));
  }
  return and(...conditions);
}

/**
 * Returns one page of the appointments that match the filter. The id is the last sort key, so the order is stable
 * for equal values. It follows the direction, so `desc` is the exact reverse of `asc`.
 */
export function listAppointmentRows(filter: AppointmentFilter, page: AppointmentPage): AppointmentRow[] {
  const direction = page.sortDir === sortDirectionSchema.enum.desc ? desc : asc;
  return selectAppointmentRows()
    .where(toCondition(filter))
    .orderBy(direction(SORT_COLUMNS[page.sortBy]), direction(appointments.id))
    .limit(page.limit)
    .offset(page.offset)
    .all();
}

/** Counts the appointments that match the filter. It uses the joins of the list, so both see the same appointments. */
export function countAppointmentRows(filter: AppointmentFilter): number {
  const row = db
    .select({ total: count() })
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .innerJoin(treatments, eq(treatments.id, appointments.treatmentId))
    .where(toCondition(filter))
    .get();
  return row?.total ?? 0;
}

export function findAppointmentRow(id: number): AppointmentRow | undefined {
  return selectAppointmentRows().where(and(eq(appointments.id, id), isNotDeleted)).get();
}

export function listAppointmentRowsOfCustomer(customerId: number): AppointmentRow[] {
  return selectAppointmentRows().where(and(eq(appointments.customerId, customerId), isNotDeleted)).all();
}

export function listAppointmentStatusesAndPrices(): Pick<AppointmentRecord, 'status' | 'price'>[] {
  return db.select({ status: appointments.status, price: appointments.price }).from(appointments).where(isNotDeleted).all();
}

export function listConfirmedAppointmentRowsWithoutReminder(): AppointmentRow[] {
  return selectAppointmentRows()
    .where(and(eq(appointments.status, CONFIRMED), isNull(appointments.reminderSentAt), isNotDeleted))
    .all();
}

/**
 * Marks the reminder of a confirmed appointment as sent, in one atomic update. It returns `true` for the one caller
 * that changed the row, so only that replica sends the email.
 */
export function claimReminder(id: number, at: number): boolean {
  const { changes } = db
    .update(appointments)
    .set({ reminderSentAt: at })
    .where(
      and(eq(appointments.id, id), eq(appointments.status, CONFIRMED), isNull(appointments.reminderSentAt), isNotDeleted),
    )
    .run();
  return changes === 1;
}

export function insertAppointment(values: NewAppointmentRecord): AppointmentRecord {
  return db.insert(appointments).values(values).returning().get();
}

export function updateAppointment(id: number, changes: AppointmentChanges): void {
  db.update(appointments).set(changes).where(and(eq(appointments.id, id), isNotDeleted)).run();
}

/**
 * Marks an appointment as deleted, in one atomic update. It returns `false` when no appointment has this id, or when
 * the appointment is deleted already.
 */
export function markAppointmentDeleted(id: number, at: string): boolean {
  const { changes } = db
    .update(appointments)
    .set({ deletedAt: at })
    .where(and(eq(appointments.id, id), isNotDeleted))
    .run();
  return changes === 1;
}

export function findCustomer(id: number) {
  return db.select().from(customers).where(eq(customers.id, id)).get();
}

export function findTreatment(id: number) {
  return db.select().from(treatments).where(eq(treatments.id, id)).get();
}
