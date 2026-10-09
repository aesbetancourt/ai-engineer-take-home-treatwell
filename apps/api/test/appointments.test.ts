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
});
