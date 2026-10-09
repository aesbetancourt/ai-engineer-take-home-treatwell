import { eq, sql } from 'drizzle-orm';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// No endpoint can make the write of an audit entry fail. So this test removes the audit table from a temporary
// database and calls the service directly: when the entry cannot be written, the change must not stay either.
const dir = mkdtempSync(path.join(tmpdir(), 'venue-audit-transaction-'));
process.env.DB_PATH = path.join(dir, 'test.db');
// The API runs in UTC in production.
process.env.TZ = 'UTC';

// The database module reads `DB_PATH` when it loads, so these imports come after the lines above.
const { db } = await import('../src/db');
const { appointments, customers, treatments } = await import('../src/db/schema');
const service = await import('../src/modules/appointments/appointments.service');

function storedAppointment(id: number) {
  return db.select().from(appointments).where(eq(appointments.id, id)).get();
}

beforeAll(() => {
  migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, '../drizzle') });
  db.insert(customers)
    .values({ id: 1, name: 'Emma Schneider', email: 'emma.schneider@example.com', createdAt: '2026-03-02T10:15:00.000Z' })
    .run();
  db.insert(treatments).values({ id: 1, name: "Men's Haircut", category: 'Hair', price: 29, durationMin: 30 }).run();
  db.insert(appointments)
    .values({ id: 1, customerId: 1, treatmentId: 1, startsAt: '2026-10-05T09:00:00.000Z', status: 'pending', price: 29, createdAt: 1 })
    .run();
  db.run(sql`DROP TABLE appointment_audit`);
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('a change whose audit entry cannot be written', () => {
  it('does not create the appointment', () => {
    expect(() =>
      service.createAppointment({ customerId: 1, treatmentId: 1, startsAt: '2026-10-06T09:00:00.000Z' }),
    ).toThrow();
    expect(db.select().from(appointments).all()).toHaveLength(1);
  });

  it('does not change the appointment', () => {
    expect(() => service.updateAppointment(1, { status: 'confirmed' })).toThrow();
    expect(storedAppointment(1)?.status).toBe('pending');
  });

  it('does not delete the appointment', () => {
    expect(() => service.deleteAppointment(1)).toThrow();
    expect(storedAppointment(1)?.deletedAt).toBeNull();
  });
});
