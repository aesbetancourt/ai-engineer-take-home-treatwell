import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startReplicas, type Replicas } from './helpers/replicas';

const ROUNDS = 25;
const REQUESTS_PER_REPLICA = 4;
const CUSTOMER_ID = 8;
const HAIRCUT_ID = 2; // 30 minutes

type Result = { status: number; body: any };

let replicas: Replicas;
beforeAll(async () => {
  replicas = await startReplicas(2);
});
afterAll(async () => {
  await replicas.stop();
});

async function send(baseUrl: string, method: string, url: string, body: unknown): Promise<Result> {
  const res = await fetch(baseUrl + url, {
    method,
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

function book(baseUrl: string, startsAt: string): Promise<Result> {
  return send(baseUrl, 'POST', '/appointments', { customerId: CUSTOMER_ID, treatmentId: HAIRCUT_ID, startsAt });
}

// Each round uses its own day, so the rounds do not overlap each other.
function onDay(round: number, month: number, hour: number): string {
  return new Date(Date.UTC(2027, month, 1 + round, hour)).toISOString();
}

function statusesOf(results: Result[]): number[] {
  return results.map((result) => result.status).sort();
}

describe('two API replicas on one database', () => {
  it('accept one of the same appointment sent to both at the same time', async () => {
    for (let round = 0; round < ROUNDS; round += 1) {
      const startsAt = onDay(round, 0, 9);
      const results = await Promise.all(
        replicas.baseUrls.flatMap((baseUrl) =>
          Array.from({ length: REQUESTS_PER_REPLICA }, () => book(baseUrl, startsAt)),
        ),
      );

      const rejected = Array.from({ length: results.length - 1 }, () => 409);
      expect(statusesOf(results), `round ${round}`).toEqual([201, ...rejected]);
      const created = results.find((result) => result.status === 201);
      expect(created?.body).toMatchObject({ status: 'pending', startsAt, customer: { id: CUSTOMER_ID } });
    }
  });

  it('accept one of two appointments moved to the same time at the same time', async () => {
    const [first, second] = replicas.baseUrls;
    for (let round = 0; round < ROUNDS; round += 1) {
      const morning = await book(first, onDay(round, 1, 9));
      const afternoon = await book(first, onDay(round, 1, 15));
      expect([morning.status, afternoon.status], `round ${round}`).toEqual([201, 201]);

      const startsAt = onDay(round, 1, 12);
      const results = await Promise.all([
        send(first, 'PATCH', `/appointments/${morning.body.id}`, { startsAt }),
        send(second, 'PATCH', `/appointments/${afternoon.body.id}`, { startsAt }),
      ]);

      expect(statusesOf(results), `round ${round}`).toEqual([200, 409]);
      const moved = results.find((result) => result.status === 200);
      expect(moved?.body).toMatchObject({ startsAt });
    }
  });
});
