import { appointmentIdParamSchema, errorCodes, updateAppointmentBodySchema } from '@venue/contract';
import { errorResponse, forwardToApi, parseBody } from '../../../../lib/api';

type RouteContext = { params: Promise<{ id: string }> };

function notFound() {
  return errorResponse({ status: 404, code: errorCodes.NOT_FOUND, message: 'Appointment not found' });
}

export async function GET(_req: Request, { params }: RouteContext) {
  const id = appointmentIdParamSchema.safeParse((await params).id);
  if (!id.success) {
    return notFound();
  }
  return forwardToApi('/appointments/' + id.data);
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const id = appointmentIdParamSchema.safeParse((await params).id);
  if (!id.success) {
    return notFound();
  }
  const body = await parseBody(req, updateAppointmentBodySchema);
  if ('response' in body) {
    return body.response;
  }
  return forwardToApi('/appointments/' + id.data, { method: 'PATCH', body: body.data });
}
