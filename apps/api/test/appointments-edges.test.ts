import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, type TestServer } from './characterization/helpers/server';

let api: TestServer;
beforeAll(async () => {
  api = await startServer();
});
afterAll(async () => {
  await api.stop();
});

// Records behaviour of the appointment endpoints that the characterization suite does not pin.
// Read-only checks come first.
describe('GET /appointments', () => {
  it('returns an empty list for an unknown status', async () => {
    const res = await api.get('/appointments?status=banana');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('ignores an empty status filter', async () => {
    const res = await api.get('/appointments?status=');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(14);
  });
});

describe('GET /appointments/:id', () => {
  it('returns a legacy appointment with its stored start time and the status cancelled', async () => {
    // Appointment 11 is a 20 minute treatment, imported as '2026-10-08 09:30' with the status 'canceled'.
    const res = await api.get('/appointments/11');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 11,
      startsAt: '2026-10-08 09:30',
      endsAt: '2026-10-08T09:50:00.000Z',
      status: 'cancelled',
    });
  });

  it('returns 404 for an id that is not a number', async () => {
    const res = await api.get('/appointments/abc');
    expect(res.status).toBe(404);
  });
});

describe('POST /appointments', () => {
  it('stores empty notes as null', async () => {
    const res = await api.post('/appointments', {
      customerId: 8,
      treatmentId: 2,
      startsAt: '2026-10-20T09:00:00.000Z',
      notes: '',
    });
    expect(res.status).toBe(201);
    expect(res.body.notes).toBeNull();
  });
});

describe('PATCH /appointments/:id', () => {
  it('returns 404 for an unknown appointment before it checks the body', async () => {
    const res = await api.patch('/appointments/999', { status: 'banana' });
    expect(res.status).toBe(404);
  });
});
