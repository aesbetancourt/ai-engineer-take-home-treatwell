import { z } from 'zod';

export const auditActionSchema = z.enum(['create', 'update', 'delete']);
export type AuditAction = z.infer<typeof auditActionSchema>;

/** The fields of an appointment that the audit trail records. */
export const auditedFieldSchema = z.enum(['customerId', 'treatmentId', 'startsAt', 'status', 'price', 'notes']);
export type AuditedField = z.infer<typeof auditedFieldSchema>;

const auditValueSchema = z.union([z.string(), z.number(), z.null()]);
export type AuditValue = z.infer<typeof auditValueSchema>;

// The values are the ones that the API shows: a UTC start time and a status of the contract.
// A create has `from: null` for each field, and a delete has `to: null` for each field.
const auditChangeSchema = z.object({ from: auditValueSchema, to: auditValueSchema });

// An update holds only the fields that changed.
export const auditChangesSchema = z.partialRecord(auditedFieldSchema, auditChangeSchema);
export type AuditChanges = z.infer<typeof auditChangesSchema>;

export const auditEntrySchema = z.object({
  action: auditActionSchema,
  appointmentId: z.number().int(),
  // UTC ISO 8601.
  at: z.iso.datetime(),
  changes: auditChangesSchema,
});
export type AuditEntry = z.infer<typeof auditEntrySchema>;
