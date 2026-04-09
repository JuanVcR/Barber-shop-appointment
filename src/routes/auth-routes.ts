import type { FastifyInstance } from 'fastify';
import { authController } from '../controllers/auth-controller.js';
import { authMiddleware } from '../middlewares/auth.js';

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', authController.register);
  app.post('/login', authController.login);

  app.post('/forgot-password/user', authController.forgotUserPassword);
  app.post('/forgot-password/barber', authController.forgotBarberPassword);
  app.post('/reset-password', authController.resetPassword);

  app.patch(
    '/me/password',
    { preHandler: authMiddleware },
    authController.changePassword
  );
}
