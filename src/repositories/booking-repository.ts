import { prisma } from '../database/prisma.js';

export const bookingRepository = {
  create(data: {
    userId: string;
    barberId: string;
    serviceId: string;
    barbershopId: string;
    day: string;
    time: string;
  }) {
    return prisma.booking.create({
      data,
      include: {
        user: true,
        barber: true,
        service: true,
        barbershop: true,
      },
    });
  },

  findByDay(barbershopId: string, day: string) {
    return prisma.booking.findMany({
      where: { barbershopId, day },
      include: {
        user: true,
        barber: true,
        service: true,
      },
      orderBy: { time: 'asc' },
    });
  },

  findByBarberDay(barberId: string, day: string) {
    return prisma.booking.findMany({
      where: { barberId, day },
      select: { time: true },
      orderBy: { time: 'asc' },
    });
  },
};
