import type { FastifyInstance } from 'fastify';
import { authController } from '../controllers/auth-controller.js';
import { authMiddleware } from '../middlewares/auth.js';

export async function authRoutes(app: FastifyInstance) {
  app.post(
    '/register',
    { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } },
    authController.register
  );
  app.post(
    '/login',
    { config: { rateLimit: { max: 10, timeWindow: '1 minute' } } },
    authController.login
  );

  app.post(
    '/forgot-password/user',
    { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } },
    authController.forgotUserPassword
  );
  app.post(
    '/forgot-password/barber',
    { config: { rateLimit: { max: 5, timeWindow: '15 minutes' } } },
    authController.forgotBarberPassword
  );
  app.post(
    '/reset-password',
    { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } },
    authController.resetPassword
  );
  app.get('/barber-invites/:token', authController.getBarberInvite);
  app.post('/barber-invites/accept', authController.acceptBarberInvite);

  app.patch(
    '/me/password',
    { preHandler: authMiddleware },
    authController.changePassword
  );

  app.get(
    '/me',
    { preHandler: authMiddleware },
    authController.getMe
  );

  app.post(
    '/admin/barbers',
    { preHandler: authMiddleware },
    authController.createBarber
  );

  app.post(
    '/admin/admins',
    { preHandler: authMiddleware },
    authController.createAdmin
  );

  app.post(
    '/refresh-token',
    { config: { rateLimit: { max: 20, timeWindow: '1 minute' } } },
    authController.refreshToken
  );

  app.delete(
    '/logout',
    { preHandler: authMiddleware },
    authController.logout
  );

  app.delete(
    '/me',
    { preHandler: authMiddleware },
    authController.deleteMe
  );
}
