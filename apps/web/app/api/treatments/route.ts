import { proxyToApi } from '../../../lib/api';

export function GET() {
  return proxyToApi('/treatments');
}
