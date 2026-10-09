import { proxyToApi } from '../../../lib/api';

export function GET(req: Request) {
  return proxyToApi('/customers' + new URL(req.url).search);
}

export async function POST(req: Request) {
  return proxyToApi('/customers', { method: 'POST', body: await req.json() });
}
