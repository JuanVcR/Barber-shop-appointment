import { prisma } from '../database/prisma.js';

export const auditLogRepository = {
  create(data: {
    accountId?: string;
    method: string;
    path: string;
    status: number;
    ip?: string;
  }) {
    return prisma.auditLog.create({ data });
  },
};
