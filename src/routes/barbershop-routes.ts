import type { FastifyInstance } from "fastify";
import { unknown, z } from "zod";
import { BarbershopService } from "../services/barbershop-service.js";

const serviceSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number().nonnegative(),
  durationInMinutes: z.number().int().positive(),
});

const settingsSchema = z.object({
  id: z.string(),
  name: z.string(),
  phoneOwner: z.string().optional(),
  welcomeMessage: z.string(),
  pixKey: z.string().optional(),
  workingDays: z.array(
    z.enum(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"])
  ),
  workingHours: z.object({
    start: z.string(),
    end: z.string(),
  }),
  breakStart: z.string().optional(),
  breakEnd: z.string().optional(),
  intervalBetweenAppointments: z.number().int().positive(),
  services: z.array(serviceSchema),
});

export async function barbershopRoutes(fastify: FastifyInstance) {
  fastify.get('/barbershops', async () => {
    return BarbershopService.list()
  });

  fastify.get<{ Params: { id: string } }>('/barbershops/:id', async (request, reply) => {
    const shop = BarbershopService.getById(request.params.id);

    if (!shop) {
      return reply.status(404).send({ error: 'Barbearia não encontrada' });
    }

    return shop;
  });

  fastify.put<{ Params: { id: string }; Body: unknown }>(
    '/barbershops/:id/settings', 
    async ( request, reply ) => {
     const parsed = settingsSchema.safeParse({...(typeof request.body === 'object' && request.body ? request.body : {}),
  });
  }
  );
}