import { prisma } from '../database/prisma.js';

export const bookingRepository = {
  findScheduledByDay(day: string) {
    return prisma.booking.findMany({
      where: { day, status: 'SCHEDULED' },
      include: {
        client: true,
        barber: true,
        barbershop: true,
        services: { include: { service: true } },
      },
    });
  },

  create(data: {
    clientId: string;
    barberId: string;
    serviceIds: string[];
    barbershopId: string;
    day: string;
    startTime: string;
    endTime: string;
    totalDuration: number;
  }) {
    return prisma.booking.create({
      data: {
        clientId: data.clientId,
        barberId: data.barberId,
        barbershopId: data.barbershopId,
        day: data.day,
        startTime: data.startTime,
        endTime: data.endTime,
        totalDuration: data.totalDuration,
        services: {
          createMany: {
            data: data.serviceIds.map((serviceId) => ({ serviceId })),
          },
        },
      },
      include: {
        client: true,
        barber: true,
        barbershop: true,
        services: {
          include: {
            service: true,
          },
        },
      },
    });
  },

  async createIfAvailable(data: {
    clientId: string;
    barberId: string;
    serviceIds: string[];
    barbershopId: string;
    day: string;
    startTime: string;
    endTime: string;
    totalDuration: number;
  }) {
    return prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`${data.barberId}:${data.day}`}))`;

      const conflict = await tx.booking.findFirst({
        where: {
          barberId: data.barberId,
          day: data.day,
          status: { not: 'CANCELLED' },
          startTime: { lt: data.endTime },
          endTime: { gt: data.startTime },
        },
        select: { id: true },
      });

      if (conflict) {
        return null;
      }

      return tx.booking.create({
        data: {
          clientId: data.clientId,
          barberId: data.barberId,
          barbershopId: data.barbershopId,
          day: data.day,
          startTime: data.startTime,
          endTime: data.endTime,
          totalDuration: data.totalDuration,
          services: {
            createMany: {
              data: data.serviceIds.map((serviceId) => ({ serviceId })),
            },
          },
        },
        include: {
          client: true,
          barber: true,
          barbershop: true,
          services: { include: { service: true } },
        },
      });
    });
  },

  findByDay(barbershopId: string, day: string) {
  return prisma.booking.findMany({
    where: {
      barbershopId,
      day,
      status: { not: 'CANCELLED' },
    },
    include: {
      client: true,
      barber: true,
      services: { include: { service: true } },
    },
    orderBy: { startTime: 'asc' },
  });
},

  findByClient(clientId: string) {
    return prisma.booking.findMany({
      where: { clientId },
      include: {
        barber: true,
        barbershop: true,
        services: {
          include: {
            service: true,
          },
        },
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });
  },

  findByBarber(barberId: string, day?: string) {
    return prisma.booking.findMany({
      where: {
        barberId,
        ...(day ? { day } : {}),
        status: { not: 'CANCELLED' },
      },
      include: {
        client: true,
        barbershop: true,
        services: {
          include: {
            service: true,
          },
        },
      },
      orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
    });
  },

  findByBarberAndDay(barbershopId: string, barberId: string, day: string) {
    return prisma.booking.findMany({
      where: {
        barbershopId,
        barberId,
        day,
      },
      include: {
        client: true,
        barber: true,
        barbershop: true,
        services: { include: { service: true } },
      },
      orderBy: { startTime: 'asc' },
    });
  },

  findHistoryByBarberInBarbershop(data: {
    barbershopId: string;
    barberId: string;
  }) {
    return prisma.booking.findMany({
      where: {
        barbershopId: data.barbershopId,
        barberId: data.barberId,
      },
      include: {
        client: true,
        barber: true,
        barbershop: true,
        services: { include: { service: true } },
      },
      orderBy: [{ day: 'desc' }, { startTime: 'desc' }],
    });
  },

  findHistoryByBarber(barberId: string) {
    return prisma.booking.findMany({
      where: { barberId },
      include: {
        client: true,
        barbershop: true,
        services: { include: { service: true } },
      },
      orderBy: [{ day: 'desc' }, { startTime: 'desc' }],
    });
  },

  cancel(data: {
  bookingId: string;
  cancellationReason?: string;
}) {
  return prisma.booking.update({
    where: { id: data.bookingId },
    data: {
      status: 'CANCELLED',
      cancellationReason: data.cancellationReason,
      cancelledAt: new Date(),
    },
    include: {
      client: true,
      barber: true,
      barbershop: true,
      services: {
        include: {
          service: true,
        },
      },
    },
  });
},

updateStatus(data: {
  bookingId: string;
  status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
  cancellationReason?: string;
}) {
  return prisma.booking.update({
    where: { id: data.bookingId },
    data: {
      status: data.status,
      cancellationReason:
        data.status === 'CANCELLED' ? data.cancellationReason : null,
      cancelledAt: data.status === 'CANCELLED' ? new Date() : null,
      completedAt: data.status === 'COMPLETED' ? new Date() : null,
    },
    include: {
      client: true,
      barber: true,
      barbershop: true,
      services: { include: { service: true } },
    },
  });
},

updateSchedule(data: {
  bookingId: string;
  day: string;
  startTime: string;
  endTime: string;
  totalDuration: number;
}) {
  return prisma.booking.update({
    where: { id: data.bookingId },
    data: {
      day: data.day,
      startTime: data.startTime,
      endTime: data.endTime,
      totalDuration: data.totalDuration,
      status: 'SCHEDULED',
      cancellationReason: null,
      cancelledAt: null,
      completedAt: null,
    },
    include: {
      client: true,
      barber: true,
      barbershop: true,
      services: { include: { service: true } },
    },
  });
},

  findOverlapping(barberId: string, day: string, start: string, end: string) {
    return prisma.booking.findFirst({
      where: {
        barberId,
        day,
        OR: [
          { startTime: { lt: end, gte: start } },
          { endTime: { gt: start, lte: end } },
          {
            startTime: { lte: start },
            endTime: { gte: end },
          },
        ],
      },
    });
  },

 findByBarberDay(barberId: string, day: string, ignoreBookingId?: string) {
  return prisma.booking.findMany({
    where: {
      barberId,
      day,
      status: { not: 'CANCELLED' },
      id: ignoreBookingId ? { not: ignoreBookingId } : undefined,
    },
    select: {
      startTime: true,
      endTime: true,
    },
    orderBy: { startTime: 'asc' },
  });
},

  updatePayment(data: {
    bookingId: string;
    paymentMethod: 'DEBIT' | 'CREDIT' | 'PIX' | 'CASH';
    amountPaid: number;
  }) {
    return prisma.booking.update({
      where: { id: data.bookingId },
      data: {
        paymentMethod: data.paymentMethod,
        amountPaid: data.amountPaid,
      },
    });
  },

  findById(id: string) {
    return prisma.booking.findUnique({
      where: { id },
      include: {
        client: {
          include: {
            account: true,
          },
        },
        barber: {
          include: {
            account: true,
          },
        },
        barbershop: true,
        services: {
          include: {
            service: true,
          },
        },
      },
    });
  },
};
