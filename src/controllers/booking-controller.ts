import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { bookingService } from '../services/booking-service.js';

const getRequester = (req: FastifyRequest) => ({
  accountId: req.user!.id,
  role: req.user!.role,
});

const createBookingSchema = z.object({
  barberId: z.string().min(1),
  serviceId: z.string().min(1).optional(),
  serviceIds: z.array(z.string().min(1)).min(1).optional(),
  barbershopId: z.string().min(1),
  cancellationReason: z.string().optional(),
  day: z.string().min(1),
  time: z.string().min(1).optional(),
  startTime: z.string().min(1).optional(),
}).refine((data) => data.serviceId || data.serviceIds?.length, {
  message: 'Informe serviceId ou serviceIds',
}).refine((data) => data.time || data.startTime, {
  message: 'Informe time ou startTime',
});

const createGuestBookingSchema = createBookingSchema.extend({
  client: z.object({
    name: z.string().min(2),
    phone: z.string().min(11),
    email: z.string().email().optional(),
  }),
});

const listByDayParamsSchema = z.object({
  barbershopId: z.string().min(1),
  day: z.string().min(1),
});

const availabilityQuerySchema = z.object({
  barberId: z.string().min(1),
  serviceId: z.string().min(1).optional(),
  serviceIds: z.string().min(1).optional(),
  day: z.string().min(1),
}).refine((data) => data.serviceId || data.serviceIds, {
  message: 'Informe serviceId ou serviceIds',
});

const bookingParamsSchema = z.object({
  bookingId: z.string().uuid(),
});

const paymentParamsSchema = z.object({
  bookingId: z.string().min(1),
});

const paymentBodySchema = z.object({
  paymentMethod: z.enum(['DEBIT', 'CREDIT', 'PIX', 'CASH']),
  amountPaid: z.number().positive(),
});

const myBookingsQuerySchema = z.object({
  day: z.string().min(1).optional(),
});

const statusParamsSchema = z.object({
  bookingId: z.string().min(1),
});

const updateStatusBodySchema = z.object({
  status: z.enum(['SCHEDULED', 'CANCELLED', 'COMPLETED']),
  cancellationReason: z.string().optional(),
});

const rescheduleBodySchema = z.object({
  day: z.string().min(1),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const cancelBodySchema = z.object({
  cancellationReason: z.string().optional(),
});

export const bookingController = {
  async create(req: FastifyRequest, reply: FastifyReply) {
    const body = createBookingSchema.parse(req.body);

    const booking = await bookingService.create({
      accountId: getRequester(req).accountId,
      barberId: body.barberId,
      serviceIds: body.serviceIds ?? [body.serviceId!],
      barbershopId: body.barbershopId,
      day: body.day,
      startTime: body.startTime ?? body.time!,
    });

    return reply.status(201).send(booking);
  },

  async createGuest(req: FastifyRequest, reply: FastifyReply) {
    const body = createGuestBookingSchema.parse(req.body);

    const booking = await bookingService.createGuest({
      client: body.client,
      barberId: body.barberId,
      serviceIds: body.serviceIds ?? [body.serviceId!],
      barbershopId: body.barbershopId,
      day: body.day,
      startTime: body.startTime ?? body.time!,
    });

    return reply.status(201).send(booking);
  },

  async listByDay(req: FastifyRequest, reply: FastifyReply) {
    const params = listByDayParamsSchema.parse(req.params);

    const bookings = await bookingService.listByDayForRequester({
      ...getRequester(req),
      ...params,
    });

    return reply.send(bookings);
  },

  async listAvailableTimes(req: FastifyRequest, reply: FastifyReply) {
    const query = availabilityQuerySchema.parse(req.query);

    const times = await bookingService.listAvailableTimes({
      barberId: query.barberId,
      serviceIds: query.serviceIds
        ? query.serviceIds.split(',').map((item) => item.trim()).filter(Boolean)
        : [query.serviceId!],
      day: query.day,
    });

    return reply.send(times);
  },

  async listMine(req: FastifyRequest, reply: FastifyReply) {
    const query = myBookingsQuerySchema.parse(req.query);

    const bookings = await bookingService.listForRequester({
      ...getRequester(req),
      day: query.day,
    });

    return reply.send(bookings);
  },

  async registerPayment(req: FastifyRequest, reply: FastifyReply) {
    const params = paymentParamsSchema.parse(req.params);
    const body = paymentBodySchema.parse(req.body);

    const booking = await bookingService.registerPayment({
      ...getRequester(req),
      bookingId: params.bookingId,
      ...body,
    });

    return reply.send(booking);
  },

  async updateStatus(req: FastifyRequest, reply: FastifyReply) {
    const params = statusParamsSchema.parse(req.params);
    const body = updateStatusBodySchema.parse(req.body);

    const booking = await bookingService.updateStatus({
      ...getRequester(req),
      bookingId: params.bookingId,
      ...body,
    });

    return reply.send(booking);
  },

  async reschedule(req: FastifyRequest, reply: FastifyReply) {
    const params = statusParamsSchema.parse(req.params);
    const body = rescheduleBodySchema.parse(req.body);

    const booking = await bookingService.reschedule({
      ...getRequester(req),
      bookingId: params.bookingId,
      ...body,
    });

    return reply.send(booking);
  },

  async getById(req: FastifyRequest, reply: FastifyReply) {
    const { bookingId } = bookingParamsSchema.parse(req.params);

    const booking = await bookingService.getById({
      requester: getRequester(req),
      bookingId,
    });

    return reply.send(booking);
  },

  async cancel(req: FastifyRequest, reply: FastifyReply) {
  const { bookingId } = bookingParamsSchema.parse(req.params);
  const body = cancelBodySchema.parse(req.body ?? {});

  await bookingService.cancel({
    ...getRequester(req),
    bookingId,
    cancellationReason: body.cancellationReason,
  });

  return reply.status(204).send();
},
};
