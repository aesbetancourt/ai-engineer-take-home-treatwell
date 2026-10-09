import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { appointmentSchema, appointmentSummarySchema, errorBodySchema, publicAppointmentSchema } from '@venue/contract';
import { startServer, type TestServer } from './characterization/helpers/server';

let api: TestServer;
beforeAll(async () => {
  api = await startServer();
});
afterAll(async () => {
  await api.stop();
});

// strict() makes a field the API returns but the contract does not name fail the test.
const strictAppointmentSchema = appointmentSchema.extend({
  customer: appointmentSchema.shape.customer.strict(),
  treatment: appointmentSchema.shape.treatment.strict(),
}).strict();

describe('the appointment contract', () => {
  it('describes every appointment in the list, legacy appointments included', async () => {
    const res = await api.get('/appointments');
    expect(res.body.items).toHaveLength(14);
    for (const appointment of res.body.items) {
      expect(() => strictAppointmentSchema.parse(appointment)).not.toThrow();
    }
  });

  it('describes one appointment', async () => {
    const res = await api.get('/appointments/1');
    expect(() => strictAppointmentSchema.parse(res.body)).not.toThrow();
  });

  it('describes a created appointment', async () => {
    const res = await api.post('/appointments', {
      customerId: 8,
      treatmentId: 2,
      startsAt: '2026-10-12T09:00:00.000Z',
    });
    expect(res.status).toBe(201);
    expect(() => strictAppointmentSchema.parse(res.body)).not.toThrow();
  });

  it('describes an updated appointment', async () => {
    const res = await api.patch('/appointments/10', { notes: 'Fringe trim agreed' });
    expect(res.status).toBe(200);
    expect(() => strictAppointmentSchema.parse(res.body)).not.toThrow();
  });

  it('describes the summary', async () => {
    const res = await api.get('/appointments/summary');
    expect(() => appointmentSummarySchema.strict().parse(res.body)).not.toThrow();
  });
});

describe('the error contract', () => {
  it('describes the error body of the running API', async () => {
    const res = await api.get('/no-such-route');
    expect(res.status).toBe(404);
    expect(() => errorBodySchema.strict().parse(res.body)).not.toThrow();
  });
});

describe('the public appointment contract', () => {
  it('keeps only what a customer can see', async () => {
    const res = await api.get('/appointments/1');
    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('Prefers stylist Anna');

    expect(publicAppointmentSchema.parse(res.body)).toEqual({
      id: 1,
      startsAt: '2026-10-05T09:00:00.000Z',
      endsAt: '2026-10-05T10:00:00.000Z',
      status: 'confirmed',
      price: 49.9,
      customer: { name: 'Emma Schneider' },
      treatment: { name: "Women's Cut & Blow-dry", durationMin: 60 },
    });
  });
});
