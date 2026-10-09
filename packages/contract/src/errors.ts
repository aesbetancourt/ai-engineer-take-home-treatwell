import { z } from 'zod';

export const errorCodeSchema = z.enum(['VALIDATION_ERROR', 'NOT_FOUND', 'CONFLICT', 'BAD_REQUEST', 'INTERNAL_ERROR']);
export type ErrorCode = z.infer<typeof errorCodeSchema>;
export const errorCodes = errorCodeSchema.enum;

export const errorBodySchema = z.object({
  error: z.object({
    code: errorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});
export type ErrorBody = z.infer<typeof errorBodySchema>;
