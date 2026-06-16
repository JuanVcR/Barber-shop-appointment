import type { FastifyInstance } from 'fastify';
import { barbershopController } from '../controllers/barbershop-controller.js';
import { authMiddleware } from '../middlewares/auth.js';

export async function barbershopRoutes(app: FastifyInstance) {
  app.get('/barbershops', barbershopController.list);
  app.get('/barbershops/:slug', barbershopController.getBySlug);

  app.get(
    '/barbershops/:barbershopId/services',
    barbershopController.listServices
  );

  app.post(
    '/admin/barbershops',
    { preHandler: authMiddleware },
    barbershopController.create
  );

  app.patch(
    '/admin/barbershops/:barbershopId',
    { preHandler: authMiddleware },
    barbershopController.update
  );

  app.post(
    '/admin/barbershops/:barbershopId/images/:type',
    { preHandler: authMiddleware },
    barbershopController.uploadImage
  );

  app.post(
    '/admin/barbershops/:barbershopId/services',
    { preHandler: authMiddleware },
    barbershopController.createService
  );

  app.patch(
    '/admin/barbershops/:barbershopId/setup',
    { preHandler: authMiddleware },
    barbershopController.setup
  );

  app.post(
    '/barbershops/:id/location',
    { preHandler: authMiddleware },
    barbershopController.updateLocation
  );

  app.post(
    '/admin/barbershops/:barbershopId/barber-invites',
    { preHandler: authMiddleware },
    barbershopController.createBarber
  );

  app.get(
    '/admin/barbershops/:barbershopId/barber-invites',
    { preHandler: authMiddleware },
    barbershopController.listPendingBarberInvites
  );

  app.delete(
    '/admin/barbershops/:barbershopId/barber-invites/:inviteId',
    { preHandler: authMiddleware },
    barbershopController.cancelBarberInvite
  );

  app.put(
    '/admin/barbershops/:barbershopId/services/:serviceId',
    { preHandler: authMiddleware },
    barbershopController.updateService
  );

  app.delete(
    '/admin/barbershops/:barbershopId/services/:serviceId',
    { preHandler: authMiddleware },
    barbershopController.deleteService
  );

  app.get(
    '/admin/barbershops/:barbershopId/working-hours',
    { preHandler: authMiddleware },
    barbershopController.getWorkingHours
  );

  app.put(
    '/admin/barbershops/:barbershopId/working-hours',
    { preHandler: authMiddleware },
    barbershopController.updateWorkingHours
  );
}
