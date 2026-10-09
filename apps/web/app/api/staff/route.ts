import { createStaffBodySchema } from '@venue/contract';
import { forwardToApi, parseBody } from '../../../lib/api';

export function GET() {
  return forwardToApi('/staff');
}

export async function POST(req: Request) {
  const body = await parseBody(req, createStaffBodySchema);
  if ('response' in body) {
    return body.response;
  }
  return forwardToApi('/staff', { method: 'POST', body: body.data });
}
