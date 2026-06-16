import { prisma } from '../database/prisma.js';
import type { AccountRole } from '../domain/account-role.js';

export const accountRepository = {
  findById(id: string) {
    return prisma.account.findUnique({ where: { id } });
  },

  findByEmail(email: string) {
    return prisma.account.findUnique({ where: { email } });
  },

  create(data: {
    email: string;
    password: string;
    role: AccountRole;
    refreshToken?: string | null;
  }) {
    return prisma.account.create({ data });
  },

  findByIdWithRelations(id: string) {
    return prisma.account.findUnique({
      where: { id },
      include: {
        client: true,
        barber: {
          include: { barbershop: true }
        },
        barbershopAdmins: {
          include: { barbershop: true }
        }
      }
    })
  },

  updatePassword(id: string, password: string) {
    return prisma.account.update({
      where: { id },
      data: { password, refreshToken: null },
    });
  },

  updateRefreshToken(id: string, refreshToken: string | null) {
    return prisma.account.update({
      where: { id },
      data: { refreshToken },
    });
  },

  anonymizeClientAccount(accountId: string) {
    return prisma.$transaction(async (tx) => {
      const client = await tx.client.findUnique({ where: { accountId } });

      if (client) {
        await tx.client.update({
          where: { id: client.id },
          data: {
            name: 'Cliente removido',
            email: null,
            cpf: null,
            phone: `deleted-${client.id}`,
          },
        });
      }

      return tx.account.update({
        where: { id: accountId },
        data: {
          email: `deleted-${accountId}@deleted.local`,
          password: '',
          refreshToken: null,
          deletedAt: new Date(),
        },
      });
    });
  },
};
