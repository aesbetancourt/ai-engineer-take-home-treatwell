import { and, eq, inArray, isNull, like, type SQL } from 'drizzle-orm';
import { LEGACY_CANCELLED_STATUS, appointmentStatusSchema, type ListAppointmentsQuery } from '@venue/contract';
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

export function listAppointmentRows(filter: ListAppointmentsQuery): AppointmentRow[] {
  const conditions: SQL[] = [];
  if (filter.status === CANCELLED) {
    // Legacy appointments store the status `canceled`.
    conditions.push(inArray(appointments.status, [CANCELLED, LEGACY_CANCELLED_STATUS]));
  } else if (filter.status) {
    conditions.push(eq(appointments.status, filter.status));
  }
  if (filter.date) {
    conditions.push(like(appointments.startsAt, `${filter.date}%`));
  }
  return selectAppointmentRows()
    .where(and(...conditions))
    .orderBy(appointments.startsAtUtc, appointments.id)
    .all();
}

export function findAppointmentRow(id: number): AppointmentRow | undefined {
  return selectAppointmentRows().where(eq(appointments.id, id)).get();
}

export function listAppointmentRowsOfCustomer(customerId: number): AppointmentRow[] {
  return selectAppointmentRows().where(eq(appointments.customerId, customerId)).all();
}

export function listAppointmentStatusesAndPrices(): Pick<AppointmentRecord, 'status' | 'price'>[] {
  return db.select({ status: appointments.status, price: appointments.price }).from(appointments).all();
}

export function listConfirmedAppointmentRowsWithoutReminder(): AppointmentRow[] {
  return selectAppointmentRows()
    .where(and(eq(appointments.status, CONFIRMED), isNull(appointments.reminderSentAt)))
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
    .where(and(eq(appointments.id, id), eq(appointments.status, CONFIRMED), isNull(appointments.reminderSentAt)))
    .run();
  return changes === 1;
}

export function insertAppointment(values: NewAppointmentRecord): AppointmentRecord {
  return db.insert(appointments).values(values).returning().get();
}

export function updateAppointment(id: number, changes: AppointmentChanges): void {
  db.update(appointments).set(changes).where(eq(appointments.id, id)).run();
}

export function findCustomer(id: number) {
  return db.select().from(customers).where(eq(customers.id, id)).get();
}

export function findTreatment(id: number) {
  return db.select().from(treatments).where(eq(treatments.id, id)).get();
}
