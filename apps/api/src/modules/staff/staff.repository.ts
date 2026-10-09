import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { STAFF_EMAIL_UNIQUE_INDEX, staff } from '../../db/schema';
import { ConflictError } from '../../shared/errors';

export type StaffRow = typeof staff.$inferSelect;
type NewStaffRow = typeof staff.$inferInsert;
type StaffChanges = Partial<Pick<StaffRow, 'name' | 'email' | 'active'>>;

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
  // The id makes the order stable for two equal names.
  return db.select().from(staff).orderBy(staff.name, staff.id).all();
}

export function findStaffRow(id: number): StaffRow | undefined {
  return db.select().from(staff).where(eq(staff.id, id)).get();
}

/** Runs a write to the staff table. A violation of the unique index on the email becomes a conflict error. */
function withDuplicateEmailAsConflict<T>(write: () => T): T {
  try {
    return write();
  } catch (error) {
    if (isDuplicateEmail(error)) {
      throw new ConflictError('A staff member with this email already exists');
    }
    throw error;
  }
}

/** Inserts a staff member. The unique index rejects a duplicate email, so two replicas cannot both insert it. */
export function insertStaff(values: NewStaffRow): StaffRow {
  return withDuplicateEmailAsConflict(() => db.insert(staff).values(values).returning().get());
}

/** Changes a staff member in one statement. Returns `undefined` when no staff member has this id. */
export function updateStaff(id: number, changes: StaffChanges): StaffRow | undefined {
  return withDuplicateEmailAsConflict(() => db.update(staff).set(changes).where(eq(staff.id, id)).returning().get());
}
