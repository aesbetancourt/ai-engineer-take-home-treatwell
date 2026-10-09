import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const apiRoot = path.resolve(import.meta.dirname, '..');
const migrationsFolder = path.join(apiRoot, 'drizzle');
// A copy of the real schema with one more column. It must be inside the API package, so that its imports resolve.
const changedSchema = path.join(apiRoot, 'test', `.schema-with-change-${process.pid}.ts`);

afterAll(() => {
  rmSync(changedSchema, { force: true });
});

function dbCheck(...args: string[]) {
  return spawnSync('yarn', ['run', 'db:check', ...args], { cwd: apiRoot, encoding: 'utf8' });
}

/** Lists what a run can leave behind: the files of the migrations folder, and the entries of the package root. */
function filesOnDisk(): string[] {
  const migrations = readdirSync(migrationsFolder, { recursive: true }).map((file) => `drizzle/${String(file)}`);
  return [...migrations, ...readdirSync(apiRoot)].sort();
}

describe('yarn db:check', () => {
  it('passes when the migrations cover the schema, and leaves no file', () => {
    const before = filesOnDisk();

    const run = dbCheck();

    expect(run.status).toBe(0);
    expect(filesOnDisk()).toEqual(before);
  });

  it('fails when the schema has a change that no migration covers, and leaves no file', () => {
    const schema = readFileSync(path.join(apiRoot, 'src/db/schema.ts'), 'utf8');
    const withChange = schema.replace("name: text('name').notNull(),", "name: text('name').notNull(),\n  nickname: text('nickname'),");
    expect(withChange).not.toBe(schema);
    writeFileSync(changedSchema, withChange);
    const before = filesOnDisk();

    const run = dbCheck('--schema', `./test/${path.basename(changedSchema)}`);

    expect(run.status).toBe(1);
    expect(run.stdout + run.stderr).toContain('nickname');
    expect(filesOnDisk()).toEqual(before);
  });

  it('fails when drizzle-kit gives no clear result, and leaves no file', () => {
    const before = filesOnDisk();

    const run = dbCheck('--schema', './test/no-such-schema.ts');

    expect(run.status).toBe(1);
    expect(run.stdout + run.stderr).toContain('did not give a clear result');
    expect(filesOnDisk()).toEqual(before);
  });
});
