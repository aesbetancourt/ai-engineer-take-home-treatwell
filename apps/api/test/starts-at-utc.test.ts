import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// The generated column `starts_at_utc` has no endpoint of its own, so this test reads it from a temporary
// database that the real migrations made. Each expected value was checked against the time zone database.
const dir = mkdtempSync(path.join(tmpdir(), 'venue-starts-at-'));
const sqlite = new Database(path.join(dir, 'test.db'));

beforeAll(() => {
  migrate(drizzle(sqlite), { migrationsFolder: path.resolve(import.meta.dirname, '../drizzle') });
});
afterAll(() => {
  sqlite.close();
  rmSync(dir, { recursive: true, force: true });
});

function startsAtUtc(startsAt: string): string | null {
  const { lastInsertRowid } = sqlite
    .prepare(
      `INSERT INTO appointments (customer_id, treatment_id, starts_at, status, price, created_at)
       VALUES (1, 1, ?, 'pending', 10, 0)`,
    )
    .run(startsAt);
  const row = sqlite.prepare('SELECT starts_at_utc AS value FROM appointments WHERE id = ?').get(lastInsertRowid);
  return (row as { value: string | null }).value;
}

describe('starts_at_utc for a legacy start time in venue time', () => {
  it.each([
    ['a winter time (UTC+1)', '2026-01-15 10:00', '2026-01-15T09:00:00.000Z'],
    ['a summer time (UTC+2)', '2026-07-15 10:00', '2026-07-15T08:00:00.000Z'],
    ['the last minute before the clocks go forward', '2026-03-29 01:59', '2026-03-29T00:59:00.000Z'],
    ['the first minute after the clocks go forward', '2026-03-29 03:00', '2026-03-29T01:00:00.000Z'],
    ['the last minute before the clocks go back', '2026-10-25 01:59', '2026-10-24T23:59:00.000Z'],
    ['the first minute after the clocks go back', '2026-10-25 03:00', '2026-10-25T02:00:00.000Z'],
    ['the spring clock change of another year', '2027-03-28 03:00', '2027-03-28T01:00:00.000Z'],
    ['the autumn clock change of another year', '2027-10-31 03:00', '2027-10-31T02:00:00.000Z'],
    ['the day before a clock change on 25 March', '2029-03-24 12:00', '2029-03-24T11:00:00.000Z'],
    ['a year in which 1 April is a Sunday', '2029-03-31 12:00', '2029-03-31T10:00:00.000Z'],
  ])('converts %s', (_label, stored, expected) => {
    expect(startsAtUtc(stored)).toBe(expected);
  });
});

describe('starts_at_utc for a legacy start time in a special hour', () => {
  it('reads an hour that does not exist as summer time', () => {
    // The clocks go from 02:00 to 03:00 on 29 March 2026, so 02:30 is not a real time.
    expect(startsAtUtc('2026-03-29 02:30')).toBe('2026-03-29T00:30:00.000Z');
  });

  it('reads an hour that occurs twice as summer time', () => {
    // The clocks go from 03:00 back to 02:00 on 25 October 2026, so 02:30 occurs twice. The first one counts.
    expect(startsAtUtc('2026-10-25 02:30')).toBe('2026-10-25T00:30:00.000Z');
  });
});

describe('starts_at_utc for an ISO 8601 start time', () => {
  it('keeps a UTC time', () => {
    expect(startsAtUtc('2026-10-05T09:00:00.000Z')).toBe('2026-10-05T09:00:00.000Z');
  });

  it('converts a time with an offset to UTC', () => {
    expect(startsAtUtc('2026-10-05T11:00:00+02:00')).toBe('2026-10-05T09:00:00.000Z');
  });

  it('is null for a value that is not a time', () => {
    expect(startsAtUtc('next tuesday')).toBeNull();
  });
});
