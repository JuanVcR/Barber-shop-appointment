import { prisma } from '../database/prisma.js';
import type { BarbershopPlan } from '../domain/barbershop-plan.js';
import { AppError } from '../errors/app-error.js';
import { notificationService } from './notification-service.js';

type PricePlan = Extract<BarbershopPlan, 'FREE' | 'BASIC' | 'PRO'>;

const defaultPrices: Record<PricePlan, number | null> = {
  FREE: 29.9,
  BASIC: 49.9,
  PRO: null,
};

function firstDayOfNextMonth(from = new Date()) {
  return new Date(from.getFullYear(), from.getMonth() + 1, 1, 0, 0, 0, 0);
}

function formatCurrency(value: number | null) {
  if (value === null) return 'Sob consulta';

  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

function formatDate(value: Date) {
  return value.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

async function ensurePlanPrices() {
  const existing = await prisma.planPrice.findMany();
  const existingPlans = new Set(existing.map((item) => item.plan));

  const missing = (Object.keys(defaultPrices) as PricePlan[])
    .filter((plan) => !existingPlans.has(plan));

  if (missing.length > 0) {
    await prisma.planPrice.createMany({
      data: missing.map((plan) => ({
        plan,
        amount: defaultPrices[plan],
      })),
      skipDuplicates: true,
    });
  }
}

export const planSettingsService = {
  async syncEffectivePrices() {
    const now = new Date();
    const prices = await prisma.planPrice.findMany({
      where: {
        pendingAmount: { not: null },
        pendingEffectiveAt: { lte: now },
      },
    });

    if (prices.length === 0) return;

    await prisma.$transaction(
      prices.map((price) =>
        prisma.planPrice.update({
          where: { plan: price.plan },
          data: {
            amount: price.pendingAmount,
            pendingAmount: null,
            pendingEffectiveAt: null,
          },
        })
      )
    );
  },

  async listPrices() {
    await ensurePlanPrices();
    await this.syncEffectivePrices();

    return prisma.planPrice.findMany({
      orderBy: { plan: 'asc' },
    });
  },

  async getAmountForPlan(plan: PricePlan) {
    await ensurePlanPrices();
    await this.syncEffectivePrices();

    const price = await prisma.planPrice.findUnique({
      where: { plan },
    });

    return price?.amount ?? defaultPrices[plan];
  },

  async getSuperAdminSummary(requester: { role: string }) {
    if (requester.role !== 'SUPER_ADMIN') {
      throw new AppError('Acesso negado', 403);
    }

    const [prices, barbershops] = await Promise.all([
      this.listPrices(),
      prisma.barbershop.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
          plan: true,
          setupCompleted: true,
          createdAt: true,
        },
      }),
    ]);

    return { prices, barbershops };
  },

  async schedulePriceUpdate(data: {
    requester: { role: string };
    prices: Array<{ plan: PricePlan; amount: number | null }>;
  }) {
    if (data.requester.role !== 'SUPER_ADMIN') {
      throw new AppError('Acesso negado', 403);
    }

    await ensurePlanPrices();
    await this.syncEffectivePrices();

    const effectiveAt = firstDayOfNextMonth();
    const changed = [];

    for (const item of data.prices) {
      if (item.amount !== null && item.amount <= 0) {
        throw new AppError('Preco do plano deve ser maior que zero', 400);
      }

      const current = await prisma.planPrice.findUnique({ where: { plan: item.plan } });
      const currentAmount = current?.pendingAmount ?? current?.amount ?? defaultPrices[item.plan];

      if (currentAmount === item.amount) continue;

      await prisma.planPrice.update({
        where: { plan: item.plan },
        data: {
          pendingAmount: item.amount,
          pendingEffectiveAt: effectiveAt,
        },
      });

      changed.push({
        plan: item.plan,
        oldAmount: current?.amount ?? defaultPrices[item.plan],
        newAmount: item.amount,
      });
    }

    let priceEmailSent = false;

    if (changed.length > 0) {
      const admins = await prisma.account.findMany({
        where: {
          role: 'BARBERSHOP_ADMIN',
          deletedAt: null,
          barbershopAdmins: {
            some: {
              barbershop: {
                plan: { in: changed.map((item) => item.plan) },
              },
            },
          },
        },
        select: { email: true },
        distinct: ['email'],
      });

      try {
        await notificationService.sendPlanPriceChangeEmail({
          to: admins.map((admin) => admin.email),
          effectiveAt: formatDate(effectiveAt),
          changes: changed.map((item) => ({
            plan: item.plan === 'FREE' ? 'Inicial' : item.plan === 'BASIC' ? 'Profissional' : 'Premium',
            oldPrice: formatCurrency(item.oldAmount),
            newPrice: formatCurrency(item.newAmount),
          })),
        });
        priceEmailSent = true;
      } catch {
        priceEmailSent = false;
      }
    }

    const summary = await this.getSuperAdminSummary(data.requester);

    return {
      ...summary,
      priceEmailSent,
      priceEmailScheduled: changed.length > 0,
    };
  },
};
