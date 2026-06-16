import { prisma } from '../database/prisma.js';

export const barbershopAdminRepository = {
  findById(id: string) {
    return prisma.barbershopAdmin.findUnique({
      where: { id },
      include: { account: true, barbershop: true }
    });
  },

  findByAccountId(accountId: string) {
    return prisma.barbershopAdmin.findFirst({
      where: { accountId },
      include: { barbershop: true },
    });
  },

  findByAccountAndBarbershop(accountId: string, barbershopId: string) {
    return prisma.barbershopAdmin.findUnique({
      where: {
        accountId_barbershopId: {
          accountId,
          barbershopId,
        },
      },
    });
  },

  findManyByAccountId(accountId: string) {
    return prisma.barbershopAdmin.findMany({
      where: { accountId },
      include: { barbershop: true }
    });
  },

  findManyByBarbershopId(barbershopId: string) {
    return prisma.barbershopAdmin.findMany({
      where: { barbershopId },
      include: { account: true }
    });
  },

  delete(id: string) {
    return prisma.barbershopAdmin.delete({ where: { id } });
  },

  create(data: {
    accountId: string;
    barbershopId: string;
  }) {
    return prisma.barbershopAdmin.create({
      data,
      include: {
        account: true,
        barbershop: true,
      },
    });
  },
};
