import { z } from 'zod';

export const appointmentStatusSchema = z.enum(['pending', 'confirmed', 'completed', 'cancelled']);
export type AppointmentStatus = z.infer<typeof appointmentStatusSchema>;

/** The spelling that legacy appointments store for the status `cancelled`. No response holds it. */
export const LEGACY_CANCELLED_STATUS = 'canceled';

const appointmentCustomerSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable(),
  createdAt: z.string(),
});

const appointmentTreatmentSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  category: z.string(),
  price: z.number(),
  durationMin: z.number().int(),
});

export const appointmentSchema = z.object({
  id: z.number().int(),
  // UTC ISO 8601, also for a legacy appointment.
  startsAt: z.iso.datetime(),
  endsAt: z.iso.datetime(),
  status: appointmentStatusSchema,
  price: z.number(),
  notes: z.string().nullable(),
  // Epoch milliseconds.
  createdAt: z.number().int(),
  customer: appointmentCustomerSchema,
  treatment: appointmentTreatmentSchema,
});
export type Appointment = z.infer<typeof appointmentSchema>;

export const appointmentSummarySchema = z.object({
  total: z.number().int(),
  byStatus: z.record(z.string(), z.number().int()),
  revenue: z.number(),
});
export type AppointmentSummary = z.infer<typeof appointmentSummarySchema>;

// A time with no zone has no defined instant, so the input must end in `Z` or an offset.
const startsAtSchema = z.iso.datetime({ offset: true, error: 'startsAt must be ISO 8601 with Z or an offset' });

// Records the current behaviour: an unknown status matches no appointment, and `date` is a prefix of `startsAt`.
export const listAppointmentsQuerySchema = z.object({
  status: z.string().optional(),
  date: z.string().optional(),
});
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;

export const createAppointmentBodySchema = z.object({
  customerId: z.number().int().positive(),
  treatmentId: z.number().int().positive(),
  startsAt: startsAtSchema,
  notes: z.string().nullish(),
});
export type CreateAppointmentBody = z.infer<typeof createAppointmentBodySchema>;

export const updateAppointmentBodySchema = z
  .object({
    status: appointmentStatusSchema.optional(),
    notes: z.string().nullable().optional(),
    startsAt: startsAtSchema.optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), { message: 'Nothing to update' });
export type UpdateAppointmentBody = z.infer<typeof updateAppointmentBodySchema>;
