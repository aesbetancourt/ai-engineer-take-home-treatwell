/* eslint-disable no-console -- This file is a command line tool. Its output is the result of the check. */
import { spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';

// Fails when `schema.ts` has a change that no migration covers.
//
// It runs `drizzle-kit generate`, the command behind `yarn db:generate`, against a copy of the migrations folder, and
// looks for a new file. Two other ways do not work: `drizzle-kit check` does not read `schema.ts`, and `generate`
// exits with 0 for each result. So the check passes only on the message that says nothing changed.
const NOTHING_TO_MIGRATE = 'nothing to migrate';
const GENERATE_TIMEOUT = 60 * 1000;

const apiRoot = path.resolve(import.meta.dirname, '../..');
const schemaOption = process.argv.indexOf('--schema');
// The tests give another schema file. The default is the real one.
const schema = schemaOption === -1 ? './src/db/schema.ts' : process.argv[schemaOption + 1];

function filesIn(dir: string): string[] {
  return readdirSync(dir, { recursive: true }).map(String).sort();
}

/** Runs the check. Returns `true` when the migrations cover the schema. */
function migrationsCoverSchema(): boolean {
  // drizzle-kit needs a relative path, so the copy is inside the API package.
  const copy = mkdtempSync(path.join(apiRoot, '.db-check-'));
  try {
    cpSync(path.join(apiRoot, 'drizzle'), copy, { recursive: true });
    const before = filesIn(copy);
    const out = `./${path.relative(apiRoot, copy)}`;
    const run = spawnSync('yarn', ['drizzle-kit', 'generate', '--dialect', 'sqlite', '--schema', schema, '--out', out], {
      cwd: apiRoot,
      encoding: 'utf8',
      // No input: drizzle-kit asks a question for a rename, and the check must not wait for an answer.
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: GENERATE_TIMEOUT,
    });
    const output = `${run.stdout ?? ''}${run.stderr ?? ''}`;
    const added = filesIn(copy).filter((file) => !before.includes(file));

    if (added.length > 0) {
      console.error('db:check failed: schema.ts has a change that no migration covers.');
      console.error('Run `yarn db:generate`, read the SQL, and commit it. The missing migration is:\n');
      for (const file of added.filter((name) => name.endsWith('.sql'))) {
        console.error(readFileSync(path.join(copy, file), 'utf8'));
      }
      return false;
    }
    if (run.status === 0 && output.includes(NOTHING_TO_MIGRATE)) {
      console.log('db:check passed: the migrations cover schema.ts.');
      return true;
    }
    console.error('db:check failed: drizzle-kit did not give a clear result.');
    console.error('A renamed column or table has this effect, because drizzle-kit asks a question about it.');
    console.error('Run `yarn db:generate` in a terminal and answer the question. The output of drizzle-kit was:\n');
    console.error(output || String(run.error ?? `exit code ${run.status}`));
    return false;
  } finally {
    rmSync(copy, { recursive: true, force: true });
  }
}

process.exit(migrationsCoverSchema() ? 0 : 1);
