import { prisma } from '../database/prisma.js';

export const barbershopRepository = {
  findMany() {
    return prisma.barbershop.findMany({
      include: {
        services: {
          include: {
            barbers: {
              include: {
                barber: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  },

  findBySlug(slug: string) {
    return prisma.barbershop.findUnique({
      where: { slug },
      include: {
        services: {
          include: {
            barbers: {
              include: {
                barber: true,
              },
            },
          },
        },
      },
    });
  },

  findById(id: string) {
    return prisma.barbershop.findUnique({ where: { id } });
  },
};
