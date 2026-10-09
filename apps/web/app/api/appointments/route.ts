import { createAppointmentBodySchema } from '@venue/contract';
import { forwardToApi, parseBody } from '../../../lib/api';

export function GET(req: Request) {
  return forwardToApi('/appointments' + new URL(req.url).search);
}

export async function POST(req: Request) {
  const body = await parseBody(req, createAppointmentBodySchema);
  if ('response' in body) {
    return body.response;
  }
  return forwardToApi('/appointments', { method: 'POST', body: body.data });
}
