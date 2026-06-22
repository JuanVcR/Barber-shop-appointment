import type { FastifyInstance } from 'fastify';
import { bookingController } from '../controllers/booking-controller.js';
import { authMiddleware } from '../middlewares/auth.js';

export async function bookingRoutes(app: FastifyInstance) {
  app.post(
    '/bookings',
    { preHandler: authMiddleware },
    bookingController.create
  );

  app.post(
    '/bookings/guest',
    bookingController.createGuest
  );

  app.post(
    '/bookings/quick',
    { preHandler: authMiddleware },
    bookingController.createQuick
  );

  app.get(
    '/bookings/me',
    { preHandler: authMiddleware },
    bookingController.listMine
  );

  app.get(
    '/bookings/week',
    { preHandler: authMiddleware },
    bookingController.listWeek
  );

  app.get(
    '/bookings/:barbershopId/:day',
    { preHandler: authMiddleware },
    bookingController.listByDay
  );

  app.get(
    '/availability',
    bookingController.listAvailableTimes
  );

  app.patch(
    '/bookings/:bookingId/payment',
    { preHandler: authMiddleware },
    bookingController.registerPayment
  );

  app.patch(
    '/bookings/:bookingId/status',
    { preHandler: authMiddleware },
    bookingController.updateStatus
  );

  app.patch(
    '/bookings/:bookingId/services',
    { preHandler: authMiddleware },
    bookingController.updateServices
  );

  app.patch(
    '/bookings/:bookingId/reschedule',
    { preHandler: authMiddleware },
    bookingController.reschedule
  );

  app.get(
    '/bookings/:bookingId',
    { preHandler: authMiddleware },
    bookingController.getById
  );

  app.delete(
    '/bookings/:bookingId',
    { preHandler: authMiddleware },
    bookingController.cancel
  );
}
