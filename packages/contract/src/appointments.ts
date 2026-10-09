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

/** What a customer can see of an appointment. It holds no notes, and no email or phone of the customer. */
export const publicAppointmentSchema = appointmentSchema
  .pick({ id: true, startsAt: true, endsAt: true, status: true, price: true })
  .extend({
    customer: appointmentCustomerSchema.pick({ name: true }),
    treatment: appointmentTreatmentSchema.pick({ name: true, durationMin: true }),
  });
export type PublicAppointment = z.infer<typeof publicAppointmentSchema>;

/** The appointment id in a URL path: digits only. */
export const appointmentIdParamSchema = z.string().regex(/^\d+$/);

export const appointmentSummarySchema = z.object({
  total: z.number().int(),
  byStatus: z.record(z.string(), z.number().int()),
  revenue: z.number(),
});
export type AppointmentSummary = z.infer<typeof appointmentSummarySchema>;

// A time with no zone has no defined instant, so the input must end in `Z` or an offset.
const startsAtSchema = z.iso.datetime({ offset: true, error: 'startsAt must be ISO 8601 with Z or an offset' });

// A query string holds text, so a number arrives as digits. `1e1`, `1.5` and an empty value are not valid.
const positiveIntegerParam = z
  .string()
  .regex(/^\d+$/)
  .transform(Number)
  .pipe(z.number().int().min(1));

export const appointmentSortFieldSchema = z.enum(['startsAt', 'createdAt', 'price']);
export type AppointmentSortField = z.infer<typeof appointmentSortFieldSchema>;

export const sortDirectionSchema = z.enum(['asc', 'desc']);
export type SortDirection = z.infer<typeof sortDirectionSchema>;

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

// Strict: a parameter that this schema does not name, the old `date` included, is not valid.
export const listAppointmentsQuerySchema = z.strictObject({
  page: positiveIntegerParam.default(1),
  pageSize: positiveIntegerParam.pipe(z.number().max(MAX_PAGE_SIZE)).default(DEFAULT_PAGE_SIZE),
  status: appointmentStatusSchema.optional(),
  // `YYYY-MM-DD`, a date in venue time. Both dates are inclusive.
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  sortBy: appointmentSortFieldSchema.default('startsAt'),
  sortDir: sortDirectionSchema.default('asc'),
});
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;

export const listAppointmentsResponseSchema = z.object({
  items: z.array(appointmentSchema),
  page: z.number().int(),
  pageSize: z.number().int(),
  // Counts each appointment that matches the filters, on each page.
  total: z.number().int(),
});
export type ListAppointmentsResponse = z.infer<typeof listAppointmentsResponseSchema>;

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
