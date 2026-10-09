import { sql } from 'drizzle-orm';
import { db } from '../../db';
import { STAFF_EMAIL_UNIQUE_INDEX, staff } from '../../db/schema';
import { ConflictError } from '../../shared/errors';

export type StaffRow = typeof staff.$inferSelect;
type NewStaffRow = typeof staff.$inferInsert;

const SQLITE_UNIQUE_VIOLATION = 'SQLITE_CONSTRAINT_UNIQUE';

/** Tells whether an error is the violation of the unique index on the lower-case email. Drizzle wraps the SQLite error. */
function isDuplicateEmail(error: unknown): boolean {
  const sqliteError = error instanceof Error && error.cause instanceof Error ? error.cause : error;
  return (
    sqliteError instanceof Error &&
    'code' in sqliteError &&
    sqliteError.code === SQLITE_UNIQUE_VIOLATION &&
    sqliteError.message.includes(STAFF_EMAIL_UNIQUE_INDEX)
  );
}

export function listStaffRows(): StaffRow[] {
  // NOCASE puts `anna` before `Zoe`. The id makes the order stable for two equal names.
  return db
    .select()
    .from(staff)
    .orderBy(sql`${staff.name} COLLATE NOCASE`, staff.id)
    .all();
}

/**
 * Inserts a staff member. The unique index is what rejects a duplicate email, so two replicas cannot both insert it.
 * A violation of that index becomes a conflict error.
 */
export function insertStaff(values: NewStaffRow): StaffRow {
  try {
    return db.insert(staff).values(values).returning().get();
  } catch (error) {
    if (isDuplicateEmail(error)) {
      throw new ConflictError('A staff member with this email already exists');
    }
    throw error;
  }
}
