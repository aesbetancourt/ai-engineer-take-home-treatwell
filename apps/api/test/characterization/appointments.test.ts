import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startServer, type TestServer } from './helpers/server';

let api: TestServer;
beforeAll(async () => {
  api = await startServer();
});
afterAll(async () => {
  await api.stop();
});

// Tests run in file order against one seeded database: read-only checks come first.
describe('GET /appointments', () => {
  it('returns every appointment with its customer and treatment', async () => {
    const res = await api.get('/appointments');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(14);
    for (const a of res.body) {
      expect(a.customer.id).toBeTypeOf('number');
      expect(a.treatment.id).toBeTypeOf('number');
    }
  });

  it('orders ISO-timestamped appointments by start time', async () => {
    const res = await api.get('/appointments');
    const iso = res.body.map((a: any) => a.startsAt).filter((s: string) => s.endsWith('Z'));
    expect(iso).toEqual([...iso].sort());
  });

  it('computes endsAt from the treatment duration', async () => {
    const res = await api.get('/appointments?date=2026-10-05');
    const first = res.body.find((a: any) => a.id === 1);
    expect(first.startsAt).toBe('2026-10-05T09:00:00.000Z');
    expect(first.endsAt).toBe('2026-10-05T10:00:00.000Z');
  });

  it('filters by status', async () => {
    const res = await api.get('/appointments?status=confirmed');
    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(6);
    expect(res.body.every((a: any) => a.status === 'confirmed')).toBe(true);
  });

  it('filters by date', async () => {
    const res = await api.get('/appointments?date=2026-10-05');
    expect(res.body.map((a: any) => a.id).sort((a: number, b: number) => a - b)).toEqual([1, 2, 3]);
  });

  it('combines the status and date filters', async () => {
    const res = await api.get('/appointments?date=2026-10-05&status=pending');
    expect(res.body.map((a: any) => a.id)).toEqual([3]);
  });
});

describe('GET /appointments/summary', () => {
  it('returns totals, counts per status and revenue', async () => {
    const res = await api.get('/appointments/summary');
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(14);
    expect(res.body.byStatus).toMatchObject({ confirmed: 6, pending: 3, completed: 2 });
    expect(res.body.revenue).toBeTypeOf('number');
  });
});

describe('GET /appointments/:id', () => {
  it('returns one appointment in full', async () => {
    const res = await api.get('/appointments/1');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: 1,
      startsAt: '2026-10-05T09:00:00.000Z',
      endsAt: '2026-10-05T10:00:00.000Z',
      status: 'confirmed',
      price: 49.9,
      notes: 'Prefers stylist Anna',
      customer: { id: 1, name: 'Emma Schneider', email: 'emma.schneider@example.com' },
      treatment: { id: 1, name: "Women's Cut & Blow-dry", category: 'Hair', durationMin: 60 },
    });
  });

  it('returns 404 for an unknown appointment', async () => {
    const res = await api.get('/appointments/999');
    expect(res.status).toBe(404);
  });
});

describe('POST /appointments', () => {
  it('creates a pending appointment priced from the treatment', async () => {
    const res = await api.post('/appointments', {
      customerId: 8,
      treatmentId: 2,
      startsAt: '2026-10-12T09:00:00.000Z',
      notes: 'Walk-in regular',
    });
    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      status: 'pending',
      price: 29,
      startsAt: '2026-10-12T09:00:00.000Z',
      endsAt: '2026-10-12T09:30:00.000Z',
      notes: 'Walk-in regular',
      customer: { id: 8 },
      treatment: { id: 2 },
    });

    const fetched = await api.get(`/appointments/${res.body.id}`);
    expect(fetched.status).toBe(200);
    expect(fetched.body.price).toBe(29);
  });

  it('ignores a price sent by the client', async () => {
    const res = await api.post('/appointments', {
      customerId: 7,
      treatmentId: 1,
      startsAt: '2026-10-13T09:00:00.000Z',
      price: 1,
    });
    expect(res.status).toBe(201);
    expect(res.body.price).toBe(54.9);
  });

  it('rejects an appointment that overlaps one of the same customer', async () => {
    // Customer 1 has a 60 minute cut from 09:00 to 10:00 on 2026-10-05.
    const res = await api.post('/appointments', {
      customerId: 1,
      treatmentId: 2,
      startsAt: '2026-10-05T09:30:00.000Z',
    });
    expect(res.status).toBe(409);
  });

  it('rejects an appointment that starts inside an existing one', async () => {
    // Customer 2 has a 30 minute haircut from 10:00 to 10:30 on 2026-10-05.
    const res = await api.post('/appointments', {
      customerId: 2,
      treatmentId: 7,
      startsAt: '2026-10-05T10:15:00.000Z',
    });
    expect(res.status).toBe(409);
  });

  it('accepts an appointment that starts as another one ends', async () => {
    // The haircut above ends at 10:30. Back-to-back is fine, so 10:30 is free.
    const res = await api.post('/appointments', {
      customerId: 2,
      treatmentId: 7,
      startsAt: '2026-10-05T10:30:00.000Z',
    });
    expect(res.status).toBe(201);
  });

  it('accepts an appointment well clear of the customer\'s others', async () => {
    const res = await api.post('/appointments', {
      customerId: 1,
      treatmentId: 2,
      startsAt: '2026-10-05T15:00:00.000Z',
    });
    expect(res.status).toBe(201);
  });

  it('returns 404 for an unknown customer', async () => {
    const res = await api.post('/appointments', { customerId: 999, treatmentId: 1, startsAt: '2026-10-14T09:00:00.000Z' });
    expect(res.status).toBe(404);
  });

  it('returns 404 for an unknown treatment', async () => {
    const res = await api.post('/appointments', { customerId: 1, treatmentId: 999, startsAt: '2026-10-14T09:00:00.000Z' });
    expect(res.status).toBe(404);
  });

  it.each([
    ['a missing customerId', { treatmentId: 1, startsAt: '2026-10-14T09:00:00.000Z' }],
    ['a missing treatmentId', { customerId: 1, startsAt: '2026-10-14T09:00:00.000Z' }],
    ['a missing startsAt', { customerId: 1, treatmentId: 1 }],
    ['an invalid startsAt', { customerId: 1, treatmentId: 1, startsAt: 'next tuesday' }],
    ['a non-string startsAt', { customerId: 1, treatmentId: 1, startsAt: 20261014 }],
  ])('rejects %s with 400', async (_label, body) => {
    const res = await api.post('/appointments', body);
    expect(res.status).toBe(400);
  });
});

describe('PATCH /appointments/:id', () => {
  it('updates the status', async () => {
    const res = await api.patch('/appointments/3', { status: 'confirmed' });
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('confirmed');
    expect(res.body.customer.id).toBe(3);

    const fetched = await api.get('/appointments/3');
    expect(fetched.body.status).toBe('confirmed');
  });

  it('updates the notes', async () => {
    const res = await api.patch('/appointments/10', { notes: 'Fringe trim agreed' });
    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('Fringe trim agreed');
  });

  it('updates the start time and recomputes endsAt', async () => {
    const res = await api.patch('/appointments/8', { startsAt: '2026-10-07T16:00:00.000Z' });
    expect(res.status).toBe(200);
    expect(res.body.startsAt).toBe('2026-10-07T16:00:00.000Z');
    expect(res.body.endsAt).toBe('2026-10-07T16:50:00.000Z');
  });

  it('rejects an unknown status with 400', async () => {
    const res = await api.patch('/appointments/2', { status: 'banana' });
    expect(res.status).toBe(400);
  });

  it('rejects an invalid startsAt with 400', async () => {
    const res = await api.patch('/appointments/2', { startsAt: 'soon' });
    expect(res.status).toBe(400);
  });

  it('rejects an empty update with 400', async () => {
    const res = await api.patch('/appointments/2', {});
    expect(res.status).toBe(400);
  });

  it('returns 404 for an unknown appointment', async () => {
    const res = await api.patch('/appointments/999', { status: 'confirmed' });
    expect(res.status).toBe(404);
  });
});
