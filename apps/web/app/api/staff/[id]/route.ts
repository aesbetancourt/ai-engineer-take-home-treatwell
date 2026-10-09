import { errorCodes, staffIdParamSchema, updateStaffBodySchema } from '@venue/contract';
import { errorResponse, forwardToApi, parseBody } from '../../../../lib/api';

type RouteContext = { params: Promise<{ id: string }> };

function notFound() {
  return errorResponse({ status: 404, code: errorCodes.NOT_FOUND, message: 'Staff member not found' });
}

export async function GET(_req: Request, { params }: RouteContext) {
  const id = staffIdParamSchema.safeParse((await params).id);
  if (!id.success) {
    return notFound();
  }
  return forwardToApi('/staff/' + id.data);
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const id = staffIdParamSchema.safeParse((await params).id);
  if (!id.success) {
    return notFound();
  }
  const body = await parseBody(req, updateStaffBodySchema);
  if ('response' in body) {
    return body.response;
  }
  return forwardToApi('/staff/' + id.data, { method: 'PATCH', body: body.data });
}
