import type { FastifyInstance } from 'fastify';
import { clientController } from '../controllers/client-controller.js';
import { authMiddleware } from '../middlewares/auth.js';

export async function clientRoutes(app: FastifyInstance) {
  app.get(
    '/clients/me',
    { preHandler: authMiddleware },
    clientController.getProfile
  );

  app.patch(
    '/clients/me',
    { preHandler: authMiddleware },
    clientController.updateProfile
  );

  app.get(
    '/clients/me/barbershops',
    { preHandler: authMiddleware },
    clientController.getFavoriteBarbershops
  );

  app.post(
    '/clients/me/barbershops/:barbershopId',
    { preHandler: authMiddleware },
    clientController.addFavoriteBarbershop
  );

  app.delete(
    '/clients/me/barbershops/:barbershopId',
    { preHandler: authMiddleware },
    clientController.removeFavoriteBarbershop
  );
}