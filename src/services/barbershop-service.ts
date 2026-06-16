import { AppError } from '../errors/app-error.js';
import { env } from '../config/env.js';
import { barbershopRepository } from '../repositories/barbershop-repository.js';
import { serviceRepository } from '../repositories/service-repository.js';
import { authService } from './auth-service.js';
import { reverseGeocodingService } from './reverse-geocoding-service.js';
import { barberInviteRepository } from '../repositories/barber-invite-repository.js';
import {
  barbershopPlanLimits,
  type BarbershopPlan,
} from '../domain/barbershop-plan.js';
import { barberRepository } from '../repositories/barber-repository.js';

export const barbershopService = {
  async list() {
    return barbershopRepository.findPublic();
  },

  async getBySlug(slug: string) {
    const barbershop = await barbershopRepository.findBySlug(slug);

    if (!barbershop) {
      throw new AppError('Barbearia nao encontrada', 404);
    }

    return barbershop;
  },

  async create(data: {
    requester: {
      accountId: string;
      role: string;
    };
    name: string;
    slug: string;
    cnpj?: string | null;
    address?: string | null;
    plan?: 'FREE' | 'BASIC' | 'PRO';
    phoneOwner?: string | null;
    admin?: {
      email: string;
      password: string;
    };
  }) {
    if (data.requester.role !== 'SUPER_ADMIN') {
      throw new AppError('Apenas super admin pode cadastrar barbearia', 403);
    }

    let adminAccountId: string | undefined;

    if (data.admin) {
      const account = await authService.createAccount({
        email: data.admin.email,
        password: data.admin.password,
        role: 'BARBERSHOP_ADMIN',
      });

      adminAccountId = account.id;
    }

    return barbershopRepository.create({
      name: data.name,
      slug: data.slug,
      cnpj: data.cnpj,
      address: data.address,
      plan: data.plan,
      phoneOwner: data.phoneOwner,
      adminAccountId,
    });
  },

  async setup(data: {
    requester: {
      accountId: string;
      role: string;
    };
    barbershopId: string;
    workingHours?: Array<{
      weekDay: number;
      startTime: string;
      endTime: string;
    }>;
    services?: Array<{
      name: string;
      price: number;
      duration: number;
    }>;
  }) {
    await this.ensureCanManageBarbershop(data.requester, data.barbershopId);

    if (data.workingHours?.length) {
      await barbershopRepository.upsertWorkingHours({
        barbershopId: data.barbershopId,
        workingHours: data.workingHours,
      });
    }

    if (data.services?.length) {
      for (const service of data.services) {
        await serviceRepository.create({
          barbershopId: data.barbershopId,
          ...service,
        });
      }
    }

    return barbershopRepository.markSetupCompleted(data.barbershopId);
  },

  async createService(data: {
    requester: {
      accountId: string;
      role: string;
    };
    barbershopId: string;
    name: string;
    price: number;
    duration: number;
    barberIds?: string[];
  }) {
    await this.ensureCanManageBarbershop(data.requester, data.barbershopId);
    await this.ensurePlanCapacity(data.barbershopId, 'services');

    return serviceRepository.create({
      barbershopId: data.barbershopId,
      name: data.name,
      price: data.price,
      duration: data.duration,
    });
  },

  async listServices(barbershopId: string) {
    return serviceRepository.findByBarbershopId(barbershopId);
  },

  async createBarber(data: {
    requester: {
      accountId: string;
      role: string;
    };
    barbershopId: string;
    name: string;
    email: string;
    phone: string;
    serviceIds?: string[];
  }) {
    await this.ensureCanManageBarbershop(data.requester, data.barbershopId);
    await this.ensurePlanCapacity(data.barbershopId, 'barbers');

    return authService.createBarber({
      requester: data.requester,
      name: data.name,
      email: data.email,
      phone: data.phone,
      barbershopId: data.barbershopId,
      serviceIds: data.serviceIds,
    });
  },

  async listPendingBarberInvites(data: {
    requester: {
      accountId: string;
      role: string;
    };
    barbershopId: string;
  }) {
    await this.ensureCanManageBarbershop(data.requester, data.barbershopId);

    const invites =
      await barberInviteRepository.findManyPendingByBarbershopId(
        data.barbershopId
      );

    return invites.map((invite) => ({
      id: invite.id,
      name: invite.name,
      email: invite.email,
      phone: invite.phone,
      serviceIds: invite.serviceIds,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      inviteUrl: `${env.FRONTEND_URL}/#/auth/barber-invite?token=${encodeURIComponent(invite.token)}`,
    }));
  },

  async cancelBarberInvite(data: {
    requester: {
      accountId: string;
      role: string;
    };
    barbershopId: string;
    inviteId: string;
  }) {
    await this.ensureCanManageBarbershop(data.requester, data.barbershopId);

    const invite = await barberInviteRepository.findById(data.inviteId);

    if (!invite || invite.barbershopId !== data.barbershopId) {
      throw new AppError('Convite nao encontrado', 404);
    }

    if (invite.acceptedAt) {
      throw new AppError('Convite ja foi aceito', 400);
    }

    await barberInviteRepository.delete(invite.id);
  },

  async ensureCanManageBarbershop(
    requester: {
      accountId: string;
      role: string;
    },
    barbershopId: string
  ) {
    if (requester.role === 'SUPER_ADMIN') {
      return;
    }

    if (requester.role !== 'BARBERSHOP_ADMIN') {
      throw new AppError('Perfil sem permissao administrativa', 403);
    }

    const admin = await barbershopRepository.findAdmin(
      barbershopId,
      requester.accountId
    );

    if (!admin) {
      throw new AppError('Administrador nao pertence a esta barbearia', 403);
    }
  },

  async ensurePlanCapacity(
    barbershopId: string,
    resource: 'barbers' | 'services'
  ) {
    const barbershop = await barbershopRepository.findById(barbershopId);

    if (!barbershop) {
      throw new AppError('Barbearia nao encontrada', 404);
    }

    const limit = barbershopPlanLimits[barbershop.plan][resource];

    if (limit === null) {
      return;
    }

    const current =
      resource === 'services'
        ? (await serviceRepository.findByBarbershopId(barbershopId)).length
        : (await barberRepository.findManyByBarbershopId(barbershopId)).length +
          (await barberInviteRepository.findManyPendingByBarbershopId(barbershopId)).length;

    if (current >= limit) {
      throw new AppError(
        `Limite do plano ${barbershop.plan} atingido para ${resource === 'services' ? 'servicos' : 'barbeiros'}`,
        409
      );
    }
  },

  async update(data: {
    requester: {
      accountId: string;
      role: string;
    };
    barbershopId: string;
    name?: string;
    address?: string | null;
    phoneOwner?: string | null;
    plan?: BarbershopPlan;
    setupCompleted?: boolean;
    logoUrl?: string | null;
    coverUrl?: string | null;
  }) {
    await this.ensureCanManageBarbershop(data.requester, data.barbershopId);

    if (
      data.requester.role !== 'SUPER_ADMIN' &&
      (data.plan !== undefined || data.setupCompleted !== undefined)
    ) {
      throw new AppError('Apenas super admin pode alterar plano ou status', 403);
    }

    const barbershop = await barbershopRepository.findById(data.barbershopId);

    if (!barbershop) {
      throw new AppError('Barbearia nao encontrada', 404);
    }

    if (data.plan) {
      const limits = barbershopPlanLimits[data.plan];
      const [services, barbers, invites] = await Promise.all([
        serviceRepository.findByBarbershopId(data.barbershopId),
        barberRepository.findManyByBarbershopId(data.barbershopId),
        barberInviteRepository.findManyPendingByBarbershopId(data.barbershopId),
      ]);

      if (limits.services !== null && services.length > limits.services) {
        throw new AppError('A barbearia possui mais servicos que o novo plano permite', 409);
      }

      if (
        limits.barbers !== null &&
        barbers.length + invites.length > limits.barbers
      ) {
        throw new AppError('A barbearia possui mais barbeiros ou convites que o novo plano permite', 409);
      }
    }

    if (data.setupCompleted === true) {
      const readiness = await barbershopRepository.getReadiness(data.barbershopId);

      if (!readiness.workingHours || !readiness.services || !readiness.barbers) {
        throw new AppError(
          'Para ativar, cadastre ao menos um horario, um servico e um barbeiro',
          409
        );
      }
    }

    return barbershopRepository.update(data.barbershopId, {
      name: data.name,
      address: data.address,
      phoneOwner: data.phoneOwner,
      plan: data.plan,
      setupCompleted: data.setupCompleted,
      logoUrl: data.logoUrl,
      coverUrl: data.coverUrl,
    });
  },

  async updateService(data: {
    requester: {
      accountId: string;
      role: string;
    };
    serviceId: string;
    barbershopId: string;
    name?: string;
    price?: number;
    duration?: number;
  }) {
    await this.ensureCanManageBarbershop(data.requester, data.barbershopId);

    const { serviceRepository } = await import('../repositories/service-repository.js');

    const service = await serviceRepository.findById(data.serviceId);

    if (!service || service.barbershopId !== data.barbershopId) {
      throw new AppError('Serviço não encontrado', 404);
    }

    const updated = await serviceRepository.update(data.serviceId, {
      name: data.name,
      price: data.price,
      duration: data.duration,
    });

    return updated;
  },

  async deleteService(data: {
    requester: {
      accountId: string;
      role: string;
    };
    serviceId: string;
    barbershopId: string;
  }) {
    await this.ensureCanManageBarbershop(data.requester, data.barbershopId);

    const { serviceRepository } = await import('../repositories/service-repository.js');

    const service = await serviceRepository.findById(data.serviceId);

    if (!service || service.barbershopId !== data.barbershopId) {
      throw new AppError('Serviço não encontrado', 404);
    }

    if (await serviceRepository.countBookings(data.serviceId)) {
      throw new AppError('Servico com agendamentos nao pode ser excluido', 409);
    }

    await serviceRepository.delete(data.serviceId);
  },

  async getWorkingHours(barbershopId: string) {
    const { prisma } = await import('../database/prisma.js');

    const workingHours = await prisma.barbershopWorkingHour.findMany({
      where: { barbershopId },
      orderBy: { weekDay: 'asc' },
    });

    return workingHours;
  },

  async updateWorkingHours(data: {
    requester: {
      accountId: string;
      role: string;
    };
    barbershopId: string;
    workingHours: Array<{
      weekDay: number;
      startTime: string;
      endTime: string;
    }>;
  }) {
    await this.ensureCanManageBarbershop(data.requester, data.barbershopId);

    const { prisma } = await import('../database/prisma.js');

    // Deletar horários existentes
    await prisma.barbershopWorkingHour.deleteMany({
      where: { barbershopId: data.barbershopId },
    });

    // Criar novos horários
    const created = await prisma.barbershopWorkingHour.createMany({
      data: data.workingHours.map(wh => ({
        barbershopId: data.barbershopId,
        weekDay: wh.weekDay,
        startTime: wh.startTime,
        endTime: wh.endTime,
      })),
    });

    // Retornar os horários atualizados
    return prisma.barbershopWorkingHour.findMany({
      where: { barbershopId: data.barbershopId },
      orderBy: { weekDay: 'asc' },
    });
  },

  async updateLocation(data: {
    requester: {
      accountId: string;
      role: string;
    };
    barbershopId: string;
    latitude: number;
    longitude: number;
    reverseGeocode?: boolean;
  }) {
    await this.ensureCanManageBarbershop(data.requester, data.barbershopId);

    const barbershop = await barbershopRepository.findById(data.barbershopId);

    if (!barbershop) {
      throw new AppError('Barbearia nao encontrada', 404);
    }

    const address =
      data.reverseGeocode === false
        ? undefined
        : await reverseGeocodingService.getAddress(
            data.latitude,
            data.longitude
          );

    return barbershopRepository.updateLocation({
      barbershopId: data.barbershopId,
      latitude: data.latitude,
      longitude: data.longitude,
      address: address ?? undefined,
    });
  },
};
