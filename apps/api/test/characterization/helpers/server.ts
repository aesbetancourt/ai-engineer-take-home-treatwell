import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

const apiRoot = path.resolve(import.meta.dirname, '../../..');

export type HttpResult<T = any> = { status: number; body: T };

export type TestServer = {
  baseUrl: string;
  get: (url: string) => Promise<HttpResult>;
  post: (url: string, body?: unknown) => Promise<HttpResult>;
  patch: (url: string, body?: unknown) => Promise<HttpResult>;
  delete: (url: string) => Promise<HttpResult>;
  stop: () => Promise<void>;
};

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

async function waitUntilUp(baseUrl: string, child: ChildProcess) {
  const deadline = Date.now() + 20000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error('API process exited before it was ready');
    try {
      const res = await fetch(`${baseUrl}/treatments`);
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('API did not start within 20s');
}

/**
 * Starts the real API in a child process against a fresh, seeded SQLite file, using only the package
 * scripts `db:migrate`, `db:seed` and `start`. The suite otherwise only talks HTTP, so it keeps working
 * however the code inside is organised.
 */
export async function startServer(): Promise<TestServer> {
  const dir = mkdtempSync(path.join(tmpdir(), 'venue-api-'));
  const port = await freePort();
  const env = {
    ...process.env,
    PORT: String(port),
    DB_PATH: path.join(dir, 'test.db'),
    NODE_ENV: 'test',
    TZ: 'UTC',
  };

  for (const script of ['db:migrate', 'db:seed']) {
    const run = spawnSync('yarn', ['run', script], { cwd: apiRoot, env, encoding: 'utf8' });
    if (run.status !== 0) throw new Error(`yarn run ${script} failed:\n${run.stdout}\n${run.stderr}`);
  }

  const child = spawn('yarn', ['run', 'start'], {
    cwd: apiRoot,
    env: { ...env, SEED_ON_BOOT: 'false' },
    stdio: 'ignore',
    detached: true,
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  await waitUntilUp(baseUrl, child);

  const call = async (method: string, url: string, body?: unknown): Promise<HttpResult> => {
    const res = await fetch(baseUrl + url, {
      method,
      headers: body === undefined ? undefined : { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await res.text();
    let parsed: unknown = text;
    try {
      parsed = JSON.parse(text);
    } catch {
      // error bodies are not part of the contract and may be plain text
    }
    return { status: res.status, body: parsed };
  };

  return {
    baseUrl,
    get: (url) => call('GET', url),
    post: (url, body) => call('POST', url, body ?? {}),
    patch: (url, body) => call('PATCH', url, body ?? {}),
    delete: (url) => call('DELETE', url),
    stop: async () => {
      try {
        process.kill(-(child.pid as number), 'SIGTERM');
      } catch {
        // already gone
      }
      await new Promise((r) => setTimeout(r, 300));
      rmSync(dir, { recursive: true, force: true });
    },
  };
}
