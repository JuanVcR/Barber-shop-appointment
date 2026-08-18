import type { FastifyInstance } from 'fastify';
import { planPaymentController } from '../controllers/plan-payment-controller.js';
import { authMiddleware } from '../middlewares/auth.js';

export async function planPaymentRoutes(app: FastifyInstance) {
  app.post(
    '/admin/barbershops/:barbershopId/plan-payments',
    { preHandler: authMiddleware },
    planPaymentController.createPixPayment
  );

  app.patch(
    '/admin/barbershops/:barbershopId/subscription/cancel',
    { preHandler: authMiddleware },
    planPaymentController.cancelSubscription
  );

  app.post(
    '/subscriptions/webhook/mercado-pago',
    planPaymentController.mercadoPagoWebhook
  );
}
