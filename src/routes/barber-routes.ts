import type { FastifyInstance } from 'fastify';
import { barberController } from '../controllers/barber-controller.js';
import { authMiddleware } from '../middlewares/auth.js';

export async function barberRoutes(app: FastifyInstance) {
  app.get(
    '/barbers/:barberId',
    barberController.getById
  );

  app.get(
    '/barbers/me',
    { preHandler: authMiddleware },
    barberController.getProfile
  );

  app.patch(
    '/barbers/me',
    { preHandler: authMiddleware },
    barberController.updateProfile
  );

  app.patch(
    '/barbers/me/availability',
    { preHandler: authMiddleware },
    barberController.updateAvailability
  );

  app.get(
    '/barbers/me/blocks',
    { preHandler: authMiddleware },
    barberController.listBlocks
  );

  app.post(
    '/barbers/me/blocks',
    { preHandler: authMiddleware },
    barberController.createBlock
  );

  app.delete(
    '/barbers/me/blocks/:blockId',
    { preHandler: authMiddleware },
    barberController.deleteBlock
  );
}
