import { sql, type SQL } from 'drizzle-orm';
import { index, sqliteTable, integer, text, real, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const customers = sqliteTable('customers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  phone: text('phone'),
  createdAt: text('created_at').notNull(),
});

export const treatments = sqliteTable('treatments', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  category: text('category').notNull(),
  price: real('price').notNull(),
  durationMin: integer('duration_min').notNull(),
});

// A legacy appointment stores `starts_at` as `YYYY-MM-DD HH:mm` in venue time (Europe/Berlin). This expression
// converts it to UTC with the EU daylight-saving rule: summer time runs from 02:00 on the last Sunday of March
// to 03:00 on the last Sunday of October. Each other value is parsed as ISO 8601 and written in UTC.
// Two hours are special. 02:00 to 02:59 does not exist on the day in March, and occurs twice on the day in
// October. Both are read as summer time.
// See docs/adr/0002-generated-column-for-start-time.md before you change it.
const startsAtUtcExpression = (startsAt: SQL): SQL => sql`CASE WHEN ${startsAt} GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9] [0-9][0-9]:[0-9][0-9]' THEN strftime('%Y-%m-%dT%H:%M:%fZ', ${startsAt}, CASE WHEN ${startsAt} >= date(substr(${startsAt}, 1, 4) || '-04-01', 'weekday 0', '-7 days') || ' 02:00' AND ${startsAt} < date(substr(${startsAt}, 1, 4) || '-11-01', 'weekday 0', '-7 days') || ' 03:00' THEN '-2 hours' ELSE '-1 hours' END) ELSE strftime('%Y-%m-%dT%H:%M:%fZ', ${startsAt}) END`;

export const appointments = sqliteTable(
  'appointments',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    customerId: integer('customer_id').notNull(),
    treatmentId: integer('treatment_id').notNull(),
    startsAt: text('starts_at').notNull(),
    status: text('status').notNull(),
    price: real('price').notNull(),
    notes: text('notes'),
    createdAt: integer('created_at').notNull(),
    reminderSentAt: integer('reminder_sent_at'),
    startsAtUtc: text('starts_at_utc').generatedAlwaysAs((): SQL => startsAtUtcExpression(sql`${appointments.startsAt}`), {
      mode: 'virtual',
    }),
  },
  (table) => [index('appointments_starts_at_utc_idx').on(table.startsAtUtc)],
);

export const STAFF_EMAIL_UNIQUE_INDEX = 'staff_email_lower_unique';

export const staff = sqliteTable(
  'staff',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    // Stored as sent. The index below makes it unique without regard to letter case.
    email: text('email').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at').notNull(),
  },
  (table) => [uniqueIndex(STAFF_EMAIL_UNIQUE_INDEX).on(sql`lower(${table.email})`)],
);
