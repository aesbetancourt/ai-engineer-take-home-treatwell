import { forwardToApi } from '../../../../lib/api';

export function GET() {
  return forwardToApi('/appointments/summary');
}
