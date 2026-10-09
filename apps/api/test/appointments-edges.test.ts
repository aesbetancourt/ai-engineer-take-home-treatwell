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
  it('returns a legacy appointment with its start time in UTC and the status cancelled', async () => {
    // Appointment 11 is a 20 minute treatment, imported as '2026-10-08 09:30' in venue time (UTC+2 in October)
    // with the status 'canceled'.
    const res = await api.get('/appointments/11');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 11,
      startsAt: '2026-10-08T07:30:00.000Z',
      endsAt: '2026-10-08T07:50:00.000Z',
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

// The seed holds three cancelled appointments: 6 with the status 'cancelled', 11 and 12 with the legacy 'canceled'.
describe('the legacy status canceled', () => {
  it('is cancelled in each item of the list', async () => {
    const res = await api.get('/appointments');
    expect(res.status).toBe(200);
    const statuses = new Set(res.body.map((a: any) => a.status));
    expect([...statuses].sort()).toEqual(['cancelled', 'completed', 'confirmed', 'pending']);
  });

  it('matches the status filter cancelled', async () => {
    const res = await api.get('/appointments?status=cancelled');
    expect(res.status).toBe(200);
    expect(res.body.map((a: any) => a.id).sort((a: number, b: number) => a - b)).toEqual([6, 11, 12]);
  });

  it('counts as cancelled in the summary', async () => {
    const res = await api.get('/appointments/summary');
    expect(res.status).toBe(200);
    expect(res.body.byStatus.cancelled).toBe(3);
    expect(res.body.byStatus).not.toHaveProperty('canceled');
  });
});

// Appointment 5 is a legacy appointment of customer 5: 20 minutes from '2026-10-06 15:00' in venue time,
// which is 13:00 to 13:20 UTC.
describe('a legacy start time in venue time', () => {
  it('sorts by its UTC time in the list', async () => {
    // On 2026-10-06 the seed has appointment 6 at 09:00 UTC, appointment 5 at 13:00 UTC and appointment 4 at 14:00 UTC.
    const res = await api.get('/appointments?date=2026-10-06');
    expect(res.status).toBe(200);
    expect(res.body.map((a: any) => a.id)).toEqual([6, 5, 4]);
  });

  it('blocks a new appointment that overlaps its UTC time', async () => {
    const res = await api.post('/appointments', {
      customerId: 5,
      treatmentId: 2,
      startsAt: '2026-10-06T13:10:00.000Z',
    });
    expect(res.status).toBe(409);
  });

  it('does not block a new appointment at the same clock time in UTC', async () => {
    const res = await api.post('/appointments', {
      customerId: 5,
      treatmentId: 2,
      startsAt: '2026-10-06T15:00:00.000Z',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      startsAt: '2026-10-06T15:00:00.000Z',
      endsAt: '2026-10-06T15:30:00.000Z',
    });
  });
});
