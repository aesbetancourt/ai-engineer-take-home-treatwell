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
    await api.post('/staff', { name: 'Max Braun', email: 'max.braun@example.com' });

    const res = await api.get('/staff');

    expect(res.status).toBe(200);
    // The rejected requests above created no staff member.
    expect(res.body.map((member: { name: string }) => member.name)).toEqual(['Anna Vogel', 'Max Braun', 'Zoe Becker']);
    expect(res.body[0]).toEqual({
      id: expect.any(Number),
      name: 'Anna Vogel',
      email: 'Anna.Vogel@Example.com',
      active: true,
      createdAt: expect.any(String),
    });
  });
});

async function idOf(name: string): Promise<number> {
  const res = await api.get('/staff');
  return res.body.find((member: { name: string }) => member.name === name).id;
}

describe('GET /staff/:id', () => {
  it('returns one staff member', async () => {
    const id = await idOf('Zoe Becker');

    const res = await api.get(`/staff/${id}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id,
      name: 'Zoe Becker',
      email: 'zoe.becker@example.com',
      active: true,
      createdAt: expect.any(String),
    });
  });

  it.each(['9999', 'abc', '1.5'])('answers 404 for the unknown id %s', async (id) => {
    const res = await api.get(`/staff/${id}`);
    expect(res.status).toBe(404);
  });
});

describe('PATCH /staff/:id', () => {
  it('changes the name, the email and the active flag', async () => {
    const id = await idOf('Zoe Becker');

    const res = await api.patch(`/staff/${id}`, { name: ' Zoe Braun ', email: 'Zoe.Braun@example.com', active: false });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      id,
      name: 'Zoe Braun',
      email: 'Zoe.Braun@example.com',
      active: false,
      createdAt: expect.any(String),
    });
    expect(() => staffMemberSchema.strict().parse(res.body)).not.toThrow();
    expect((await api.get(`/staff/${id}`)).body).toEqual(res.body);
  });

  it('changes one field and keeps the others', async () => {
    const id = await idOf('Zoe Braun');

    const res = await api.patch(`/staff/${id}`, { active: true });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ name: 'Zoe Braun', email: 'Zoe.Braun@example.com', active: true });
  });

  it('accepts the email that the staff member has already, in another letter case', async () => {
    const id = await idOf('Zoe Braun');

    const res = await api.patch(`/staff/${id}`, { email: 'zoe.braun@EXAMPLE.com' });

    expect(res.status).toBe(200);
    expect(res.body.email).toBe('zoe.braun@EXAMPLE.com');
  });

  it('answers 404 for an unknown id', async () => {
    const res = await api.patch('/staff/9999', { name: 'Nobody' });
    expect(res.status).toBe(404);
  });

  it('rejects the email of another staff member, also in another letter case', async () => {
    const id = await idOf('Zoe Braun');
    const res = await api.patch(`/staff/${id}`, { email: 'ANNA.VOGEL@example.com' });
    expect(res.status).toBe(409);
  });

  it.each([
    ['a blank name', { name: '  ' }],
    ['a malformed email', { email: 'zoe.braun' }],
    ['an active flag that is not a boolean', { active: 'yes' }],
    ['an active flag that is a number', { active: 1 }],
    ['an empty body', {}],
    ['a body with unknown fields only', { role: 'admin' }],
  ])('rejects %s', async (_label, body) => {
    const id = await idOf('Zoe Braun');
    const res = await api.patch(`/staff/${id}`, body);
    expect(res.status).toBe(400);
  });

  it('changed nothing in the rejected requests', async () => {
    const id = await idOf('Zoe Braun');
    const res = await api.get(`/staff/${id}`);
    expect(res.body).toMatchObject({ name: 'Zoe Braun', email: 'zoe.braun@EXAMPLE.com', active: true });
  });
});
