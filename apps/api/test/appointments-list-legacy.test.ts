import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { listAppointmentsQuerySchema } from '@venue/contract';

// The API cannot create a legacy appointment, and the seed has none near midnight. So this test writes legacy
// appointments to a temporary database and calls the service directly.
const dir = mkdtempSync(path.join(tmpdir(), 'venue-list-legacy-'));
process.env.DB_PATH = path.join(dir, 'test.db');

// The database module reads `DB_PATH` when it loads, so these imports come after the line above.
const { db } = await import('../src/db');
const { appointments, customers, treatments } = await import('../src/db/schema');
const { listAppointments } = await import('../src/modules/appointments/appointments.service');

function idsFor(query: Record<string, string>): number[] {
  return listAppointments(listAppointmentsQuerySchema.parse(query)).items.map((appointment) => appointment.id);
}

beforeAll(() => {
  migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, '../drizzle') });
  db.insert(customers)
    .values({ id: 1, name: 'Emma Schneider', email: 'emma.schneider@example.com', createdAt: '2026-03-02T10:15:00.000Z' })
    .run();
  db.insert(treatments).values({ id: 1, name: "Men's Haircut", category: 'Hair', price: 29, durationMin: 30 }).run();
  // Legacy start times are venue time. In October the venue is two hours ahead of UTC.
  db.insert(appointments)
    .values([
      // 21:30 UTC on 9 October.
      { id: 1, customerId: 1, treatmentId: 1, startsAt: '2026-10-09 23:30', status: 'confirmed', price: 29, createdAt: 1 },
      // 22:30 UTC on 9 October: the UTC date is the day before the venue date.
      { id: 2, customerId: 1, treatmentId: 1, startsAt: '2026-10-10 00:30', status: 'canceled', price: 29, createdAt: 2 },
      // 21:59 UTC on 10 October.
      { id: 3, customerId: 1, treatmentId: 1, startsAt: '2026-10-10 23:59', status: 'confirmed', price: 29, createdAt: 3 },
      // A new appointment at 22:00 UTC on 10 October, which is midnight in the venue on 11 October.
      { id: 4, customerId: 1, treatmentId: 1, startsAt: '2026-10-10T22:00:00.000Z', status: 'confirmed', price: 29, createdAt: 4 },
    ])
    .run();
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('the appointment list with legacy appointments at a day boundary', () => {
  it('puts a legacy appointment on its venue date', () => {
    expect(idsFor({ from: '2026-10-09', to: '2026-10-09' })).toEqual([1]);
    expect(idsFor({ from: '2026-10-10', to: '2026-10-10' })).toEqual([2, 3]);
    expect(idsFor({ from: '2026-10-11', to: '2026-10-11' })).toEqual([4]);
  });

  it('sorts legacy and new appointments together by their UTC start time', () => {
    expect(idsFor({ sortDir: 'desc' })).toEqual([4, 3, 2, 1]);
  });

  it('returns a legacy appointment with a UTC start time and the status cancelled', () => {
    const [item] = listAppointments(listAppointmentsQuerySchema.parse({ status: 'cancelled' })).items;
    expect(item).toMatchObject({ id: 2, startsAt: '2026-10-09T22:30:00.000Z', status: 'cancelled' });
  });
});
