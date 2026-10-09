import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';

// The reminder job has no endpoint, so this test calls it directly, on a temporary database and with a fake mailer.
const dir = mkdtempSync(path.join(tmpdir(), 'venue-reminders-'));
process.env.DB_PATH = path.join(dir, 'test.db');
// The API runs in UTC in production. Without this line, the result depends on the time zone of the machine.
process.env.TZ = 'UTC';

// The database module reads `DB_PATH` when it loads, so these imports come after the line above.
const { db } = await import('../src/db');
const { appointments, customers, treatments } = await import('../src/db/schema');
const { sendDueReminders } = await import('../src/jobs/reminders');

const HOUR = 60 * 60 * 1000;
const NOW = Date.parse('2026-10-05T08:00:00.000Z');

type Email = { to: string; subject: string; body: string };

/** Records each email. It answers after a moment, as the real email provider does. */
function fakeMailer() {
  const sent: Email[] = [];
  const send = async (to: string, subject: string, body: string) => {
    await new Promise((resolve) => setTimeout(resolve, 20));
    sent.push({ to, subject, body });
  };
  return { sent, send };
}

function addAppointment(startsAt: string, status = 'confirmed') {
  db.insert(appointments).values({ customerId: 1, treatmentId: 1, startsAt, status, price: 29, createdAt: NOW }).run();
}

beforeAll(() => {
  migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, '../drizzle') });
  db.insert(customers)
    .values({ id: 1, name: 'Emma Schneider', email: 'emma.schneider@example.com', createdAt: '2026-03-02T10:15:00.000Z' })
    .run();
  db.insert(treatments).values({ id: 1, name: "Men's Haircut", category: 'Hair', price: 29, durationMin: 30 }).run();
});
beforeEach(() => {
  db.delete(appointments).run();
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('the reminder job', () => {
  it('sends a reminder for a confirmed appointment that starts in the next 24 hours', async () => {
    addAppointment(new Date(NOW + 12 * HOUR).toISOString());
    const mailer = fakeMailer();

    await sendDueReminders(mailer.send, NOW);

    expect(mailer.sent).toHaveLength(1);
    expect(mailer.sent[0].to).toBe('emma.schneider@example.com');
    expect(mailer.sent[0].subject).toBe('See you tomorrow');
  });

  it('sends no reminder for an appointment that is not confirmed, is in the past, or starts after 24 hours', async () => {
    addAppointment(new Date(NOW + 12 * HOUR).toISOString(), 'pending');
    addAppointment(new Date(NOW - HOUR).toISOString());
    addAppointment(new Date(NOW + 25 * HOUR).toISOString());
    const mailer = fakeMailer();

    await sendDueReminders(mailer.send, NOW);

    expect(mailer.sent).toHaveLength(0);
  });

  it('sends one reminder when two replicas run the job at the same time', async () => {
    addAppointment(new Date(NOW + 12 * HOUR).toISOString());
    const mailer = fakeMailer();

    await Promise.all([sendDueReminders(mailer.send, NOW), sendDueReminders(mailer.send, NOW)]);

    expect(mailer.sent).toHaveLength(1);
  });

  it('sends no second reminder on the next run', async () => {
    addAppointment(new Date(NOW + 12 * HOUR).toISOString());
    const mailer = fakeMailer();

    await sendDueReminders(mailer.send, NOW);
    await sendDueReminders(mailer.send, NOW + 60 * 1000);

    expect(mailer.sent).toHaveLength(1);
  });

  it('reads the start time of a legacy appointment as venue time', async () => {
    // 10:00 in the venue on 6 October is 08:00 UTC, which is 24 hours after `NOW`: the last instant of the window.
    addAppointment('2026-10-06 10:00');
    const mailer = fakeMailer();

    await sendDueReminders(mailer.send, NOW);

    expect(mailer.sent).toHaveLength(1);
  });

  it('sends no reminder for a legacy appointment that started one minute ago', async () => {
    // 09:59 in the venue on 5 October is 07:59 UTC, and `NOW` is 08:00 UTC.
    addAppointment('2026-10-05 09:59');
    const mailer = fakeMailer();

    await sendDueReminders(mailer.send, NOW);

    expect(mailer.sent).toHaveLength(0);
  });
});
