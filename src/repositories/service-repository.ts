import { prisma } from '../database/prisma.js';

export const serviceRepository = {
  findById(id: string) {
    return prisma.service.findUnique({
      where: { id },
      include: {
        barbers: {
          include: {
            barber: true,
          },
        },
      },
    });
  },

  findManyByBarbershopId(barbershopId: string) {
    return prisma.service.findMany({
      where: { barbershopId },
      include: {
        barbers: {
          include: {
            barber: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  },
};
