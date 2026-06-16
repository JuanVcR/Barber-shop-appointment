import type { FastifyInstance } from 'fastify';
import { reportController } from '../controllers/report-controller.js';
import { authMiddleware } from '../middlewares/auth.js';

export async function reportRoutes(app: FastifyInstance) {
  app.get(
    '/barbers/me/history',
    { preHandler: authMiddleware },
    reportController.getHistory
  );

  app.get(
    '/barbers/me/dashboard',
    { preHandler: authMiddleware },
    reportController.getDashboard
  );

  app.get(
    '/admin/barbers/:barberId/stats',
    { preHandler: authMiddleware },
    reportController.getBarberStats
  );

  app.get(
    '/admin/barbershops/:barbershopId/stats',
    { preHandler: authMiddleware },
    reportController.getBarbershopStats
  );
}
