import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { bookingService } from '../services/booking-service.js';

const createBookingSchema = z.object({
  barberId: z.string().min(1),
  serviceId: z.string().min(1),
  barbershopId: z.string().min(1),
  day: z.string().min(1),
  time: z.string().min(1),
});

const listByDayParamsSchema = z.object({
  barbershopId: z.string().min(1),
  day: z.string().min(1),
});

const availabilityQuerySchema = z.object({
  barberId: z.string().min(1),
  serviceId: z.string().min(1),
  day: z.string().min(1),
});

export const bookingController = {
  async create(req: FastifyRequest, reply: FastifyReply) {
    const body = createBookingSchema.parse(req.body);

    const booking = await bookingService.create({
      userId: req.user!.id,
      barberId: body.barberId,
      serviceId: body.serviceId,
      barbershopId: body.barbershopId,
      day: body.day,
      time: body.time,
    });

    return reply.status(201).send(booking);
  },

  async listByDay(
    req: FastifyRequest<{
      Params: {
        barbershopId: string;
        day: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const params = listByDayParamsSchema.parse(req.params);

    const bookings = await bookingService.listByDay(
      params.barbershopId,
      params.day
    );

    return reply.send(bookings);
  },

  async listAvailableTimes(
    req: FastifyRequest<{
      Querystring: {
        barberId: string;
        serviceId: string;
        day: string;
      };
    }>,
    reply: FastifyReply
  ) {
    const query = availabilityQuerySchema.parse(req.query);

    const times = await bookingService.listAvailableTimes({
      barberId: query.barberId,
      serviceId: query.serviceId,
      day: query.day,
    });

    return reply.send(times);
  },
};
