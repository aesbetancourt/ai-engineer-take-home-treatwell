import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// A migration has no endpoint. This test applies the real migrations to a temporary database, adds appointments as
// a production database holds them, and then runs the SQL of the fix migration again, as a second run does.
const migrationsFolder = path.resolve(import.meta.dirname, '../drizzle');
const fixSql = readFileSync(path.join(migrationsFolder, '0006_fix_canceled_status.sql'), 'utf8');
const dir = mkdtempSync(path.join(tmpdir(), 'venue-canceled-'));
const sqlite = new Database(path.join(dir, 'test.db'));

type StoredAppointment = { id: number; starts_at: string; status: string; price: number; notes: string | null };

function storedAppointments(): StoredAppointment[] {
  return sqlite.prepare('SELECT id, starts_at, status, price, notes FROM appointments ORDER BY id').all() as StoredAppointment[];
}

beforeAll(() => {
  migrate(drizzle(sqlite), { migrationsFolder });
  const insert = sqlite.prepare(
    `INSERT INTO appointments (id, customer_id, treatment_id, starts_at, status, price, notes, created_at)
     VALUES (?, 1, 1, ?, ?, 19.99, ?, 0)`,
  );
  insert.run(1, '2026-10-08 09:30', 'canceled', null);
  insert.run(2, '2026-10-09 16:00', 'canceled', 'No-show');
  insert.run(3, '2026-10-06T09:00:00.000Z', 'cancelled', 'Cancelled by customer by phone');
  insert.run(4, '2026-10-06 15:00', 'confirmed', null);
  insert.run(5, '2026-10-05T11:00:00.000Z', 'pending', null);
  insert.run(6, '2026-10-09T10:30:00.000Z', 'completed', 'A canceled order of gel');
});
afterAll(() => {
  sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

describe('the migration that fixes the status canceled', () => {
  it('is in the journal, so `db:migrate` applies it once', () => {
    const journal = JSON.parse(readFileSync(path.join(migrationsFolder, 'meta/_journal.json'), 'utf8'));
    expect(journal.entries.map((entry: { tag: string }) => entry.tag)).toContain('0006_fix_canceled_status');
  });

  it('changes the status canceled to cancelled, and no other value', () => {
    // `migrate` ran the fix on the empty table, before the appointments above existed. This is the run on real data.
    sqlite.exec(fixSql);

    expect(storedAppointments()).toEqual([
      // A legacy start time stays as it is stored.
      { id: 1, starts_at: '2026-10-08 09:30', status: 'cancelled', price: 19.99, notes: null },
      { id: 2, starts_at: '2026-10-09 16:00', status: 'cancelled', price: 19.99, notes: 'No-show' },
      { id: 3, starts_at: '2026-10-06T09:00:00.000Z', status: 'cancelled', price: 19.99, notes: 'Cancelled by customer by phone' },
      { id: 4, starts_at: '2026-10-06 15:00', status: 'confirmed', price: 19.99, notes: null },
      { id: 5, starts_at: '2026-10-05T11:00:00.000Z', status: 'pending', price: 19.99, notes: null },
      { id: 6, starts_at: '2026-10-09T10:30:00.000Z', status: 'completed', price: 19.99, notes: 'A canceled order of gel' },
    ]);
  });

  it('changes no row in a second run', () => {
    const before = storedAppointments();
    const changesBefore = sqlite.prepare('SELECT total_changes() AS n').get() as { n: number };

    sqlite.exec(fixSql);

    const changesAfter = sqlite.prepare('SELECT total_changes() AS n').get() as { n: number };
    expect(changesAfter.n).toBe(changesBefore.n);
    expect(storedAppointments()).toEqual(before);
  });
});
