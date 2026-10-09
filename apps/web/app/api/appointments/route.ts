import { createAppointmentBodySchema, listAppointmentsQuerySchema } from '@venue/contract';
import { forwardToApi, parseBody, parseQuery } from '../../../lib/api';

export function GET(req: Request) {
  const query = parseQuery(req, listAppointmentsQuerySchema);
  if ('response' in query) {
    return query.response;
  }
  // The query is valid, so it goes to the API as it is.
  return forwardToApi('/appointments' + new URL(req.url).search);
}

export async function POST(req: Request) {
  const body = await parseBody(req, createAppointmentBodySchema);
  if ('response' in body) {
    return body.response;
  }
  return forwardToApi('/appointments', { method: 'POST', body: body.data });
}
