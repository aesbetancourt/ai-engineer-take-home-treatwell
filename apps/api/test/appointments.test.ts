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
