import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// A migration has no endpoint. This test brings a temporary database to the schema of the release before the fix,
// adds appointments as a production database holds them, and then applies the real migrations, as `db:migrate` does.
const FIX = '0006_fix_canceled_status';
const migrationsFolder = path.resolve(import.meta.dirname, '../drizzle');
const fixSql = readFileSync(path.join(migrationsFolder, `${FIX}.sql`), 'utf8');
const dir = mkdtempSync(path.join(tmpdir(), 'venue-canceled-'));
const sqlite = new Database(path.join(dir, 'test.db'));
const db = drizzle(sqlite);

/** Copies the migrations folder, with a journal that ends before the fix migration. */
function migrationsBeforeFix(): string {
  const copy = path.join(dir, 'drizzle-before-fix');
  cpSync(migrationsFolder, copy, { recursive: true });
  const journalPath = path.join(copy, 'meta/_journal.json');
  const journal = JSON.parse(readFileSync(journalPath, 'utf8'));
  journal.entries = journal.entries.filter((entry: { tag: string }) => entry.tag < FIX);
  writeFileSync(journalPath, JSON.stringify(journal));
  return copy;
}

type StoredAppointment = { id: number; starts_at: string; status: string; price: number; notes: string | null };

function storedAppointments(): StoredAppointment[] {
  return sqlite.prepare('SELECT id, starts_at, status, price, notes FROM appointments ORDER BY id').all() as StoredAppointment[];
}

beforeAll(() => {
  migrate(db, { migrationsFolder: migrationsBeforeFix() });
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
    migrate(db, { migrationsFolder });

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

  it('changes no row in a second run of the migrations, or of its SQL', () => {
    const before = storedAppointments();
    const changesBefore = sqlite.prepare('SELECT total_changes() AS n').get() as { n: number };

    // The migrator skips a migration that is applied already. The SQL is also safe by itself.
    migrate(db, { migrationsFolder });
    sqlite.exec(fixSql);

    const changesAfter = sqlite.prepare('SELECT total_changes() AS n').get() as { n: number };
    expect(changesAfter.n).toBe(changesBefore.n);
    expect(storedAppointments()).toEqual(before);
  });
});
