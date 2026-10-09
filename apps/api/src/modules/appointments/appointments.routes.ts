import type { FastifyInstance } from 'fastify';
import {
  appointmentIdParamSchema,
  createAppointmentBodySchema,
  listAppointmentsQuerySchema,
  updateAppointmentBodySchema,
} from '@venue/contract';
import { parseInput, toId } from '../../shared/validation';
import * as service from './appointments.service';

type IdParams = { Params: { id: string } };

export function registerAppointmentsRoutes(app: FastifyInstance) {
  app.get('/appointments', (req) => {
    return service.listAppointments(parseInput(listAppointmentsQuerySchema, req.query));
  });

  app.get('/appointments/summary', () => {
    return service.getAppointmentSummary();
  });

  app.get<IdParams>('/appointments/:id', (req) => {
    return service.getAppointment(toId(appointmentIdParamSchema, req.params.id));
  });

  app.post('/appointments', (req, reply) => {
    const appointment = service.createAppointment(parseInput(createAppointmentBodySchema, req.body));
    return reply.code(201).send(appointment);
  });

  app.patch<IdParams>('/appointments/:id', (req) => {
    const id = toId(appointmentIdParamSchema, req.params.id);
    // An unknown appointment is a 404 even when the body is invalid, so the lookup comes first.
    service.getAppointment(id);
    return service.updateAppointment(id, parseInput(updateAppointmentBodySchema, req.body));
  });

  app.delete<IdParams>('/appointments/:id', (req, reply) => {
    service.deleteAppointment(toId(appointmentIdParamSchema, req.params.id));
    return reply.code(204).send();
  });
}
