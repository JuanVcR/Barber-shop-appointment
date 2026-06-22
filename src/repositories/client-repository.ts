import { prisma } from '../database/prisma.js';

export const clientRepository = {
  findById(id: string) {
    return prisma.client.findUnique({ where: { id } });
  },

  findByAccountId(accountId: string) {
    return prisma.client.findUnique({ where: { accountId } });
  },

  findByPhone(phone: string) {
    return prisma.client.findFirst({ where: { phone } });
  },

  findByCpf(cpf: string) {
    return prisma.client.findFirst({ where: { cpf } });
  },

  create(data: {
    accountId?: string | null;
    name: string;
    phone: string;
    email?: string | null;
    cpf?: string | null;
  }) {
    return prisma.client.create({ data });
  },

  update(id: string, data: {
    name?: string;
    phone?: string;
    cpf?: string;
    email?: string | null;
  }) {
    return prisma.client.update({
      where: { id },
      data,
    });
  },

  findByPhoneInBarbershop(phone: string, barbershopId: string) {
    return prisma.client.findFirst({
      where: {
        phone,
        barbershops: {
          some: {
            barbershopId,
          },
        },
      },
    });
  },

  linkToBarbershop(data: { clientId: string; barbershopId: string }) {
    return prisma.clientBarbershop.upsert({
      where: {
        clientId_barbershopId: data,
      },
      update: {},
      create: data,
    });
  },
};
