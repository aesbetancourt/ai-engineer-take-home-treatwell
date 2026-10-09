import { proxyToApi } from '../../../../lib/api';

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params;
  return proxyToApi('/appointments/' + id);
}

export async function PATCH(req: Request, { params }: RouteContext) {
  const { id } = await params;
  return proxyToApi('/appointments/' + id, { method: 'PATCH', body: await req.json() });
}
