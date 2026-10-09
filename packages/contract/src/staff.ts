import { z } from 'zod';

export const staffMemberSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  // As sent when the staff member was created. It is unique without regard to letter case.
  email: z.string(),
  active: z.boolean(),
  // UTC ISO 8601.
  createdAt: z.iso.datetime(),
});
export type StaffMember = z.infer<typeof staffMemberSchema>;

const staffNameSchema = z.string().trim().min(1, { error: 'name must not be blank' });
const staffEmailSchema = z.string().trim().pipe(z.email({ error: 'email must be an email address' }));

export const createStaffBodySchema = z.object({
  name: staffNameSchema,
  email: staffEmailSchema,
});
export type CreateStaffBody = z.infer<typeof createStaffBodySchema>;

export const updateStaffBodySchema = z
  .object({
    name: staffNameSchema.optional(),
    email: staffEmailSchema.optional(),
    active: z.boolean().optional(),
  })
  .refine((body) => Object.values(body).some((value) => value !== undefined), { message: 'Nothing to update' });
export type UpdateStaffBody = z.infer<typeof updateStaffBodySchema>;

/** The staff member id in a URL path: digits only. */
export const staffIdParamSchema = z.string().regex(/^\d+$/);
