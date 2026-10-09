import { errorCodes, type ErrorCode } from '@venue/contract';

export class AppError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: unknown) {
    super(400, errorCodes.VALIDATION_ERROR, message, details);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, errorCodes.NOT_FOUND, message);
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(409, errorCodes.CONFLICT, message);
  }
}
