import type { FastifyInstance } from 'fastify';
import { planSettingsController } from '../controllers/plan-settings-controller.js';
import { authMiddleware } from '../middlewares/auth.js';

export async function planSettingsRoutes(app: FastifyInstance) {
  app.get(
    '/admin/plans',
    { preHandler: authMiddleware },
    planSettingsController.getSuperAdminPlans
  );

  app.get(
    '/admin/plans/prices',
    { preHandler: authMiddleware },
    planSettingsController.listPrices
  );

  app.patch(
    '/admin/plans/prices',
    { preHandler: authMiddleware },
    planSettingsController.updatePrices
  );
}
