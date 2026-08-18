import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AppError } from '../errors/app-error.js';
import { planSettingsService } from '../services/plan-settings-service.js';

const updatePlanPricesBodySchema = z.object({
  prices: z.array(z.object({
    plan: z.enum(['FREE', 'BASIC', 'PRO']),
    amount: z.union([z.number().positive(), z.null()]),
  })),
});

export const planSettingsController = {
  async listPrices(req: FastifyRequest, reply: FastifyReply) {
    if (!['SUPER_ADMIN', 'BARBERSHOP_ADMIN'].includes(req.user.role)) {
      throw new AppError('Acesso negado', 403);
    }

    return reply.send(await planSettingsService.listPrices());
  },

  async getSuperAdminPlans(req: FastifyRequest, reply: FastifyReply) {
    return reply.send(
      await planSettingsService.getSuperAdminSummary({ role: req.user.role })
    );
  },

  async updatePrices(
    req: FastifyRequest<{
      Body: {
        prices: Array<{
          plan: 'FREE' | 'BASIC' | 'PRO';
          amount: number | null;
        }>;
      };
    }>,
    reply: FastifyReply
  ) {
    const body = updatePlanPricesBodySchema.parse(req.body);
    const prices = body.prices.map((price) => ({
      plan: price.plan,
      amount: price.amount ?? null,
    }));

    return reply.send(
      await planSettingsService.schedulePriceUpdate({
        requester: { role: req.user.role },
        prices,
      })
    );
  },
};
