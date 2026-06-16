import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AppError } from '../errors/app-error.js';
import { barberRepository } from '../repositories/barber-repository.js';

const updateBarberSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(11).optional(),
});

const updateAvailabilitySchema = z.object({
  availability: z.array(z.object({
    weekDay: z.number().int().min(0).max(6),
    startTime: z.string().regex(/^\d{2}:\d{2}$/),
    endTime: z.string().regex(/^\d{2}:\d{2}$/),
  })),
});

const createBlockSchema = z.object({
  day: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason: z.string().optional(),
}).refine((data) => {
  if (!data.startTime && !data.endTime) return true;
  return Boolean(data.startTime && data.endTime);
}, {
  message: 'Informe startTime e endTime juntos, ou nenhum dos dois para bloquear o dia todo',
});

const blockParamsSchema = z.object({
  blockId: z.string().min(1),
});

export const barberController = {
  async getProfile(req: FastifyRequest, reply: FastifyReply) {
    const barber = await barberRepository.findByAccountId(req.user.id);

    if (!barber) {
      throw new AppError('Perfil de barbeiro não encontrado', 404);
    }

    return reply.send({
      id: barber.id,
      name: barber.name,
      phone: barber.phone,
      barbershopId: barber.barbershopId,
      barbershop: {
        id: barber.barbershop.id,
        name: barber.barbershop.name,
        slug: barber.barbershop.slug,
      },
      services: barber.services.map(s => ({
        id: s.service.id,
        name: s.service.name,
        price: s.service.price,
        duration: s.service.duration,
      })),
      availability: barber.availability.map(a => ({
        weekDay: a.weekDay,
        startTime: a.startTime,
        endTime: a.endTime,
      })),
    });
  },

  async updateProfile(req: FastifyRequest, reply: FastifyReply) {
    const body = updateBarberSchema.parse(req.body);

    const barber = await barberRepository.findByAccountId(req.user.id);

    if (!barber) {
      throw new AppError('Perfil de barbeiro não encontrado', 404);
    }

    const updated = await barberRepository.update(barber.id, body);

    return reply.send(updated);
  },

  async updateAvailability(req: FastifyRequest, reply: FastifyReply) {
    const body = updateAvailabilitySchema.parse(req.body);

    const barber = await barberRepository.findByAccountId(req.user.id);

    if (!barber) {
      throw new AppError('Perfil de barbeiro não encontrado', 404);
    }

    const availability = await barberRepository.replaceAvailability(barber.id, body.availability);

    return reply.send(availability);
  },

  async listBlocks(req: FastifyRequest, reply: FastifyReply) {
    const barber = await barberRepository.findByAccountId(req.user.id);

    if (!barber) {
      throw new AppError('Perfil de barbeiro nao encontrado', 404);
    }

    const day = String((req.query as { day?: string }).day ?? '');
    const blocks = day
      ? await barberRepository.findBlocksByBarberDay(barber.id, day)
      : await barberRepository.findBlocksByBarber(barber.id);

    return reply.send(blocks);
  },

  async createBlock(req: FastifyRequest, reply: FastifyReply) {
    const body = createBlockSchema.parse(req.body);

    const barber = await barberRepository.findByAccountId(req.user.id);

    if (!barber) {
      throw new AppError('Perfil de barbeiro nao encontrado', 404);
    }

    const block = await barberRepository.createBlock({
      barberId: barber.id,
      day: body.day,
      startTime: body.startTime,
      endTime: body.endTime,
      reason: body.reason,
    });

    return reply.status(201).send(block);
  },

  async deleteBlock(
    req: FastifyRequest<{ Params: { blockId: string } }>,
    reply: FastifyReply
  ) {
    const params = blockParamsSchema.parse(req.params);

    const barber = await barberRepository.findByAccountId(req.user.id);

    if (!barber) {
      throw new AppError('Perfil de barbeiro nao encontrado', 404);
    }

    const block = await barberRepository.findBlockById(params.blockId);

    if (!block || block.barberId !== barber.id) {
      throw new AppError('Bloqueio nao encontrado', 404);
    }

    await barberRepository.deleteBlock(params.blockId);

    return reply.status(204).send();
  },

  async getById(
    req: FastifyRequest<{ Params: { barberId: string } }>,
    reply: FastifyReply
  ) {
    const { barberId } = req.params;

    const barber = await barberRepository.findById(barberId);

    if (!barber) {
      throw new AppError('Barbeiro não encontrado', 404);
    }

    return reply.send({
      id: barber.id,
      name: barber.name,
      phone: barber.phone,
      barbershop: barber.barbershop,
      services: barber.services.map(s => ({
        id: s.service.id,
        name: s.service.name,
        price: s.service.price,
      })),
      availability: barber.availability,
    });
  },
};
