import fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';

import { AppError } from './errors/app-error.js';
import { authRoutes } from './routes/auth-routes.js';
import { barbershopRoutes } from './routes/barbershop-routes.js';
import { bookingRoutes } from './routes/booking-routes.js';

export async function buildApp() {
  const app = fastify({
    logger: true,
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  app.get('/health', async () => {
    return { ok: true };
  });

  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(barbershopRoutes, { prefix: '/api' });
  app.register(bookingRoutes, { prefix: '/api' });

  app.setErrorHandler((error: unknown, req, reply) => {
    req.log.error(error);

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        message: error.message,
      });
    }

    if (error instanceof Error) {
      return reply.status(500).send({
        message: error.message,
      });
    }

    return reply.status(500).send({
      message: 'Internal server error',
    });
  });

  return app;
}
