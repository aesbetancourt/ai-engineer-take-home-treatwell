import { proxyToApi } from '../../../../lib/api';

export function GET() {
  return proxyToApi('/appointments/summary');
}
