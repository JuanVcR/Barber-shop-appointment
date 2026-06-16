import type { FastifyInstance } from 'fastify';
import { adminController } from '../controllers/admin-controller.js';
import { authMiddleware } from '../middlewares/auth.js';

export async function adminRoutes(app: FastifyInstance) {
  app.get(
    '/admin/dashboard',
    { preHandler: authMiddleware },
    adminController.getDashboard
  );

  app.get(
    '/admin/barbershops/:barbershopId/dashboard',
    { preHandler: authMiddleware },
    adminController.getBarbershopDashboard
  );

  app.get(
    '/admin/users',
    { preHandler: authMiddleware },
    adminController.listUsers
  );

  app.get(
    '/admin/barbershops',
    { preHandler: authMiddleware },
    adminController.listBarbershops
  );

  app.get(
    '/admin/barbershops/:barbershopId/admins',
    { preHandler: authMiddleware },
    adminController.listAdmins
  );

  app.get(
    '/admin/barbershops/:barbershopId/barbers',
    { preHandler: authMiddleware },
    adminController.listBarbers
  );

  app.delete(
    '/admin/barbershops/:barbershopId/admins/:adminId',
    { preHandler: authMiddleware },
    adminController.removeAdmin
  );

  app.delete(
    '/admin/barbershops/:barbershopId/barbers/:barberId',
    { preHandler: authMiddleware },
    adminController.removeBarber
  );

  app.put(
    '/admin/barbershops/:barbershopId/barbers/:barberId/services',
    { preHandler: authMiddleware },
    adminController.updateBarberServices
  );
}
