import { NextResponse } from 'next/server';
import { appointmentIdParamSchema, errorCodes, publicAppointmentSchema, type ErrorBody } from '@venue/contract';
import { requestApi } from '../../../../../lib/api';

type RouteContext = { params: Promise<{ id: string }> };

const notFound: ErrorBody = { error: { code: errorCodes.NOT_FOUND, message: 'Appointment not found' } };
const unavailable: ErrorBody = { error: { code: errorCodes.INTERNAL_ERROR, message: 'Appointment not available' } };

// The customer opens the confirmation page, so this route returns only what a customer can see.
// It sends no body of the API as it is: each response is the public schema or a fixed error.
export async function GET(_req: Request, { params }: RouteContext) {
  const id = appointmentIdParamSchema.safeParse((await params).id);
  if (!id.success) {
    return NextResponse.json(notFound, { status: 404 });
  }
  // A rejected request means that the API did not answer, or that its answer was not JSON.
  const { status, body } = await requestApi('/appointments/' + id.data).catch(() => ({ status: 502, body: undefined }));
  if (status === 404) {
    return NextResponse.json(notFound, { status: 404 });
  }
  const appointment = publicAppointmentSchema.safeParse(body);
  if (status !== 200 || !appointment.success) {
    return NextResponse.json(unavailable, { status: 502 });
  }
  return NextResponse.json(appointment.data);
}
