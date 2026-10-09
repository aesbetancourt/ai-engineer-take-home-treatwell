import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerAppointmentsRoutes } from './modules/appointments/appointments.routes';
import { registerStaffRoutes } from './modules/staff/staff.routes';
import { registerRoutes } from './routes';
import { registerErrorHandler } from './shared/error-handler';

const HEALTH_PATH = '/health';

export async function buildApp() {
  const app = Fastify();
  await app.register(cors, { origin: '*' });

  app.addHook('onRequest', async (req, reply) => {
    console.log(req.method, req.url);
    // A DELETE has no body. Some clients send a JSON content type with each request, and Fastify then rejects
    // the empty body with 400 before the route runs.
    if (req.method === 'DELETE') {
      delete req.headers['content-type'];
    }
    // The platform calls the health check without a key.
    if (req.routeOptions.url === HEALTH_PATH) {
      return;
    }
    if (process.env.API_KEY && req.headers['x-api-key'] !== process.env.API_KEY) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  // Tells the platform that this replica can take requests.
  app.get(HEALTH_PATH, async () => ({ status: 'ok' }));

  registerErrorHandler(app);
  registerRoutes(app);
  registerAppointmentsRoutes(app);
  registerStaffRoutes(app);
  return app;
}
