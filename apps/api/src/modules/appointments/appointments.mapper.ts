import {
  LEGACY_CANCELLED_STATUS,
  appointmentStatusSchema,
  type Appointment,
  type AppointmentStatus,
  type AuditEntry,
  type AuditValue,
  type AuditedField,
} from '@venue/contract';
import type { AppointmentRecord, AppointmentRow, AuditRecord } from './appointments.repository';

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

/** The value of each audited field of an appointment, as the API shows it. */
export type AuditedValues = {
  customerId: number;
  treatmentId: number;
  startsAt: string;
  status: AppointmentStatus;
  price: number;
  notes: string | null;
} & Record<AuditedField, AuditValue>;

/** Returns the audited fields as the API shows them: a UTC start time and a status of the contract. */
export function toAuditedValues(appointment: AppointmentRecord): AuditedValues {
  return {
    customerId: appointment.customerId,
    treatmentId: appointment.treatmentId,
    startsAt: toUtcStart(appointment),
    status: toStatus(appointment.status),
    price: appointment.price,
    notes: appointment.notes,
  };
}

export function toAuditEntry(record: AuditRecord): AuditEntry {
  return {
    action: record.action,
    appointmentId: record.appointmentId,
    at: record.at,
    changes: record.changes,
  };
}
