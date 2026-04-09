import type { FastifyInstance } from 'fastify';
import { bookingController } from '../controllers/booking-controller.js';
import { authMiddleware } from '../middlewares/auth.js';

export async function bookingRoutes(app: FastifyInstance) {
  app.post(
    '/bookings',
    { preHandler: authMiddleware },
    bookingController.create
  );

  app.get(
    '/bookings/:barbershopId/:day',
    bookingController.listByDay
  );

  app.get(
    '/availability',
    bookingController.listAvailableTimes
  );
}
