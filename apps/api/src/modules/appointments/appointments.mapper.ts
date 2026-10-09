import { LEGACY_CANCELLED_STATUS, appointmentStatusSchema, type Appointment, type AppointmentStatus } from '@venue/contract';
import type { AppointmentRow } from './appointments.repository';

export const MINUTE = 60 * 1000;

/** Converts a stored status to a status of the contract. The legacy spelling `canceled` becomes `cancelled`. */
export function toStatus(stored: string): AppointmentStatus {
  if (stored === LEGACY_CANCELLED_STATUS) {
    return appointmentStatusSchema.enum.cancelled;
  }
  // The column holds free text. The contract names the values it can hold.
  return stored as AppointmentStatus;
}

/** Returns the UTC start time of an appointment. The generated column converts a legacy start time from venue time. */
export function toUtcStart(appointment: Pick<AppointmentRow['appointment'], 'startsAt' | 'startsAtUtc'>): string {
  if (appointment.startsAtUtc) {
    return appointment.startsAtUtc;
  }
  // An old version of the API stored any string that `Date` can parse, and SQLite cannot read each of them.
  return new Date(appointment.startsAt).toISOString();
}

export function toAppointment({ appointment, customer, treatment }: AppointmentRow): Appointment {
  const startsAt = toUtcStart(appointment);
  const endsAt = new Date(new Date(startsAt).getTime() + treatment.durationMin * MINUTE);
  return {
    id: appointment.id,
    startsAt,
    endsAt: endsAt.toISOString(),
    status: toStatus(appointment.status),
    price: appointment.price,
    notes: appointment.notes,
    createdAt: appointment.createdAt,
    customer,
    treatment,
  };
}
