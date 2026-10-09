import type { FastifyInstance } from 'fastify';
import { createStaffBodySchema, staffIdParamSchema, updateStaffBodySchema } from '@venue/contract';
import { parseInput } from '../../shared/validation';
import * as service from './staff.service';

type IdParams = { Params: { id: string } };

/** Reads the id of the path. An id that is not digits only, such as `1e0`, becomes `NaN`, which no staff member has. */
function toId(param: string): number {
  return staffIdParamSchema.safeParse(param).success ? Number(param) : Number.NaN;
}

export function registerStaffRoutes(app: FastifyInstance) {
  app.get('/staff', () => {
    return service.listStaff();
  });

  app.post('/staff', (req, reply) => {
    const member = service.createStaff(parseInput(createStaffBodySchema, req.body));
    return reply.code(201).send(member);
  });

  app.get<IdParams>('/staff/:id', (req) => {
    return service.getStaffMember(toId(req.params.id));
  });

  app.patch<IdParams>('/staff/:id', (req) => {
    const id = toId(req.params.id);
    // An unknown staff member is a 404 even when the body is invalid, so the lookup comes first.
    service.getStaffMember(id);
    return service.updateStaff(id, parseInput(updateStaffBodySchema, req.body));
  });
}
