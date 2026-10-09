import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const apiRoot = path.resolve(import.meta.dirname, '..');
const dir = mkdtempSync(path.join(tmpdir(), 'venue-shutdown-'));

let child: ChildProcess | undefined;

afterAll(() => {
  // Do not leave the API process when the test fails.
  child?.kill('SIGKILL');
  rmSync(dir, { recursive: true, force: true });
});

function freePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const { port } = srv.address() as net.AddressInfo;
      srv.close(() => resolve(port));
    });
    srv.on('error', reject);
  });
}

async function waitUntilUp(baseUrl: string) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    try {
      await fetch(`${baseUrl}/health`);
      return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('API did not start within 20s');
}

describe('the API process', () => {
  it('closes the server and exits with code 0 on SIGTERM', async () => {
    const port = await freePort();
    const env = { ...process.env, DB_PATH: path.join(dir, 'test.db'), PORT: String(port), NODE_ENV: 'test' };
    const migrate = spawnSync('yarn', ['run', 'db:migrate'], { cwd: apiRoot, env, encoding: 'utf8' });
    expect(migrate.status).toBe(0);

    // The test starts `node` itself, so that the signal and the exit code belong to the API process.
    child = spawn(process.execPath, ['--import', 'tsx', 'src/index.ts'], { cwd: apiRoot, env, stdio: 'ignore' });
    const exited = once(child, 'exit');
    await waitUntilUp(`http://127.0.0.1:${port}`);

    child.kill('SIGTERM');

    // Without a handler, Node stops on the signal and reports no exit code.
    const [code, signal] = await exited;
    expect(signal).toBeNull();
    expect(code).toBe(0);
    await expect(fetch(`http://127.0.0.1:${port}/health`)).rejects.toThrow();
  });
});
