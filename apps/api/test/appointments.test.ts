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
  it('rejects SQL in the status filter', async () => {
    const res = await api.get(`/appointments?status=${encodeURIComponent("x' OR '1'='1")}`);
    expect(res.status).toBe(400);
  });

  it('rejects a quote in the date filter', async () => {
    const res = await api.get(`/appointments?from=${encodeURIComponent("'")}`);
    expect(res.status).toBe(400);
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

describe('PATCH /appointments/:id: status', () => {
  it('rejects a new status for a cancelled appointment', async () => {
    // Appointment 6 is cancelled, and the test above moved it onto the massage of customer 6.
    // To confirm it would double-book the customer.
    const res = await api.patch('/appointments/6', { status: 'confirmed' });
    expect(res.status).toBe(409);

    const fetched = await api.get('/appointments/6');
    expect(fetched.body.status).toBe('cancelled');
  });

  it('rejects a new status for a legacy appointment with the status canceled', async () => {
    const res = await api.patch('/appointments/12', { status: 'pending' });
    expect(res.status).toBe(409);
  });

  it('accepts cancelled for an appointment that is cancelled already', async () => {
    const res = await api.patch('/appointments/6', { status: 'cancelled' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 6, status: 'cancelled' });

    // Appointment 11 is a legacy appointment with the status 'canceled'.
    const legacy = await api.patch('/appointments/11', { status: 'cancelled' });
    expect(legacy.status).toBe(200);
    expect(legacy.body.id).toBe(11);
  });

  it('accepts new notes for a cancelled appointment', async () => {
    const res = await api.patch('/appointments/6', { notes: 'Called to apologise' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 6, status: 'cancelled', notes: 'Called to apologise' });
  });

  it('accepts every other status change', async () => {
    // Appointment 13 is completed. Only cancelled is final.
    const reopened = await api.patch('/appointments/13', { status: 'pending' });
    expect(reopened.status).toBe(200);
    expect(reopened.body).toMatchObject({ id: 13, status: 'pending' });

    const cancelled = await api.patch('/appointments/13', { status: 'cancelled' });
    expect(cancelled.status).toBe(200);
    expect(cancelled.body).toMatchObject({ id: 13, status: 'cancelled' });
  });
});

describe('the startsAt input', () => {
  it('accepts a time with an offset and returns it in UTC', async () => {
    const res = await api.post('/appointments', {
      customerId: 7,
      treatmentId: 2,
      startsAt: '2026-11-03T11:00:00+02:00',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      startsAt: '2026-11-03T09:00:00.000Z',
      endsAt: '2026-11-03T09:30:00.000Z',
    });
  });

  it('stores a time with an offset in UTC', async () => {
    // 00:30 at +02:00 on 5 November is 22:30 UTC on 4 November, which is 23:30 in the venue on 4 November.
    const created = await api.post('/appointments', {
      customerId: 7,
      treatmentId: 2,
      startsAt: '2026-11-05T00:30:00+02:00',
    });
    expect(created.status).toBe(201);

    const res = await api.get('/appointments?from=2026-11-04&to=2026-11-04');
    expect(res.status).toBe(200);
    expect(res.body.items.map((a: any) => a.id)).toEqual([created.body.id]);
    expect(res.body.items[0].startsAt).toBe('2026-11-04T22:30:00.000Z');
  });

  it.each([
    ['a date with no time', '2026-11-06'],
    ['a time with no zone', '2026-11-06T09:00:00'],
    ['the legacy format', '2026-11-06 09:00'],
  ])('rejects %s on create with 400', async (_label, startsAt) => {
    const res = await api.post('/appointments', { customerId: 8, treatmentId: 2, startsAt });
    expect(res.status).toBe(400);
  });

  it('rejects a time with no zone on update with 400', async () => {
    const res = await api.patch('/appointments/2', { startsAt: '2026-11-07T09:00:00' });
    expect(res.status).toBe(400);
  });

  it('accepts a time with an offset on update and returns it in UTC', async () => {
    const res = await api.patch('/appointments/2', { startsAt: '2026-11-07T11:00:00+02:00' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 2,
      startsAt: '2026-11-07T09:00:00.000Z',
      endsAt: '2026-11-07T09:30:00.000Z',
    });
  });
});
