import { prisma } from '../database/prisma.js';

export const passwordResetRepository = {
  createForUser(data: { token: string; userId: string; expiresAt: Date }) {
    return prisma.passwordResetToken.create({
      data,
    });
  },

  createForBarber(data: { token: string; barberId: string; expiresAt: Date }) {
    return prisma.passwordResetToken.create({
      data,
    });
  },

  findValidToken(token: string) {
    return prisma.passwordResetToken.findFirst({
      where: {
        token,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });
  },

  markAsUsed(id: string) {
    return prisma.passwordResetToken.update({
      where: { id },
      data: { usedAt: new Date() },
    });
  },
};
