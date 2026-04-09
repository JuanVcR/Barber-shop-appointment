import { prisma } from '../database/prisma.js';

export const barberRepository = {
  findById(id: string) {
    return prisma.barber.findUnique({ where: { id } });
  },

  findByEmail(email: string) {
    return prisma.barber.findUnique({ where: { email } });
  },

  findFirstByBarbershopId(barbershopId: string) {
    return prisma.barber.findFirst({
      where: { barbershopId },
      orderBy: { createdAt: 'asc' },
    });
  },

  findManyByBarbershopId(barbershopId: string) {
    return prisma.barber.findMany({
      where: { barbershopId },
      orderBy: { name: 'asc' },
    });
  },

  updatePassword(id: string, password: string) {
    return prisma.barber.update({
      where: { id },
      data: { password },
    });
  },
};
