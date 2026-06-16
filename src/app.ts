import fastify from 'fastify';
import rateLimit from '@fastify/rate-limit';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import { AppError } from './errors/app-error.js';
import { authRoutes } from './routes/auth-routes.js';
import { barbershopRoutes } from './routes/barbershop-routes.js';
import { bookingRoutes } from './routes/booking-routes.js';
import { barberRoutes } from './routes/barber-routes.js';
import { clientRoutes } from './routes/client-routes.js';
import { adminRoutes } from './routes/admin-routes.js';
import { serviceRoutes } from './routes/service-routes.js';
import { reportRoutes } from './routes/report-routes.js';
import { ZodError } from 'zod';
import { env } from './config/env.js';
import { prisma } from './database/prisma.js';
import { auditLogRepository } from './repositories/audit-log-repository.js';
import { captureException } from './config/monitoring.js';

export async function buildApp() {
  const app = fastify({
    logger: process.env.NODE_ENV === 'test' ? false : true,
    bodyLimit: 1024 * 1024,
    trustProxy: env.NODE_ENV === 'production',
  });

  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  await app.register(cookie);
  await app.register(helmet);
  await app.register(multipart, {
    limits: { fileSize: 3 * 1024 * 1024, files: 1 },
  });
  await app.register(fastifyStatic, {
    root: path.resolve(env.UPLOAD_DIR),
    prefix: '/uploads/',
  });

  await app.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  app.get('/health', async (_req, reply) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { ok: true, database: 'connected' };
    } catch {
      return reply.status(503).send({ ok: false, database: 'unavailable' });
    }
  });

  app.addHook('onResponse', async (req, reply) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return;
    if (!req.user?.id) return;

    try {
      await auditLogRepository.create({
        accountId: req.user.id,
        method: req.method,
        path: req.routeOptions.url,
        status: reply.statusCode,
        ip: req.ip,
      });
    } catch (error) {
      req.log.error(error, 'Failed to persist audit log');
    }
  });

  app.register(authRoutes, { prefix: '/api/auth' });
  app.register(barbershopRoutes, { prefix: '/api' });
  app.register(bookingRoutes, { prefix: '/api' });
  app.register(barberRoutes, { prefix: '/api' });
  app.register(clientRoutes, { prefix: '/api' });
  app.register(adminRoutes, { prefix: '/api' });
  app.register(serviceRoutes, { prefix: '/api' });
  app.register(reportRoutes, { prefix: '/api' });

   app.setErrorHandler((error: unknown, req, reply) => {
    req.log.error(error);
    captureException(error);

    if (error instanceof AppError) {
      return reply.status(error.statusCode).send({
        message: error.message,
      });
    }

    if (error instanceof ZodError) {
      return reply.status(400).send({
        message: 'Dados invalidos',
        issues: error.issues,
      });
    }

    if (error instanceof Error) {
      return reply.status(500).send({
        message: 'Internal server error',
      });
    }

    return reply.status(500).send({
      message: 'Internal server error',
    });
  });

  return app;
}
