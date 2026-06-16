import type { FastifyReply, FastifyRequest } from 'fastify';
import { AppError } from '../errors/app-error.js';
import { serviceRepository } from '../repositories/service-repository.js';

export const serviceController = {
  async getById(
    req: FastifyRequest<{ Params: { serviceId: string } }>,
    reply: FastifyReply
  ) {
    const { serviceId } = req.params;

    const service = await serviceRepository.findById(serviceId);

    if (!service) {
      throw new AppError('Serviço não encontrado', 404);
    }

    return reply.send({
      id: service.id,
      name: service.name,
      price: service.price,
      duration: service.duration,
      barbers: service.barbers.map(bs => ({
        id: bs.barber.id,
        name: bs.barber.name,
      })),
    });
  },

  async listByBarbershop(
    req: FastifyRequest<{ Params: { barbershopId: string } }>,
    reply: FastifyReply
  ) {
    const { barbershopId } = req.params;

    const services = await serviceRepository.findByBarbershopId(barbershopId);

    return reply.send(services.map(service => ({
      id: service.id,
      name: service.name,
      price: service.price,
      duration: service.duration,
      barbers: service.barbers.map(bs => ({
        id: bs.barber.id,
        name: bs.barber.name,
      })),
    })));
  },
};
