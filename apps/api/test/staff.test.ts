import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { staffMemberSchema } from '@venue/contract';
import { startServer, type TestServer } from './characterization/helpers/server';

let api: TestServer;
beforeAll(async () => {
  api = await startServer();
});
afterAll(async () => {
  await api.stop();
});

describe('POST /staff', () => {
  it('creates an active staff member', async () => {
    const res = await api.post('/staff', { name: 'Zoe Becker', email: 'zoe.becker@example.com' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      name: 'Zoe Becker',
      email: 'zoe.becker@example.com',
      active: true,
      createdAt: expect.any(String),
    });
    // strict() makes a field that the contract does not name fail the test. The schema requires ISO 8601.
    expect(() => staffMemberSchema.strict().parse(res.body)).not.toThrow();
  });

  it('keeps the letter case of the email, and removes the spaces around the name and the email', async () => {
    const res = await api.post('/staff', { name: '  Anna Vogel ', email: ' Anna.Vogel@Example.com ' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Anna Vogel');
    expect(res.body.email).toBe('Anna.Vogel@Example.com');
  });

  it('rejects an email that differs from another one only in letter case', async () => {
    const res = await api.post('/staff', { name: 'Another Anna', email: 'anna.vogel@example.COM' });
    expect(res.status).toBe(409);
  });

  it.each([
    ['a blank name', { name: '   ', email: 'blank@example.com' }],
    ['no name', { email: 'none@example.com' }],
    ['a name that is not a string', { name: 7, email: 'seven@example.com' }],
    ['a malformed email', { name: 'Max Braun', email: 'max.braun' }],
    ['no email', { name: 'Max Braun' }],
  ])('rejects %s', async (_label, body) => {
    const res = await api.post('/staff', body);
    expect(res.status).toBe(400);
  });
});

describe('GET /staff', () => {
  it('lists the staff members ordered by name', async () => {
    await api.post('/staff', { name: 'max Braun', email: 'max.braun@example.com' });

    const res = await api.get('/staff');

    expect(res.status).toBe(200);
    // The rejected requests above created no staff member. The order does not depend on letter case.
    expect(res.body.map((member: { name: string }) => member.name)).toEqual(['Anna Vogel', 'max Braun', 'Zoe Becker']);
    expect(res.body[0]).toEqual({
      id: expect.any(Number),
      name: 'Anna Vogel',
      email: 'Anna.Vogel@Example.com',
      active: true,
      createdAt: expect.any(String),
    });
  });
});
