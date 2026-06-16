import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AppError } from '../errors/app-error.js';
import { barberRepository } from '../repositories/barber-repository.js';
import { barbershopAdminRepository } from '../repositories/barbershop-admin-repository.js';
import { prisma } from '../database/prisma.js';
import type { Prisma } from '@prisma/client';
import { bookingRepository } from '../repositories/booking-repository.js';

const dateRangeSchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).partial().refine(
  (data) => Boolean(data.startDate) === Boolean(data.endDate),
  { message: 'Informe startDate e endDate juntos' }
).refine(
  (data) => !data.startDate || !data.endDate || data.startDate <= data.endDate,
  { message: 'Intervalo de datas invalido' }
);

export const reportController = {
  async getHistory(req: FastifyRequest, reply: FastifyReply) {
    const barber = await barberRepository.findByAccountId(req.user.id);

    if (!barber) {
      throw new AppError('Barbeiro não encontrado', 404);
    }

    const bookings = await bookingRepository.findHistoryByBarber(barber.id);
    return reply.send(bookings);
  },

  async getDashboard(req: FastifyRequest, reply: FastifyReply) {
    const barber = await barberRepository.findByAccountId(req.user.id);

    if (!barber) {
      throw new AppError('Barbeiro não encontrado', 404);
    }

    // Total de agendamentos
    const totalBookings = await prisma.booking.count({
      where: { barberId: barber.id },
    });

    // Agendamentos este mês
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthStart = `${currentMonth}-01`;
    const monthEnd = `${currentMonth}-31`;

    const bookingsThisMonth = await prisma.booking.count({
      where: {
        barberId: barber.id,
        status: { not: 'CANCELLED' },
        day: { gte: monthStart, lte: monthEnd },
      },
    });

    // Receita total
    const bookingsWithPayment = await prisma.booking.findMany({
      where: {
        barberId: barber.id,
        status: { not: 'CANCELLED' },
        amountPaid: { not: null },
      },
      select: { amountPaid: true },
    });

    const totalRevenue = bookingsWithPayment.reduce(
      (sum, booking) => sum + (booking.amountPaid || 0),
      0
    );

    // Receita este mês
    const revenueThisMonth = await prisma.booking.aggregate({
      where: {
        barberId: barber.id,
        status: { not: 'CANCELLED' },
        day: { gte: monthStart, lte: monthEnd },
        amountPaid: { not: null },
      },
      _sum: { amountPaid: true },
    });

    // Clientes únicos
    const uniqueClients = await prisma.booking.findMany({
      where: { barberId: barber.id, status: { not: 'CANCELLED' } },
      distinct: ['clientId'],
      select: { clientId: true },
    });

    return reply.send({
      totalBookings,
      bookingsThisMonth,
      totalRevenue,
      revenueThisMonth: revenueThisMonth._sum.amountPaid || 0,
      uniqueClientsCount: uniqueClients.length,
    });
  },

  async getBarberStats(
    req: FastifyRequest<{
      Params: { barberId: string };
      Querystring: { startDate?: string; endDate?: string };
    }>,
    reply: FastifyReply
  ) {
    const { barberId } = req.params;
    const query = dateRangeSchema.parse(req.query);
    const barber = await barberRepository.findById(barberId);

    if (!barber) {
      throw new AppError('Barbeiro não encontrado', 404);
    }

    if (req.user.role !== 'SUPER_ADMIN' && barber.accountId !== req.user.id) {
      const admin = await barbershopAdminRepository.findByAccountAndBarbershop(
        req.user.id,
        barber.barbershopId
      );

      if (!admin) {
        throw new AppError('Acesso negado', 403);
      }
    }

    const whereClause: Prisma.BookingWhereInput = {
      barberId,
      status: { not: 'CANCELLED' },
    };

    if (query.startDate && query.endDate) {
      whereClause.day = { gte: query.startDate, lte: query.endDate };
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      select: {
        id: true,
        day: true,
        startTime: true,
        amountPaid: true,
        createdAt: true,
        client: { select: { name: true, phone: true } },
      },
    });

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0);
    const averageRevenue = totalBookings > 0 ? totalRevenue / totalBookings : 0;

    return reply.send({
      totalBookings,
      totalRevenue,
      averageRevenue,
      bookings,
    });
  },

  async getBarbershopStats(
    req: FastifyRequest<{
      Params: { barbershopId: string };
      Querystring: { startDate?: string; endDate?: string };
    }>,
    reply: FastifyReply
  ) {
    const { barbershopId } = req.params;
    const query = dateRangeSchema.parse(req.query);

    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'BARBERSHOP_ADMIN') {
      throw new AppError('Acesso negado', 403);
    }

    if (req.user.role === 'BARBERSHOP_ADMIN') {
      const admin = await barbershopAdminRepository.findByAccountAndBarbershop(
        req.user.id,
        barbershopId
      );

      if (!admin) {
        throw new AppError('Acesso negado', 403);
      }
    }

    const whereClause: Prisma.BookingWhereInput = {
      barbershopId,
      status: { not: 'CANCELLED' },
    };

    if (query.startDate && query.endDate) {
      whereClause.day = { gte: query.startDate, lte: query.endDate };
    }

    const bookings = await prisma.booking.findMany({
      where: whereClause,
      select: {
        id: true,
        amountPaid: true,
        createdAt: true,
        barberId: true,
        clientId: true,
      },
    });

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((sum, b) => sum + (b.amountPaid || 0), 0);

    // Bookings por barbeiro
    const bookingsByBarber = await prisma.booking.groupBy({
      by: ['barberId'],
      where: whereClause,
      _count: true,
    });

    return reply.send({
      totalBookings,
      totalRevenue,
      bookingsByBarber: bookingsByBarber.map(b => ({
        barberId: b.barberId,
        totalBookings: b._count,
      })),
    });
  },
};
