#!/usr/bin/env node
// Runs every quality check and reports all of them, instead of stopping at the first failure.
// Use `yarn verify --verbose` to print the full output of each step.
import { spawnSync } from 'node:child_process';

const verbose = process.argv.includes('--verbose');

const steps = [
  { name: 'tsc (api)', cmd: 'yarn workspace @venue/api typecheck' },
  { name: 'tsc (web)', cmd: 'yarn workspace @venue/web typecheck' },
  { name: 'eslint', cmd: 'yarn eslint .' },
  { name: 'knip', cmd: 'yarn knip' },
  { name: 'jscpd', cmd: 'yarn jscpd' },
  { name: 'db:check', cmd: 'yarn db:check' },
  { name: 'tests', cmd: 'yarn test' },
];

const results = [];
for (const step of steps) {
  process.stdout.write(`> ${step.name} ... `);
  const started = Date.now();
  const run = spawnSync(step.cmd, { shell: true, encoding: 'utf8', env: { ...process.env, FORCE_COLOR: '0' } });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const output = `${run.stdout ?? ''}${run.stderr ?? ''}`
    .split('\n')
    .filter((line) => !/^(\u{1F4A1}|\u{1F3A9}|\u{1F496})/u.test(line))
    .join('\n')
    .trim();
  const ok = run.status === 0;
  results.push({ ...step, ok, output, seconds });
  console.log(`${ok ? 'ok' : 'FAILED'} (${seconds}s)`);
}

console.log('\nSummary');
for (const r of results) {
  console.log(`  ${r.ok ? 'pass' : 'FAIL'}  ${r.name}`);
}

const failed = results.filter((r) => !r.ok);
for (const r of failed) {
  const lines = r.output.split('\n');
  const shown = verbose ? lines : lines.slice(-25);
  console.log(`\n--- ${r.name}${verbose || lines.length <= 25 ? '' : ` (last 25 of ${lines.length} lines; use --verbose for all)`}`);
  console.log(shown.join('\n'));
}

if (failed.length > 0) {
  console.log(`\n${failed.length} of ${results.length} checks failed. Treat this as a signal: tell us about anything you leave failing.`);
  process.exit(1);
}
console.log('\nAll checks passed.');
