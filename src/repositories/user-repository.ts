import { prisma } from '../database/prisma.js';

export const userRepository = {
  findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  },

  findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  },

  findByPhone(phone: string) {
    return prisma.user.findFirst({ where: { phone } });
  },

   create(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) {
    return prisma.user.create({ data });
  },

  updatePassword(id: string, password: string) {
    return prisma.user.update({
      where: { id },
      data: { password },
    });
  },
};
