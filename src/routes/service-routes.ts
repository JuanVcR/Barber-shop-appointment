import type { FastifyInstance } from 'fastify';
import { serviceController } from '../controllers/service-controller.js';

export async function serviceRoutes(app: FastifyInstance) {
  app.get(
    '/services/barbershop/:barbershopId',
    serviceController.listByBarbershop
  );
  
  app.get(
    '/services/:serviceId',
    serviceController.getById
  );
}
