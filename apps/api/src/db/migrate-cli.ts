import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'node:path';
import { db } from './index';

// The release step: it applies each pending migration and exits. A migration that is applied already is skipped,
// so a second run changes nothing.
migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, '../../drizzle') });
console.log('migrations applied');
