import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerAppointmentsRoutes } from './modules/appointments/appointments.routes';
import { registerRoutes } from './routes';
import { registerErrorHandler } from './shared/error-handler';

export async function buildApp() {
  const app = Fastify();
  await app.register(cors, { origin: '*' });

  app.addHook('onRequest', async (req, reply) => {
    console.log(req.method, req.url);
    if (process.env.API_KEY && req.headers['x-api-key'] !== process.env.API_KEY) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
  });

  registerErrorHandler(app);
  registerRoutes(app);
  registerAppointmentsRoutes(app);
  return app;
}
