import type { Appointment } from '@venue/contract';
import type { AppointmentRow } from './appointments.repository';

export const MINUTE = 60 * 1000;

export function toAppointment({ appointment, customer, treatment }: AppointmentRow): Appointment {
  const endsAt = new Date(new Date(appointment.startsAt).getTime() + treatment.durationMin * MINUTE);
  return {
    id: appointment.id,
    startsAt: appointment.startsAt,
    endsAt: endsAt.toISOString(),
    // The column holds free text. The contract names the values it can hold.
    status: appointment.status as Appointment['status'],
    price: appointment.price,
    notes: appointment.notes,
    createdAt: appointment.createdAt,
    customer,
    treatment,
  };
}
