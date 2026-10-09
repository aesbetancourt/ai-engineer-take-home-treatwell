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

export function toAppointment({ appointment, customer, treatment }: AppointmentRow): Appointment {
  const endsAt = new Date(new Date(appointment.startsAt).getTime() + treatment.durationMin * MINUTE);
  return {
    id: appointment.id,
    startsAt: appointment.startsAt,
    endsAt: endsAt.toISOString(),
    status: toStatus(appointment.status),
    price: appointment.price,
    notes: appointment.notes,
    createdAt: appointment.createdAt,
    customer,
    treatment,
  };
}
