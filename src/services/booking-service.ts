import { prisma } from '../database/prisma.js';

export const bookingService = {
  async create (data: {
    userId: string;
    barberId: string;
    serviceId: string;
    day: string;
    time: string;
    barbershopId: string;
  }) {
    return prisma.booking.create({
      data
    })
  },

  async listByDay(barbershopId: string, day: string) {

    return prisma.booking.findMany({
      where: {
        barbershopId,
        day
      }
    })
  }
};