import { z } from 'zod';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { auditEntrySchema } from '@venue/contract';
import { startServer, type TestServer } from './characterization/helpers/server';

let api: TestServer;
beforeAll(async () => {
  api = await startServer();
});
afterAll(async () => {
  await api.stop();
});

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

async function auditOf(id: number | string) {
  return api.get(`/appointments/${id}/audit`);
}

describe('GET /appointments/:id/audit', () => {
  it('returns an empty trail for a seeded appointment that has no change', async () => {
    const res = await auditOf(1);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it.each(['999', 'abc', '1e0'])('answers 404 for the id %s, which no appointment ever had', async (id) => {
    const res = await auditOf(id);
    expect(res.status).toBe(404);
  });
});

// The tests below follow one appointment through its life, so their order matters.
describe('the audit trail of an appointment', () => {
  let id: number;

  it('gets a create entry, with each field from null', async () => {
    const created = await api.post('/appointments', {
      customerId: 8,
      treatmentId: 2,
      startsAt: '2026-11-10T10:00:00+01:00',
      notes: 'Window seat',
    });
    expect(created.status).toBe(201);
    id = created.body.id;

    const res = await auditOf(id);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([
      {
        action: 'create',
        appointmentId: id,
        at: expect.stringMatching(ISO_UTC),
        changes: {
          customerId: { from: null, to: 8 },
          treatmentId: { from: null, to: 2 },
          startsAt: { from: null, to: '2026-11-10T09:00:00.000Z' },
          status: { from: null, to: 'pending' },
          price: { from: null, to: 29 },
          notes: { from: null, to: 'Window seat' },
        },
      },
    ]);
  });

  it('gets an update entry that holds only the field that changed', async () => {
    const patched = await api.patch(`/appointments/${id}`, { status: 'confirmed' });
    expect(patched.status).toBe(200);

    const res = await auditOf(id);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[1]).toEqual({
      action: 'update',
      appointmentId: id,
      at: expect.stringMatching(ISO_UTC),
      changes: { status: { from: 'pending', to: 'confirmed' } },
    });
  });

  it('gets one update entry for two fields that change in one request', async () => {
    const patched = await api.patch(`/appointments/${id}`, { notes: null, startsAt: '2026-11-10T12:00:00+01:00' });
    expect(patched.status).toBe(200);

    const res = await auditOf(id);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
    expect(res.body[2].action).toBe('update');
    expect(res.body[2].changes).toEqual({
      notes: { from: 'Window seat', to: null },
      startsAt: { from: '2026-11-10T09:00:00.000Z', to: '2026-11-10T11:00:00.000Z' },
    });
  });

  it('gets no entry for a change request that changes no value', async () => {
    // The same status, the same notes, and the same instant written with another offset.
    const patched = await api.patch(`/appointments/${id}`, {
      status: 'confirmed',
      notes: null,
      startsAt: '2026-11-10T11:00:00.000Z',
    });
    expect(patched.status).toBe(200);
    expect(patched.body).toMatchObject({ status: 'confirmed', notes: null, startsAt: '2026-11-10T11:00:00.000Z' });

    const res = await auditOf(id);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(3);
  });

  it('gets an entry for the changed field only, when a request also repeats a value', async () => {
    const patched = await api.patch(`/appointments/${id}`, { status: 'confirmed', notes: 'Bring the voucher' });
    expect(patched.status).toBe(200);

    const res = await auditOf(id);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
    expect(res.body[3].changes).toEqual({ notes: { from: null, to: 'Bring the voucher' } });
  });

  it('gets no entry for a change request that the API rejects', async () => {
    expect((await api.patch(`/appointments/${id}`, { status: 'banana' })).status).toBe(400);
    // Appointment 8 belongs to the same customer: 13:00 to 13:50 UTC on 7 October.
    expect((await api.patch(`/appointments/${id}`, { startsAt: '2026-10-07T13:10:00.000Z' })).status).toBe(409);

    const res = await auditOf(id);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(4);
  });

  it('gets a delete entry, with each field to null, and keeps the trail after the delete', async () => {
    expect((await api.delete(`/appointments/${id}`)).status).toBe(204);
    expect((await api.get(`/appointments/${id}`)).status).toBe(404);

    const res = await auditOf(id);

    expect(res.status).toBe(200);
    expect(res.body.map((entry: { action: string }) => entry.action)).toEqual(['create', 'update', 'update', 'update', 'delete']);
    expect(res.body[4]).toEqual({
      action: 'delete',
      appointmentId: id,
      at: expect.stringMatching(ISO_UTC),
      changes: {
        customerId: { from: 8, to: null },
        treatmentId: { from: 2, to: null },
        startsAt: { from: '2026-11-10T11:00:00.000Z', to: null },
        status: { from: 'confirmed', to: null },
        price: { from: 29, to: null },
        notes: { from: 'Bring the voucher', to: null },
      },
    });
    // strict() makes a field that the contract does not name fail the test.
    expect(() => z.array(auditEntrySchema.strict()).parse(res.body)).not.toThrow();
    // Oldest first.
    const times = res.body.map((entry: { at: string }) => entry.at);
    expect(times).toEqual([...times].sort());
  });

  it('gets no second delete entry for a delete that answers 404', async () => {
    expect((await api.delete(`/appointments/${id}`)).status).toBe(404);
    const res = await auditOf(id);
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(5);
  });
});

// Appointment 11 stores the status `canceled`, and appointment 5 stores the start time '2026-10-06 15:00' in venue time.
describe('the audit trail of a legacy appointment', () => {
  it('gets no entry when the request repeats the values that the API shows', async () => {
    expect((await api.patch('/appointments/11', { status: 'cancelled' })).status).toBe(200);
    expect((await api.patch('/appointments/5', { startsAt: '2026-10-06T13:00:00.000Z' })).status).toBe(200);

    const trailOf11 = await auditOf(11);
    const trailOf5 = await auditOf(5);
    expect(trailOf11.status).toBe(200);
    expect(trailOf11.body).toEqual([]);
    expect(trailOf5.status).toBe(200);
    expect(trailOf5.body).toEqual([]);
  });

  it('records the values that the API shows, not the stored ones', async () => {
    expect((await api.patch('/appointments/5', { startsAt: '2026-10-06T16:00:00.000Z' })).status).toBe(200);

    const res = await auditOf(5);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].changes).toEqual({
      startsAt: { from: '2026-10-06T13:00:00.000Z', to: '2026-10-06T16:00:00.000Z' },
    });
  });

  it('records the status cancelled for the stored status canceled', async () => {
    expect((await api.delete('/appointments/11')).status).toBe(204);

    const res = await auditOf(11);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].changes.status).toEqual({ from: 'cancelled', to: null });
    expect(res.body[0].changes.startsAt).toEqual({ from: '2026-10-08T07:30:00.000Z', to: null });
  });
});
