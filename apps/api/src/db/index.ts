import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import fs from 'node:fs';
import path from 'node:path';
import * as schema from './schema';

const dbPath = process.env.DB_PATH ?? './data/backoffice.db';
fs.mkdirSync(path.dirname(path.resolve(dbPath)), { recursive: true });

const sqlite = new Database(dbPath);
// All API replicas share this database. The busy timeout makes a replica wait for the write lock of another one.
// It is the default of better-sqlite3, stated here because the booking transaction depends on it. It comes first,
// so that the switch to WAL also waits. WAL lets a replica read while another one writes.
sqlite.pragma('busy_timeout = 5000');
sqlite.pragma('journal_mode = WAL');
export const db = drizzle(sqlite, { schema });

migrate(db, { migrationsFolder: path.resolve(import.meta.dirname, '../../drizzle') });
