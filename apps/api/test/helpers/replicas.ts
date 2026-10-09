import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import net from 'node:net';
import { tmpdir } from 'node:os';
import path from 'node:path';

const apiRoot = path.resolve(import.meta.dirname, '../..');

export type Replicas = { baseUrls: string[]; stop: () => Promise<void> };

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
      // Each answer shows that the API listens, also a 401 from an API that requires a key.
      await fetch(`${baseUrl}/treatments`);
      return;
    } catch {
      // not listening yet
    }
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('API did not start within 20s');
}

/**
 * Starts several API processes that share one fresh, seeded SQLite file, as the replicas do in production.
 * It uses the package scripts `db:migrate`, `db:seed` and `start`, as the characterization helper does.
 */
export async function startReplicas(count: number, extraEnv: Record<string, string> = {}): Promise<Replicas> {
  const dir = mkdtempSync(path.join(tmpdir(), 'venue-replicas-'));
  const env = { ...process.env, DB_PATH: path.join(dir, 'test.db'), NODE_ENV: 'test', TZ: 'UTC', ...extraEnv };

  for (const script of ['db:migrate', 'db:seed']) {
    const run = spawnSync('yarn', ['run', script], { cwd: apiRoot, env, encoding: 'utf8' });
    if (run.status !== 0) throw new Error(`yarn run ${script} failed:\n${run.stdout}\n${run.stderr}`);
  }

  const children: ChildProcess[] = [];
  const stop = async () => {
    for (const child of children) {
      try {
        process.kill(-(child.pid as number), 'SIGTERM');
      } catch {
        // already gone
      }
    }
    await new Promise((r) => setTimeout(r, 300));
    rmSync(dir, { recursive: true, force: true });
  };

  const baseUrls: string[] = [];
  try {
    for (let i = 0; i < count; i += 1) {
      const port = await freePort();
      const child = spawn('yarn', ['run', 'start'], {
        cwd: apiRoot,
        env: { ...env, PORT: String(port), SEED_ON_BOOT: 'false' },
        stdio: 'ignore',
        detached: true,
      });
      children.push(child);
      const baseUrl = `http://127.0.0.1:${port}`;
      await waitUntilUp(baseUrl, child);
      baseUrls.push(baseUrl);
    }
  } catch (error) {
    // Do not leave the replicas that did start.
    await stop();
    throw error;
  }

  return { baseUrls, stop };
}
