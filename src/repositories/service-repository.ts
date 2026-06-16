import { prisma } from '../database/prisma.js';

export const serviceRepository = {
  findById(id: string) {
    return prisma.service.findUnique({
      where: { id },
      include: {
        barbers: {
          include: { barber: true }
        }
      }
    });
  },

  findByBarbershopId(barbershopId: string) {
    return prisma.service.findMany({
      where: { barbershopId },
      include: {
        barbers: {
          include: { barber: true }
        }
      },
      orderBy: { name: 'asc' }
    });
  },

  findManyByIds(ids: string[]) {
    return prisma.service.findMany({
      where: { id: { in: ids } },
      include: {
        barbers: {
          include: { barber: true }
        }
      }
    });
  },

  create(data: {
    name: string;
    price: number;
    duration: number;
    barbershopId: string;
  }) {
    return prisma.service.create({
      data,
      include: {
        barbers: {
          include: { barber: true }
        }
      }
    });
  },

  update(id: string, data: {
    name?: string;
    price?: number;
    duration?: number;
  }) {
    return prisma.service.update({
      where: { id },
      data,
      include: {
        barbers: {
          include: { barber: true }
        }
      }
    });
  },

  delete(id: string) {
    return prisma.service.delete({ where: { id } });
  },

  countBookings(id: string) {
    return prisma.bookingService.count({ where: { serviceId: id } });
  },
};
