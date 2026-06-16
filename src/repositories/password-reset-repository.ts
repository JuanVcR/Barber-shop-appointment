import { prisma } from '../database/prisma.js';

export const passwordResetRepository = {
  create(data: { token: string; accountId: string; expiresAt: Date }) {
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
