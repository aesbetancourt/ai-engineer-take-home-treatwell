import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, type TestServer } from './characterization/helpers/server';

let api: TestServer;
beforeAll(async () => {
  api = await startServer();
});
afterAll(async () => {
  await api.stop();
});

describe('GET /appointments', () => {
  it('treats SQL in the status filter as a plain value', async () => {
    const res = await api.get(`/appointments?status=${encodeURIComponent("x' OR '1'='1")}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('treats a quote in the date filter as a plain value', async () => {
    const res = await api.get(`/appointments?date=${encodeURIComponent("'")}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe('POST /appointments: overlap', () => {
  it('accepts an appointment that ends as another one starts', async () => {
    // Customer 2 has a haircut from 10:00 to 10:30 on 2026-10-05. A 30 minute haircut from 09:30 ends at 10:00.
    const res = await api.post('/appointments', {
      customerId: 2,
      treatmentId: 2,
      startsAt: '2026-10-05T09:30:00.000Z',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: 'pending',
      startsAt: '2026-10-05T09:30:00.000Z',
      endsAt: '2026-10-05T10:00:00.000Z',
    });
  });

  it('accepts an appointment that overlaps only a cancelled one', async () => {
    // Customer 6 has a cancelled root colour from 09:00 to 10:30 on 2026-10-06.
    const res = await api.post('/appointments', {
      customerId: 6,
      treatmentId: 2,
      startsAt: '2026-10-06T09:30:00.000Z',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: 'pending',
      startsAt: '2026-10-06T09:30:00.000Z',
      endsAt: '2026-10-06T10:00:00.000Z',
    });
  });

  it('accepts an appointment that overlaps only a legacy appointment with the status canceled', async () => {
    // Customer 5 has a legacy facial at '2026-10-09 16:00' with the status 'canceled'. A 90 minute root colour
    // from 14:45 UTC overlaps it, whether the legacy time is read as UTC or as venue time.
    const res = await api.post('/appointments', {
      customerId: 5,
      treatmentId: 3,
      startsAt: '2026-10-09T14:45:00.000Z',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: 'pending',
      startsAt: '2026-10-09T14:45:00.000Z',
      endsAt: '2026-10-09T16:15:00.000Z',
    });
  });
});

describe('PATCH /appointments/:id: overlap', () => {
  it('rejects a new start time that overlaps another appointment of the customer', async () => {
    // Customer 1 has a cut from 09:00 to 10:00 on 2026-10-05, and appointment 9 on 2026-10-08.
    const res = await api.patch('/appointments/9', { startsAt: '2026-10-05T09:30:00.000Z' });
    expect(res.status).toBe(409);

    const fetched = await api.get('/appointments/9');
    expect(fetched.body.startsAt).toBe('2026-10-08T11:00:00.000Z');
  });

  it('accepts a new start time that overlaps only the old time of the same appointment', async () => {
    // Appointment 9 is 45 minutes from 11:00. A move to 11:15 overlaps only itself.
    const res = await api.patch('/appointments/9', { startsAt: '2026-10-08T11:15:00.000Z' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ startsAt: '2026-10-08T11:15:00.000Z', endsAt: '2026-10-08T12:00:00.000Z' });
  });

  it('accepts a new start time for a cancelled appointment, whatever it overlaps', async () => {
    // Appointment 6 is cancelled. Customer 6 has a massage from 12:00 to 13:00 on 2026-10-09.
    const res = await api.patch('/appointments/6', { startsAt: '2026-10-09T12:15:00.000Z' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'cancelled', startsAt: '2026-10-09T12:15:00.000Z' });
  });
});
