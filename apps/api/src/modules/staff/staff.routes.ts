import type { FastifyInstance } from 'fastify';
import { createStaffBodySchema } from '@venue/contract';
import { parseInput } from '../../shared/validation';
import * as service from './staff.service';

export function registerStaffRoutes(app: FastifyInstance) {
  app.get('/staff', () => {
    return service.listStaff();
  });

  app.post('/staff', (req, reply) => {
    const member = service.createStaff(parseInput(createStaffBodySchema, req.body));
    return reply.code(201).send(member);
  });
}
