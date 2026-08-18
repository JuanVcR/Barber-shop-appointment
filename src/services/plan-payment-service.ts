import crypto from 'node:crypto';
import { z } from 'zod';
import { env } from '../config/env.js';
import { prisma } from '../database/prisma.js';
import { barbershopPlanLimits } from '../domain/barbershop-plan.js';
import { AppError } from '../errors/app-error.js';
import { barbershopService } from './barbershop-service.js';
import { planSettingsService } from './plan-settings-service.js';

type PaidPlan = 'FREE' | 'BASIC' | 'PRO';

const createPaymentResponseSchema = z.object({
  id: z.union([z.string(), z.number()]),
  status: z.string().optional(),
  point_of_interaction: z.object({
    transaction_data: z.object({
      qr_code: z.string().optional(),
      qr_code_base64: z.string().optional(),
      ticket_url: z.string().optional(),
    }).optional(),
  }).optional(),
});

const paymentStatusResponseSchema = z.object({
  id: z.union([z.string(), z.number()]),
  status: z.string(),
  external_reference: z.string().optional().nullable(),
});

function getPaymentId(payload: unknown) {
  const data = payload as {
    data?: { id?: string | number };
    resource?: string;
    id?: string | number;
    topic?: string;
    type?: string;
  };

  if (data.data?.id) return String(data.data.id);
  if (data.id && (data.topic === 'payment' || data.type === 'payment')) return String(data.id);
  if (data.resource) {
    const parts = data.resource.split('/').filter(Boolean);
    return parts[parts.length - 1];
  }
  return null;
}

function getNotificationUrl() {
  try {
    const appUrl = new URL(env.APP_URL);

    if (['localhost', '127.0.0.1', '0.0.0.0'].includes(appUrl.hostname)) {
      return undefined;
    }

    return `${appUrl.origin}/api/subscriptions/webhook/mercado-pago`;
  } catch {
    return undefined;
  }
}

async function mercadoPagoRequest<T>(path: string, options: RequestInit) {
  if (!env.MERCADO_PAGO_ACCESS_TOKEN) {
    throw new AppError('Token do Mercado Pago nao configurado', 500);
  }

  const response = await fetch('https://api.mercadopago.com' + path, {
    ...options,
    headers: {
      Authorization: `Bearer ${env.MERCADO_PAGO_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new AppError(
      body?.message ?? body?.error ?? 'Erro ao comunicar com Mercado Pago',
      response.status
    );
  }

  return body as T;
}

export const planPaymentService = {
  async createPixPayment(data: {
    requester: {
      accountId: string;
      role: string;
    };
    barbershopId: string;
    plan: PaidPlan;
  }) {
    await barbershopService.ensureCanManageBarbershop(data.requester, data.barbershopId);

    const amount = await planSettingsService.getAmountForPlan(data.plan);
    if (!amount) {
      throw new AppError('Este plano e sob consulta. Entre em contato para contratar.', 400);
    }

    const barbershop = await prisma.barbershop.findUnique({
      where: { id: data.barbershopId },
      select: { id: true, name: true, plan: true },
    });
    const account = await prisma.account.findUnique({
      where: { id: data.requester.accountId },
      select: { email: true },
    });

    if (!barbershop) {
      throw new AppError('Barbearia nao encontrada', 404);
    }

    if (barbershop.plan === data.plan) {
      throw new AppError('Esta barbearia ja esta usando este plano', 409);
    }

    const planName = data.plan === 'FREE' ? 'Inicial' : data.plan === 'BASIC' ? 'Profissional' : 'Premium';
    const description = `Plano ${planName} BarberFlow`;
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000);
    const notificationUrl = getNotificationUrl();

    const paymentResponse = await mercadoPagoRequest<unknown>('/v1/payments', {
      method: 'POST',
      headers: {
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        transaction_amount: amount,
        description,
        payment_method_id: 'pix',
        external_reference: data.barbershopId,
        date_of_expiration: expiresAt.toISOString(),
        ...(notificationUrl ? { notification_url: notificationUrl } : {}),
        payer: {
          email: account?.email ?? 'pagamento@barberflow.local',
        },
      }),
    });

    const parsed = createPaymentResponseSchema.parse(paymentResponse);
    const transactionData = parsed.point_of_interaction?.transaction_data;

    if (!transactionData?.qr_code || !transactionData.qr_code_base64) {
      throw new AppError('Mercado Pago nao retornou o QR Code Pix', 502);
    }

    const payment = await prisma.planPayment.create({
      data: {
        barbershopId: data.barbershopId,
        plan: data.plan,
        amount,
        providerPaymentId: String(parsed.id),
        qrCode: transactionData.qr_code,
        qrCodeBase64: transactionData.qr_code_base64,
        ticketUrl: transactionData.ticket_url,
        expiresAt,
      },
    });

    return {
      id: payment.id,
      providerPaymentId: payment.providerPaymentId,
      plan: payment.plan,
      amount: payment.amount,
      status: payment.status,
      qrCode: payment.qrCode,
      qrCodeBase64: payment.qrCodeBase64,
      ticketUrl: payment.ticketUrl,
      expiresAt: payment.expiresAt,
    };
  },

  async handleMercadoPagoWebhook(payload: unknown) {
    const providerPaymentId = getPaymentId(payload);
    if (!providerPaymentId) {
      return { ok: true, ignored: true };
    }

    const paymentResponse = await mercadoPagoRequest<unknown>(
      `/v1/payments/${encodeURIComponent(providerPaymentId)}`,
      { method: 'GET' }
    );
    const mercadoPagoPayment = paymentStatusResponseSchema.parse(paymentResponse);

    const payment = await prisma.planPayment.findUnique({
      where: { providerPaymentId: String(mercadoPagoPayment.id) },
    });

    if (!payment) {
      return { ok: true, ignored: true };
    }

    if (mercadoPagoPayment.status === 'approved') {
      const limits = barbershopPlanLimits[payment.plan];
      if (!limits) {
        throw new AppError('Plano invalido no pagamento', 409);
      }

      await prisma.$transaction([
        prisma.planPayment.update({
          where: { id: payment.id },
          data: {
            status: 'PAID',
            paidAt: new Date(),
          },
        }),
        prisma.barbershop.update({
          where: { id: payment.barbershopId },
          data: {
            plan: payment.plan,
            subscriptionStatus: 'ACTIVE',
            subscriptionCancelledAt: null,
          },
        }),
      ]);

      return { ok: true, paid: true };
    }

    if (['cancelled', 'expired'].includes(mercadoPagoPayment.status)) {
      await prisma.planPayment.update({
        where: { id: payment.id },
        data: { status: mercadoPagoPayment.status === 'expired' ? 'EXPIRED' : 'CANCELLED' },
      });
    }

    if (['rejected', 'refunded', 'charged_back'].includes(mercadoPagoPayment.status)) {
      await prisma.planPayment.update({
        where: { id: payment.id },
        data: { status: 'FAILED' },
      });
    }

    return { ok: true };
  },

  async cancelSubscription(data: {
    requester: {
      accountId: string;
      role: string;
    };
    barbershopId: string;
  }) {
    await barbershopService.ensureCanManageBarbershop(data.requester, data.barbershopId);

    const barbershop = await prisma.barbershop.findUnique({
      where: { id: data.barbershopId },
      select: { id: true, subscriptionStatus: true },
    });

    if (!barbershop) {
      throw new AppError('Barbearia nao encontrada', 404);
    }

    return prisma.barbershop.update({
      where: { id: data.barbershopId },
      data: {
        subscriptionStatus: 'CANCELLED',
        subscriptionCancelledAt: new Date(),
      },
    });
  },
};
