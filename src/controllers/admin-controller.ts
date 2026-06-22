import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AppError } from '../errors/app-error.js';
import { prisma } from '../database/prisma.js';
import { barberRepository } from '../repositories/barber-repository.js';
import { barbershopAdminRepository } from '../repositories/barbershop-admin-repository.js';
import { barbershopRepository } from '../repositories/barbershop-repository.js';
import { serviceRepository } from '../repositories/service-repository.js';
import { bookingRepository } from '../repositories/booking-repository.js';

const updateBarberServicesSchema = z.object({
  serviceIds: z.array(z.string().uuid()),
});

const createMeAsBarberSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(11),
  serviceIds: z.array(z.string().uuid()).optional(),
});

const barbershopParamsSchema = z.object({
  barbershopId: z.string().uuid(),
});

const barberParamsSchema = z.object({
  barbershopId: z.string().uuid(),
  barberId: z.string().uuid(),
});

const barberDayQuerySchema = z.object({
  day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export const adminController = {
  async getDashboard(req: FastifyRequest, reply: FastifyReply) {
    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'BARBERSHOP_ADMIN') {
      throw new AppError('Acesso negado', 403);
    }

    const barbershops =
      req.user.role === 'SUPER_ADMIN'
        ? await prisma.barbershop.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              name: true,
              slug: true,
              plan: true,
              setupCompleted: true,
              createdAt: true,
            },
          })
        : (
            await prisma.barbershopAdmin.findMany({
              where: { accountId: req.user.id },
              include: {
                barbershop: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    plan: true,
                    setupCompleted: true,
                    createdAt: true,
                  },
                },
              },
              orderBy: { createdAt: 'desc' },
            })
          ).map((admin) => admin.barbershop);

    const barbershopIds = barbershops.map((barbershop) => barbershop.id);
    const bookingWhere = barbershopIds.length > 0 ? { barbershopId: { in: barbershopIds } } : { id: '__none__' };

    const [totalBookings, revenue, totalUsers, paidBookings] = await Promise.all([
      prisma.booking.count({ where: bookingWhere }),
      prisma.booking.aggregate({
        where: { ...bookingWhere, amountPaid: { not: null } },
        _sum: { amountPaid: true },
      }),
      req.user.role === 'SUPER_ADMIN'
        ? prisma.account.count()
        : prisma.account.count({
            where: {
              OR: [
                { barber: { barbershopId: { in: barbershopIds } } },
                { barbershopAdmins: { some: { barbershopId: { in: barbershopIds } } } },
              ],
            },
          }),
      prisma.booking.findMany({
        where: { ...bookingWhere, amountPaid: { not: null } },
        select: { day: true, amountPaid: true },
      }),
    ]);

    const monthlyRevenue = Array.from({ length: 12 }, (_, month) => ({
      month: month + 1,
      revenue: 0,
    }));

    for (const booking of paidBookings) {
      const month = Number(booking.day.slice(5, 7));
      if (month >= 1 && month <= 12) {
        monthlyRevenue[month - 1].revenue += booking.amountPaid ?? 0;
      }
    }

    return reply.send({
      totalBarbershops: barbershops.length,
      activeBarbershops: barbershops.filter((barbershop) => barbershop.setupCompleted).length,
      totalBookings,
      totalRevenue: revenue._sum.amountPaid ?? 0,
      totalUsers,
      monthlyRevenue,
      recentBarbershops: barbershops.slice(0, 6),
    });
  },

  async getBarbershopDashboard(
    req: FastifyRequest<{ Params: { barbershopId: string } }>,
    reply: FastifyReply
  ) {
    const { barbershopId } = req.params;

    if (req.user.role !== 'SUPER_ADMIN') {
      const admin = await barbershopAdminRepository.findByAccountAndBarbershop(
        req.user.id,
        barbershopId
      );

      if (!admin) {
        throw new AppError('Acesso negado', 403);
      }
    }

    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const monday = new Date(now);
    const dayOffset = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - dayOffset);
    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    const weekStart = monday.toISOString().split('T')[0];
    const weekEnd = sunday.toISOString().split('T')[0];

    const [
      barbershop,
      totalBookings,
      todayBookings,
      revenue,
      todayRevenue,
      barbers,
      services,
      appointmentsToday,
      weekBookings,
      upcomingWeekAppointments,
      barbershopClients,
    ] =
      await Promise.all([
        prisma.barbershop.findUnique({
          where: { id: barbershopId },
          select: {
            id: true,
            name: true,
            slug: true,
            plan: true,
            setupCompleted: true,
            createdAt: true,
          },
        }),
        prisma.booking.count({ where: { barbershopId } }),
        prisma.booking.count({ where: { barbershopId, day: today } }),
        prisma.booking.aggregate({
          where: { barbershopId, amountPaid: { not: null } },
          _sum: { amountPaid: true },
        }),
        prisma.booking.aggregate({
          where: { barbershopId, day: today, amountPaid: { not: null } },
          _sum: { amountPaid: true },
        }),
        prisma.barber.findMany({
          where: { barbershopId },
          select: {
            id: true,
            name: true,
            phone: true,
            account: { select: { email: true } },
          },
          orderBy: { name: 'asc' },
        }),
        prisma.service.findMany({
          where: { barbershopId },
          select: { id: true, name: true, price: true, duration: true },
          orderBy: { name: 'asc' },
        }),
        prisma.booking.findMany({
          where: { barbershopId, day: today },
          include: {
            client: { select: { name: true, phone: true } },
            barber: { select: { id: true, name: true } },
            services: { include: { service: { select: { id: true, name: true } } } },
          },
          orderBy: { startTime: 'asc' },
        }),
        prisma.booking.findMany({
          where: {
            barbershopId,
            day: { gte: weekStart, lte: weekEnd },
          },
          select: { day: true },
        }),
        prisma.booking.findMany({
          where: {
            barbershopId,
            day: { gte: today, lte: weekEnd },
          },
          include: {
            client: { select: { id: true, name: true, phone: true } },
            barber: { select: { id: true, name: true } },
            services: {
              include: {
                service: {
                  select: { id: true, name: true, price: true, duration: true },
                },
              },
            },
            barbershop: { select: { id: true, name: true } },
          },
          orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
          take: 6,
        }),
        prisma.clientBarbershop.findMany({
          where: { barbershopId },
          select: {
            client: {
              select: {
                id: true,
                name: true,
                phone: true,
                bookings: {
                  where: { barbershopId, status: 'COMPLETED' },
                  select: { day: true },
                  orderBy: { day: 'desc' },
                },
              },
            },
          },
        }),
      ]);

    if (!barbershop) {
      throw new AppError('Barbearia não encontrada', 404);
    }

    return reply.send({
      barbershop,
      totalBookings,
      todayBookings,
      totalRevenue: revenue._sum.amountPaid ?? 0,
      todayRevenue: todayRevenue._sum.amountPaid ?? 0,
      weeklyBookings: Array.from({ length: 7 }, (_, index) => {
        const date = new Date(monday);
        date.setDate(date.getDate() + index);
        const day = date.toISOString().split('T')[0];
        return {
          day,
          count: weekBookings.filter((booking) => booking.day === day).length,
        };
      }),
      barbers: barbers.map((barber) => ({
        id: barber.id,
        name: barber.name,
        phone: barber.phone,
        email: barber.account.email,
      })),
      services,
      appointmentsToday,
      upcomingWeekAppointments,
      activeClients: barbershopClients
        .map(({ client }) => ({
          id: client.id,
          name: client.name,
          phone: client.phone,
          visits: client.bookings.length,
          lastVisit: client.bookings[0]?.day ?? null,
        }))
        .sort((left, right) => {
          if (right.visits !== left.visits) return right.visits - left.visits;
          return (right.lastVisit ?? '').localeCompare(left.lastVisit ?? '');
        })
        .slice(0, 5),
    });
  },

  async listUsers(req: FastifyRequest, reply: FastifyReply) {
    if (req.user.role !== 'SUPER_ADMIN') {
      throw new AppError('Acesso negado', 403);
    }

    const accounts = await prisma.account.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client: true,
        barber: {
          include: {
            barbershop: {
              select: {
                name: true,
                setupCompleted: true,
              },
            },
          },
        },
        barbershopAdmins: {
          include: {
            barbershop: {
              select: {
                name: true,
                setupCompleted: true,
              },
            },
          },
        },
      },
    });

    return reply.send(
      accounts.map((account) => {
        const adminBarbershop = account.barbershopAdmins[0]?.barbershop;
        const linkedBarbershop = account.barber?.barbershop ?? adminBarbershop ?? null;
        const name =
          account.client?.name ??
          account.barber?.name ??
          account.email.split('@')[0];

        return {
          id: account.id,
          name,
          email: account.email,
          role: account.role,
          barbershop: linkedBarbershop?.name ?? null,
          status: linkedBarbershop && !linkedBarbershop.setupCompleted ? 'Trial' : 'Ativo',
          createdAt: account.createdAt,
        };
      })
    );
  },

  async listBarbershops(req: FastifyRequest, reply: FastifyReply) {
    if (req.user.role === 'SUPER_ADMIN') {
      return reply.send(await barbershopRepository.findMany());
    }

    const admins = await barbershopAdminRepository.findManyByAccountId(req.user.id);

    if (!admins || !Array.isArray(admins)) {
      return reply.send([]);
    }

    const barbershops = admins.map(admin => ({
      id: admin.barbershop.id,
      name: admin.barbershop.name,
      slug: admin.barbershop.slug,
      cnpj: admin.barbershop.cnpj,
      address: admin.barbershop.address,
      phoneOwner: admin.barbershop.phoneOwner,
      latitude: admin.barbershop.latitude,
      longitude: admin.barbershop.longitude,
      plan: admin.barbershop.plan,
      setupCompleted: admin.barbershop.setupCompleted,
      createdAt: admin.barbershop.createdAt,
    }));

    return reply.send(barbershops);
  },

  async listAdmins(
    req: FastifyRequest<{ Params: { barbershopId: string } }>,
    reply: FastifyReply
  ) {
    const { barbershopId } = req.params;

    // Validar permissão
    const admin = await barbershopAdminRepository.findByAccountAndBarbershop(
      req.user.id,
      barbershopId
    );

    if (!admin && req.user.role !== 'SUPER_ADMIN') {
      throw new AppError('Acesso negado', 403);
    }

    const admins = await barbershopAdminRepository.findManyByBarbershopId(barbershopId);

    return reply.send(admins.map(a => ({
      id: a.id,
      accountId: a.accountId,
      email: a.account.email,
      createdAt: a.createdAt,
    })));
  },

  async removeAdmin(
    req: FastifyRequest<{
      Params: { barbershopId: string; adminId: string };
    }>,
    reply: FastifyReply
  ) {
    const { barbershopId, adminId } = req.params;

    // Validar permissão
    const admin = await barbershopAdminRepository.findByAccountAndBarbershop(
      req.user.id,
      barbershopId
    );

    if (!admin && req.user.role !== 'SUPER_ADMIN') {
      throw new AppError('Acesso negado', 403);
    }

    const target = await barbershopAdminRepository.findById(adminId);

    if (!target || target.barbershop.id !== barbershopId) {
      throw new AppError('Admin não encontrado', 404);
    }

    await barbershopAdminRepository.delete(adminId);

    return reply.status(204).send();
  },

  async removeBarber(
    req: FastifyRequest<{
      Params: { barbershopId: string; barberId: string };
    }>,
    reply: FastifyReply
  ) {
    const { barbershopId, barberId } = req.params;

    const admin = await barbershopAdminRepository.findByAccountAndBarbershop(
      req.user.id,
      barbershopId
    );

    if (!admin && req.user.role !== 'SUPER_ADMIN') {
      throw new AppError('Acesso negado', 403);
    }

    const barber = await barberRepository.findById(barberId);

    if (!barber || barber.barbershopId !== barbershopId) {
      throw new AppError('Barbeiro não encontrado', 404);
    }

    await barberRepository.delete(barberId);

    return reply.status(204).send();
  },

  async listBarbers(
    req: FastifyRequest<{ Params: { barbershopId: string } }>,
    reply: FastifyReply
  ) {
    const { barbershopId } = req.params;
    const admin = await barbershopAdminRepository.findByAccountAndBarbershop(
      req.user.id,
      barbershopId
    );

    if (!admin && req.user.role !== 'SUPER_ADMIN') {
      throw new AppError('Acesso negado', 403);
    }

    const barbers = await barberRepository.findManyByBarbershopId(barbershopId);

    return reply.send(barbers.map(barber => ({
      id: barber.id,
      name: barber.name,
      phone: barber.phone,
      email: barber.account?.email ?? '',
      services: (barber.services ?? []).map(bs => ({
        id: bs.service.id,
        name: bs.service.name,
        duration: bs.service.duration,
      })),
      availability: (barber.availability ?? []).map(av => ({
        weekDay: av.weekDay,
        startTime: av.startTime,
        endTime: av.endTime,
      }))
    })));
  },

  async listServices(
    req: FastifyRequest<{ Params: { barbershopId: string } }>,
    reply: FastifyReply
  ) {
    const { barbershopId } = barbershopParamsSchema.parse(req.params);
    const admin = await barbershopAdminRepository.findByAccountAndBarbershop(
      req.user.id,
      barbershopId
    );

    if (!admin && req.user.role !== 'SUPER_ADMIN') {
      throw new AppError('Acesso negado', 403);
    }

    const services = await serviceRepository.findByBarbershopId(barbershopId);

    return reply.send(services);
  },

  async createMeAsBarber(
    req: FastifyRequest<{ Params: { barbershopId: string } }>,
    reply: FastifyReply
  ) {
    const { barbershopId } = barbershopParamsSchema.parse(req.params);
    const body = createMeAsBarberSchema.parse(req.body);

    if (req.user.role !== 'SUPER_ADMIN' && req.user.role !== 'BARBERSHOP_ADMIN') {
      throw new AppError('Acesso negado', 403);
    }

    const admin = await barbershopAdminRepository.findByAccountAndBarbershop(
      req.user.id,
      barbershopId
    );

    if (!admin && req.user.role !== 'SUPER_ADMIN') {
      throw new AppError('Acesso negado', 403);
    }

    const account = await prisma.account.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true },
    });

    if (!account) {
      throw new AppError('Conta nao encontrada', 404);
    }

    const existingBarber = await barberRepository.findByAccountId(req.user.id);

    if (existingBarber) {
      throw new AppError('Esta conta ja possui perfil de barbeiro', 400);
    }

    const existingPhone = await prisma.barber.findUnique({
      where: { phone: body.phone },
    });

    if (existingPhone) {
      throw new AppError('Telefone ja cadastrado para outro barbeiro', 400);
    }

    if (body.serviceIds?.length) {
      const services = await serviceRepository.findManyByIds(body.serviceIds);

      if (
        services.length !== body.serviceIds.length ||
        services.some((service) => service.barbershopId !== barbershopId)
      ) {
        throw new AppError('Servico nao pertence a esta barbearia', 400);
      }
    }

    const barber = await barberRepository.create({
      accountId: account.id,
      name: body.name ?? account.email.split('@')[0],
      phone: body.phone,
      barbershopId,
      serviceIds: body.serviceIds,
    });

    return reply.status(201).send(barber);
  },

  async getBarberDay(req: FastifyRequest, reply: FastifyReply) {
    const { barbershopId, barberId } = barberParamsSchema.parse(req.params);
    const { day } = barberDayQuerySchema.parse(req.query);

    const admin = await barbershopAdminRepository.findByAccountAndBarbershop(req.user.id, barbershopId);

    if (!admin && req.user.role !== 'SUPER_ADMIN') {
      throw new AppError('Acesso negado', 403);
    }

    const barber = await barberRepository.findById(barberId);

    if (!barber || barber.barbershopId !== barbershopId) {
      throw new AppError('Barbeiro nao encontrado', 404);
    }

    const bookings = await bookingRepository.findByBarberAndDay(
      barbershopId,
      barberId,
      day
    );

    return reply.send(bookings);
  },

  async getBarberHistory(req: FastifyRequest, reply: FastifyReply) {
    const { barbershopId, barberId } = barberParamsSchema.parse(req.params);

    const admin = await barbershopAdminRepository.findByAccountAndBarbershop(
      req.user.id,
      barbershopId
    );

    if (!admin && req.user.role !== 'SUPER_ADMIN') {
      throw new AppError('Acesso negado', 403);
    }

    const barber = await barberRepository.findById(barberId);

    if (!barber || barber.barbershopId !== barbershopId) {
      throw new AppError('Barbeiro nao encontrado', 404);
    }

    const bookings = await bookingRepository.findHistoryByBarberInBarbershop({
      barbershopId,
      barberId,
    });

    return reply.send(bookings);
  },
  async updateBarberServices(
    req: FastifyRequest<{
      Params: { barbershopId: string; barberId: string };
    }>,
    reply: FastifyReply
  ) {
    const { barbershopId, barberId } = req.params;
    const body = updateBarberServicesSchema.parse(req.body);
    const admin = await barbershopAdminRepository.findByAccountAndBarbershop(
      req.user.id,
      barbershopId
    );

    if (!admin && req.user.role !== 'SUPER_ADMIN') {
      throw new AppError('Acesso negado', 403);
    }

    const barber = await barberRepository.findById(barberId);

    if (!barber || barber.barbershopId !== barbershopId) {
      throw new AppError('Barbeiro nao encontrado', 404);
    }

    const services = await serviceRepository.findManyByIds(body.serviceIds);

    if (
      services.length !== body.serviceIds.length ||
      services.some((service) => service.barbershopId !== barbershopId)
    ) {
      throw new AppError('Servico nao pertence a esta barbearia', 400);
    }

    const updated = await barberRepository.replaceServices(barberId, body.serviceIds);

    return reply.send(updated);
  },
};
