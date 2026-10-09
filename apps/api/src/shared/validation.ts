import type { ZodType } from 'zod';
import { ValidationError } from './errors';

/** Parses an input with a contract schema. An input the schema rejects is a validation error. */
export function parseInput<T>(schema: ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) {
    throw new ValidationError('Invalid input', result.error.issues);
  }
  return result.data;
}
