import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listAppointmentsResponseSchema } from '@venue/contract';
import { startServer, type TestServer } from './characterization/helpers/server';

let api: TestServer;
beforeAll(async () => {
  api = await startServer();
});
afterAll(async () => {
  await api.stop();
});

async function list(query = ''): Promise<{ status: number; ids: number[]; body: any }> {
  const res = await api.get('/appointments' + query);
  return { status: res.status, ids: res.status === 200 ? res.body.items.map((a: any) => a.id) : [], body: res.body };
}

// The seed holds 14 appointments. In the order of their UTC start time, the ids are:
const BY_START = [1, 2, 3, 6, 5, 4, 7, 8, 11, 9, 10, 13, 14, 12];

// Read-only checks come first.
describe('GET /appointments: the page', () => {
  it('returns the first page of 20, ordered by start time, when no parameter is given', async () => {
    const res = await list();
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, pageSize: 20, total: 14 });
    expect(res.ids).toEqual(BY_START);
    // strict() makes a field that the contract does not name fail the test, in the list and in each item.
    const strictSchema = listAppointmentsResponseSchema.strict();
    expect(() => strictSchema.parse(res.body)).not.toThrow();
  });

  it('returns one page of the given size', async () => {
    const res = await list('?page=2&pageSize=5');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 2, pageSize: 5, total: 14 });
    expect(res.ids).toEqual([4, 7, 8, 11, 9]);
  });

  it('returns the rest on the last page', async () => {
    const res = await list('?page=3&pageSize=5');
    expect(res.status).toBe(200);
    expect(res.ids).toEqual([10, 13, 14, 12]);
  });

  it('returns no items, and the full total, for a page past the end', async () => {
    const res = await list('?page=4&pageSize=5');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], page: 4, pageSize: 5, total: 14 });
  });

  it.each(['1', '100'])('accepts the page size %s', async (pageSize) => {
    const res = await list('?pageSize=' + pageSize);
    expect(res.status).toBe(200);
    expect(res.body.pageSize).toBe(Number(pageSize));
    expect(res.ids).toEqual(BY_START.slice(0, Number(pageSize)));
  });
});

describe('GET /appointments: the status filter', () => {
  it.each([
    ['pending', [3, 7, 10]],
    ['confirmed', [1, 2, 5, 4, 8, 9]],
    ['completed', [13, 14]],
    // Appointments 11 and 12 store the legacy spelling `canceled`.
    ['cancelled', [6, 11, 12]],
  ])('returns the %s appointments', async (status, ids) => {
    const res = await list('?status=' + status);
    expect(res.status).toBe(200);
    expect(res.ids).toEqual(ids);
    expect(res.body.total).toBe(ids.length);
    expect(res.body.items.every((a: any) => a.status === status)).toBe(true);
  });

  it('counts each match in the total, not only the items of the page', async () => {
    const res = await list('?status=confirmed&pageSize=2&page=2');
    expect(res.status).toBe(200);
    expect(res.ids).toEqual([5, 4]);
    expect(res.body.total).toBe(6);
  });
});

describe('GET /appointments: the date filter', () => {
  it('includes the day of `from` and each later day', async () => {
    const res = await list('?from=2026-10-09');
    expect(res.status).toBe(200);
    expect(res.ids).toEqual([13, 14, 12]);
  });

  it('includes the day of `to` and each earlier day', async () => {
    const res = await list('?to=2026-10-05');
    expect(res.status).toBe(200);
    expect(res.ids).toEqual([1, 2, 3]);
  });

  it('includes both days of a range', async () => {
    const res = await list('?from=2026-10-06&to=2026-10-07');
    expect(res.status).toBe(200);
    expect(res.ids).toEqual([6, 5, 4, 7, 8]);
  });

  it('returns no items when `from` is later than `to`', async () => {
    const res = await list('?from=2026-10-07&to=2026-10-06');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ items: [], page: 1, pageSize: 20, total: 0 });
  });

  it('combines with the status filter', async () => {
    const res = await list('?from=2026-10-08&to=2026-10-09&status=cancelled');
    expect(res.status).toBe(200);
    expect(res.ids).toEqual([11, 12]);
  });
});

describe('GET /appointments: the sort', () => {
  it('sorts by start time, latest first', async () => {
    const res = await list('?sortBy=startsAt&sortDir=desc');
    expect(res.status).toBe(200);
    expect(res.ids).toEqual([...BY_START].reverse());
  });

  it('sorts by creation time', async () => {
    const res = await list('?sortBy=createdAt');
    expect(res.status).toBe(200);
    expect(res.ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]);
  });

  it('sorts by creation time, latest first', async () => {
    const res = await list('?sortBy=createdAt&sortDir=desc');
    expect(res.status).toBe(200);
    expect(res.ids).toEqual([14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
  });

  it('sorts by price, with the lower id first for an equal price', async () => {
    const res = await list('?sortBy=price');
    expect(res.status).toBe(200);
    expect(res.ids).toEqual([5, 11, 2, 13, 8, 3, 9, 1, 10, 7, 12, 6, 4, 14]);
  });

  it('sorts by price, highest first, as the exact reverse of the ascending order', async () => {
    const res = await list('?sortBy=price&sortDir=desc');
    expect(res.status).toBe(200);
    expect(res.ids).toEqual([14, 4, 6, 12, 7, 10, 1, 9, 3, 8, 13, 2, 11, 5]);
  });

  it('keeps the same order from one page to the next', async () => {
    const first = await list('?sortBy=price&pageSize=7&page=1');
    const second = await list('?sortBy=price&pageSize=7&page=2');
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect([...first.ids, ...second.ids]).toEqual([5, 11, 2, 13, 8, 3, 9, 1, 10, 7, 12, 6, 4, 14]);
  });
});

describe('GET /appointments: an invalid query', () => {
  it.each([
    'page=0',
    'page=-1',
    'page=1.5',
    'page=abc',
    'page=',
    'page=1e1',
    'pageSize=0',
    'pageSize=101',
    'pageSize=abc',
    'pageSize=',
    'status=canceled',
    'status=banana',
    'status=',
    'status=Pending',
    'from=2026-13-01',
    'from=2026-10-5',
    'from=05-10-2026',
    'from=2026-10-05T00:00:00Z',
    'from=',
    'to=2026-02-30',
    'to=tomorrow',
    'sortBy=id',
    'sortBy=',
    'sortDir=up',
    'sortDir=ASC',
    'date=2026-10-05',
    'foo=bar',
    'page=1&page=2',
    'status=pending&status=confirmed',
  ])('answers 400 for %s', async (query) => {
    const res = await list('?' + query);
    expect(res.status).toBe(400);
  });
});

// These tests add appointments, so they come last.
describe('GET /appointments: a date in venue time', () => {
  it('puts 23:30 venue time on that day and 00:30 venue time on the next day', async () => {
    // In November the venue is one hour ahead of UTC. 22:30 UTC on 4 November is 23:30 in the venue on that day,
    // and 23:30 UTC on 4 November is 00:30 in the venue on 5 November.
    const late = await api.post('/appointments', { customerId: 7, treatmentId: 2, startsAt: '2026-11-04T22:30:00.000Z' });
    const early = await api.post('/appointments', { customerId: 8, treatmentId: 2, startsAt: '2026-11-04T23:30:00.000Z' });
    expect(late.status).toBe(201);
    expect(early.status).toBe(201);

    const dayOfLate = await list('?from=2026-11-04&to=2026-11-04');
    const dayOfEarly = await list('?from=2026-11-05&to=2026-11-05');
    expect(dayOfLate.status).toBe(200);
    expect(dayOfLate.ids).toEqual([late.body.id]);
    expect(dayOfEarly.status).toBe(200);
    expect(dayOfEarly.ids).toEqual([early.body.id]);
  });
});
