import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { planPaymentService } from '../services/plan-payment-service.js';

const createPlanPaymentParamsSchema = z.object({
  barbershopId: z.string().uuid(),
});

const createPlanPaymentBodySchema = z.object({
  plan: z.enum(['FREE', 'BASIC', 'PRO']),
});

export const planPaymentController = {
  async createPixPayment(
    req: FastifyRequest<{
      Params: { barbershopId: string };
      Body: { plan: 'FREE' | 'BASIC' | 'PRO' };
    }>,
    reply: FastifyReply
  ) {
    const params = createPlanPaymentParamsSchema.parse(req.params);
    const body = createPlanPaymentBodySchema.parse(req.body);

    const payment = await planPaymentService.createPixPayment({
      requester: {
        accountId: req.user.id,
        role: req.user.role,
      },
      barbershopId: params.barbershopId,
      plan: body.plan,
    });

    return reply.status(201).send(payment);
  },

  async mercadoPagoWebhook(req: FastifyRequest, reply: FastifyReply) {
    const result = await planPaymentService.handleMercadoPagoWebhook({
      ...(req.query as Record<string, unknown>),
      ...(req.body as Record<string, unknown>),
    });

    return reply.send(result);
  },

  async cancelSubscription(
    req: FastifyRequest<{
      Params: { barbershopId: string };
    }>,
    reply: FastifyReply
  ) {
    const params = createPlanPaymentParamsSchema.parse(req.params);

    const barbershop = await planPaymentService.cancelSubscription({
      requester: {
        accountId: req.user.id,
        role: req.user.role,
      },
      barbershopId: params.barbershopId,
    });

    return reply.send(barbershop);
  },
};
