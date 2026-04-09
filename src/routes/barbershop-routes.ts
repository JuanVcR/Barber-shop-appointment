import type { FastifyInstance } from 'fastify';
import { barbershopController } from '../controllers/barbershop-controller.js';

export async function barbershopRoutes(app: FastifyInstance) {
  app.get('/barbershops', barbershopController.list);
  app.get('/barbershops/:slug', barbershopController.getBySlug);
}
