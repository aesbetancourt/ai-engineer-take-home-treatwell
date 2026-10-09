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

/**
 * Reads the id of a URL path with the id schema of the contract. An id that the schema rejects, such as `1e0`,
 * becomes `NaN`, which no record has, so the caller answers 404 as for an unknown id.
 */
export function toId(schema: ZodType<string>, param: string): number {
  return schema.safeParse(param).success ? Number(param) : Number.NaN;
}
