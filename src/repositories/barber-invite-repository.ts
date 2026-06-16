import { prisma } from '../database/prisma.js';

export const barberInviteRepository = {
  create(data: {
    token: string;
    email: string;
    name: string;
    phone: string;
    barbershopId: string;
    invitedByAccountId: string;
    serviceIds?: string[];
    expiresAt: Date;
  }) {
    return prisma.barberInvite.create({
      data: {
        ...data,
        serviceIds: data.serviceIds ?? [],
      },
      include: {
        barbershop: true,
      },
    });
  },

  findValidByToken(token: string) {
    return prisma.barberInvite.findFirst({
      where: {
        token,
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        barbershop: true,
      },
    });
  },

  findPendingByEmail(barbershopId: string, email: string) {
    return prisma.barberInvite.findFirst({
      where: {
        barbershopId,
        email,
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  },

  findManyPendingByBarbershopId(barbershopId: string) {
    return prisma.barberInvite.findMany({
      where: {
        barbershopId,
        acceptedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  },

  findById(id: string) {
    return prisma.barberInvite.findUnique({ where: { id } });
  },

  delete(id: string) {
    return prisma.barberInvite.delete({ where: { id } });
  },

  markAccepted(id: string) {
    return prisma.barberInvite.update({
      where: { id },
      data: {
        acceptedAt: new Date(),
      },
    });
  },
};
