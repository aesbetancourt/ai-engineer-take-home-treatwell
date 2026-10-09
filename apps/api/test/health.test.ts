import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { startReplicas, type Replicas } from './helpers/replicas';

// This API requires a key, as the API in production does.
let api: Replicas;
beforeAll(async () => {
  api = await startReplicas(1, { API_KEY: 'test-key' });
});
afterAll(async () => {
  await api.stop();
});

describe('GET /health', () => {
  it('answers 200 without the API key', async () => {
    const res = await fetch(api.baseUrls[0] + '/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  it('leaves the key check on each other route', async () => {
    const res = await fetch(api.baseUrls[0] + '/treatments');
    expect(res.status).toBe(401);
  });
});
