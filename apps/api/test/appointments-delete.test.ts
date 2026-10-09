import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, type TestServer } from './characterization/helpers/server';

let api: TestServer;
beforeAll(async () => {
  api = await startServer();
});
afterAll(async () => {
  await api.stop();
});

// Appointment 4 is confirmed, costs 79.90 and belongs to customer 4: a 60 minute treatment at 14:00 UTC on 6 October.
const DELETED_ID = 4;

describe('DELETE /appointments/:id', () => {
  it.each(['999', 'abc', '1.5'])('answers 404 for the unknown id %s', async (id) => {
    const res = await api.delete(`/appointments/${id}`);
    expect(res.status).toBe(404);
  });

  it('answers 204 with no body', async () => {
    const res = await api.delete(`/appointments/${DELETED_ID}`);
    expect(res.status).toBe(204);
    expect(res.body).toBe('');
  });

  it('answers 404 for an appointment that is deleted already', async () => {
    const res = await api.delete(`/appointments/${DELETED_ID}`);
    expect(res.status).toBe(404);
  });
});

describe('a deleted appointment', () => {
  it('is absent from the read by id', async () => {
    const res = await api.get(`/appointments/${DELETED_ID}`);
    expect(res.status).toBe(404);
  });

  it('is absent from the list and from its total', async () => {
    const res = await api.get('/appointments');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(13);
    expect(res.body.items.map((a: any) => a.id)).toEqual([1, 2, 3, 6, 5, 7, 8, 11, 9, 10, 13, 14, 12]);
  });

  it('is absent from a filtered list', async () => {
    const res = await api.get('/appointments?status=confirmed&from=2026-10-06&to=2026-10-06');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ total: 1 });
    expect(res.body.items.map((a: any) => a.id)).toEqual([5]);
  });

  it('is absent from the summary', async () => {
    const res = await api.get('/appointments/summary');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(13);
    expect(res.body.byStatus).toEqual({ confirmed: 5, pending: 3, cancelled: 3, completed: 2 });
    // The seed revenue is 362.68. The deleted appointment was confirmed, with a price of 79.90.
    expect(res.body.revenue).toBeCloseTo(282.78, 2);
  });

  it.each([
    ['a status', { status: 'completed' }],
    ['notes', { notes: 'Too late' }],
    ['a start time', { startsAt: '2026-10-20T09:00:00.000Z' }],
    ['an invalid body', { status: 'banana' }],
  ])('cannot be changed: PATCH with %s answers 404', async (_label, body) => {
    const res = await api.patch(`/appointments/${DELETED_ID}`, body);
    expect(res.status).toBe(404);
  });

  it('does not block a new appointment of the same customer at the same time', async () => {
    const res = await api.post('/appointments', { customerId: 4, treatmentId: 6, startsAt: '2026-10-06T14:00:00.000Z' });
    expect(res.status).toBe(201);
    expect(res.body.id).not.toBe(DELETED_ID);
  });

  it('does not block another appointment that moves to its time', async () => {
    // Appointment 13 belongs to customer 4 too. Delete the new appointment at 14:00 first, so the time is free again.
    const list = await api.get('/appointments?from=2026-10-06&to=2026-10-06&status=pending');
    const [replacement] = list.body.items;
    expect((await api.delete(`/appointments/${replacement.id}`)).status).toBe(204);

    const res = await api.patch('/appointments/13', { startsAt: '2026-10-06T14:30:00.000Z' });
    expect(res.status).toBe(200);
    expect(res.body.startsAt).toBe('2026-10-06T14:30:00.000Z');
  });
});
