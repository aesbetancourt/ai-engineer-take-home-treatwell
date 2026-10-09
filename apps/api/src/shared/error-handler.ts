import type { FastifyError, FastifyInstance } from 'fastify';
import { errorCodes, type ErrorBody, type ErrorCode } from '@venue/contract';
import { AppError } from './errors';

function toErrorBody(code: ErrorCode, message: string, details?: unknown): ErrorBody {
  return { error: { code, message, details } };
}

function isClientError(statusCode: number | undefined): statusCode is number {
  return statusCode !== undefined && statusCode >= 400 && statusCode < 500;
}

/** Makes the one error body of the API from each error a route throws, and from each error of Fastify. */
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error: FastifyError | AppError, _req, reply) => {
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send(toErrorBody(error.code, error.message, error.details));
    }
    // Fastify rejects a request itself, for example when the JSON body is malformed.
    if (isClientError(error.statusCode)) {
      return reply.code(error.statusCode).send(toErrorBody(errorCodes.BAD_REQUEST, error.message));
    }
    app.log.error(error);
    return reply.code(500).send(toErrorBody(errorCodes.INTERNAL_ERROR, 'Internal server error'));
  });

  app.setNotFoundHandler((req, reply) => {
    return reply.code(404).send(toErrorBody(errorCodes.NOT_FOUND, `Route ${req.method} ${req.url} not found`));
  });
}
