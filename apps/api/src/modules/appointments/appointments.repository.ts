import { and, eq, like, type SQL } from 'drizzle-orm';
import type { ListAppointmentsQuery } from '@venue/contract';
import { db } from '../../db';
import { appointments, customers, treatments } from '../../db/schema';

type AppointmentRecord = typeof appointments.$inferSelect;
type NewAppointmentRecord = typeof appointments.$inferInsert;
type AppointmentChanges = Partial<Pick<AppointmentRecord, 'status' | 'notes' | 'startsAt'>>;

/** An appointment with the customer and the treatment it books. */
export type AppointmentRow = {
  appointment: AppointmentRecord;
  customer: typeof customers.$inferSelect;
  treatment: typeof treatments.$inferSelect;
};

function selectAppointmentRows() {
  return db
    .select({ appointment: appointments, customer: customers, treatment: treatments })
    .from(appointments)
    .innerJoin(customers, eq(customers.id, appointments.customerId))
    .innerJoin(treatments, eq(treatments.id, appointments.treatmentId));
}

export function listAppointmentRows(filter: ListAppointmentsQuery): AppointmentRow[] {
  const conditions: SQL[] = [];
  if (filter.status) {
    conditions.push(eq(appointments.status, filter.status));
  }
  if (filter.date) {
    conditions.push(like(appointments.startsAt, `${filter.date}%`));
  }
  return selectAppointmentRows()
    .where(and(...conditions))
    .orderBy(appointments.startsAt)
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
