import Database from 'better-sqlite3';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, describe, expect, it } from 'vitest';
import { freePort } from './helpers/replicas';

const apiRoot = path.resolve(import.meta.dirname, '..');
const dir = mkdtempSync(path.join(tmpdir(), 'venue-migrations-'));
let databaseCount = 0;
let child: ChildProcess | undefined;

afterEach(() => {
  child?.kill('SIGKILL');
  child = undefined;
});
afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

function newDatabasePath(): string {
  databaseCount += 1;
  return path.join(dir, `test-${databaseCount}.db`);
}

function runScript(script: 'db:migrate' | 'db:seed', dbPath: string) {
  return spawnSync('yarn', ['run', script], { cwd: apiRoot, env: { ...process.env, DB_PATH: dbPath }, encoding: 'utf8' });
}

function migrate(dbPath: string) {
  return runScript('db:migrate', dbPath);
}

/** Starts the API and waits until it answers. The test starts `node` itself, so it can stop the process. */
async function startApi(dbPath: string, env: Record<string, string>): Promise<void> {
  const port = await freePort();
  child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], {
    cwd: apiRoot,
    env: { ...process.env, DB_PATH: dbPath, PORT: String(port), ...env },
    stdio: 'ignore',
  });
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('API process exited before it was ready');
    try {
      await fetch(`http://127.0.0.1:${port}/health`);
      return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('API did not start within 20s');
}

/** Reads the schema from the database file. */
function inspect(dbPath: string) {
  const sqlite = new Database(dbPath, { readonly: true });
  try {
    const schema = sqlite
      .prepare("SELECT type, name, sql FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name")
      .all() as { type: string; name: string; sql: string | null }[];
    return { schema, tables: schema.filter((item) => item.type === 'table').map((item) => item.name) };
  } finally {
    sqlite.close();
  }
}

function rowsIn(dbPath: string, table: string): number {
  const sqlite = new Database(dbPath, { readonly: true });
  try {
    return (sqlite.prepare(`SELECT count(*) AS n FROM ${table}`).get() as { n: number }).n;
  } finally {
    sqlite.close();
  }
}

describe('yarn db:migrate', () => {
  it('applies each migration to an empty database and exits', () => {
    const dbPath = newDatabasePath();

    const run = migrate(dbPath);

    expect(run.status).toBe(0);
    expect(inspect(dbPath).tables).toEqual(
      expect.arrayContaining(['appointments', 'customers', 'treatments', 'staff', 'appointment_audit']),
    );
  });

  it('changes nothing in a second run', () => {
    const dbPath = newDatabasePath();
    expect(migrate(dbPath).status).toBe(0);
    const schemaBefore = inspect(dbPath).schema;
    const appliedBefore = rowsIn(dbPath, '__drizzle_migrations');

    const run = migrate(dbPath);

    expect(run.status).toBe(0);
    expect(inspect(dbPath).schema).toEqual(schemaBefore);
    expect(rowsIn(dbPath, '__drizzle_migrations')).toBe(appliedBefore);
  });
});

describe('a start of the API', () => {
  it('creates no table in an empty database when NODE_ENV is production', async () => {
    const dbPath = newDatabasePath();

    await startApi(dbPath, { NODE_ENV: 'production' });

    expect(inspect(dbPath).tables).toEqual([]);
  });

  it('creates no table in an empty database in development', async () => {
    const dbPath = newDatabasePath();

    await startApi(dbPath, { NODE_ENV: 'development', SEED_ON_BOOT: 'false' });

    expect(inspect(dbPath).tables).toEqual([]);
  });

  it('seeds no data when NODE_ENV is production', async () => {
    const dbPath = newDatabasePath();
    expect(migrate(dbPath).status).toBe(0);

    // `SEED_ON_BOOT` is not set, so only `NODE_ENV` stops the seed.
    await startApi(dbPath, { NODE_ENV: 'production', SEED_ON_BOOT: '' });

    expect(rowsIn(dbPath, 'appointments')).toBe(0);
    expect(rowsIn(dbPath, 'customers')).toBe(0);
  });

  it('still seeds on start in development, after a migration', async () => {
    const dbPath = newDatabasePath();
    expect(migrate(dbPath).status).toBe(0);

    await startApi(dbPath, { NODE_ENV: 'development', SEED_ON_BOOT: '' });

    expect(rowsIn(dbPath, 'appointments')).toBe(14);
  });
});

describe('yarn db:seed', () => {
  it('replaces the data of each table, also the staff members and the audit entries', () => {
    const dbPath = newDatabasePath();
    expect(migrate(dbPath).status).toBe(0);
    // The use of the API leaves data in the two tables that have no sample data.
    const sqlite = new Database(dbPath);
    try {
      sqlite
        .prepare("INSERT INTO staff (name, email, created_at) VALUES ('Anna Vogel', 'anna.vogel@example.com', '2026-10-01T09:00:00.000Z')")
        .run();
      sqlite
        .prepare("INSERT INTO appointment_audit (appointment_id, action, at, changes) VALUES (1, 'update', '2026-10-01T09:00:00.000Z', '{}')")
        .run();
    } finally {
      sqlite.close();
    }

    const run = runScript('db:seed', dbPath);

    expect(run.status).toBe(0);
    expect(rowsIn(dbPath, 'staff')).toBe(0);
    expect(rowsIn(dbPath, 'appointment_audit')).toBe(0);
    expect(rowsIn(dbPath, 'appointments')).toBe(14);
    expect(rowsIn(dbPath, 'customers')).toBe(8);
  });
});
