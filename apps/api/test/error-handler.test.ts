import Fastify from 'fastify';
import { describe, expect, it } from 'vitest';
import { registerErrorHandler } from '../src/shared/error-handler';
import { ConflictError, NotFoundError, ValidationError } from '../src/shared/errors';

// The error handler has no endpoint of its own, so this test calls it on a bare Fastify app.
function buildApp() {
  const app = Fastify();
  registerErrorHandler(app);
  app.get('/validation', () => {
    throw new ValidationError('name must not be blank', { field: 'name' });
  });
  app.get('/not-found', () => {
    throw new NotFoundError('Appointment not found');
  });
  app.get('/conflict', () => {
    throw new ConflictError('Customer already has an appointment at this time');
  });
  app.post('/echo', (req) => req.body);
  app.get('/crash', () => {
    throw new Error('connection string postgres://user:secret@db');
  });
  return app;
}

describe('the error handler', () => {
  it('turns a validation error into 400 with the details', async () => {
    const res = await buildApp().inject('/validation');
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'name must not be blank', details: { field: 'name' } },
    });
  });

  it('turns a not-found error into 404', async () => {
    const res = await buildApp().inject('/not-found');
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: 'NOT_FOUND', message: 'Appointment not found' } });
  });

  it('turns a conflict error into 409', async () => {
    const res = await buildApp().inject('/conflict');
    expect(res.statusCode).toBe(409);
    expect(res.json()).toEqual({
      error: { code: 'CONFLICT', message: 'Customer already has an appointment at this time' },
    });
  });

  it('turns a malformed JSON body into 400', async () => {
    const res = await buildApp().inject({
      method: 'POST',
      url: '/echo',
      headers: { 'content-type': 'application/json' },
      payload: '{ not json',
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().error.code).toBe('BAD_REQUEST');
  });

  it('turns an unexpected error into 500 and hides its message', async () => {
    const res = await buildApp().inject('/crash');
    expect(res.statusCode).toBe(500);
    expect(res.json()).toEqual({ error: { code: 'INTERNAL_ERROR', message: 'Internal server error' } });
  });

  it('turns an unknown route into 404', async () => {
    const res = await buildApp().inject('/no-such-route');
    expect(res.statusCode).toBe(404);
    expect(res.json().error.code).toBe('NOT_FOUND');
  });
});
