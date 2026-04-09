import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { barbershopService } from '../services/barbershop-service.js';

const slugParamsSchema = z.object({
  slug: z.string().min(1),
});

export const barbershopController = {
  async list(req: FastifyRequest, reply: FastifyReply) {
    const barbershops = await barbershopService.list();

    return reply.send(barbershops);
  },

  async getBySlug(
    req: FastifyRequest<{
      Params: {
        slug: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const params = slugParamsSchema.parse(req.params);

    const barbershop = await barbershopService.getBySlug(params.slug);

    return reply.send(barbershop);
  },
};
