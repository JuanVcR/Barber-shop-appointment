import { AppError } from '../errors/app-error.js';
import { notificationService } from './notification-service.js';
import { bookingRepository } from '../repositories/booking-repository.js';
import { serviceRepository } from '../repositories/service-repository.js';
import { barberRepository } from '../repositories/barber-repository.js';
import { clientRepository } from '../repositories/client-repository.js';
import { barbershopRepository } from '../repositories/barbershop-repository.js';
import { addDaysToDay, addMinutesToTime, getWeekDayFromDay, intervalsOverlap, isValidDay, isValidTime, minutesToTime, timeToMinutes} from '../utils/datetime.js';

async function ensureCanAccessBooking(data: {
  accountId: string;
  role: string;
  booking: NonNullable<Awaited<ReturnType<typeof bookingRepository.findById>>>;
}) {
  const isClientOwner = data.booking.client.accountId === data.accountId;
  const isBarberOwner = data.booking.barber.accountId === data.accountId;
  const isSuperAdmin = data.role === 'SUPER_ADMIN';

  if (isClientOwner || isBarberOwner || isSuperAdmin) {
    return;
  }

  const admin = await barbershopRepository.findAdmin(
    data.booking.barbershopId,
    data.accountId
  );

  if (!admin) {
    throw new AppError('Acesso negado', 403);
  }
}

async function ensureCanManageBarber(data: {
  accountId: string;
  role: string;
  barberId: string;
  barbershopId: string;
}) {
  if (!['BARBER', 'BARBERSHOP_ADMIN', 'SUPER_ADMIN'].includes(data.role)) {
    throw new AppError('Perfil sem permissao para cadastrar atendimento', 403);
  }

  const barber = await barberRepository.findById(data.barberId);

  if (!barber || barber.barbershopId !== data.barbershopId) {
    throw new AppError('Barbeiro nao pertence a esta barbearia', 400);
  }

  if (data.role === 'BARBER' && barber.accountId !== data.accountId) {
    throw new AppError('Barbeiro so pode cadastrar atendimento para si mesmo', 403);
  }

  if (data.role === 'BARBERSHOP_ADMIN') {
    const admin = await barbershopRepository.findAdmin(
      data.barbershopId,
      data.accountId
    );

    if (!admin) {
      throw new AppError('Administrador nao pertence a esta barbearia', 403);
    }
  }
}

async function findBookingWindow(data: {
  barberId: string;
  barbershopId: string;
  serviceIds: string[];
  day: string;
  startTime: string;
  ignoreBookingId?: string;
}) {
  if (!isValidDay(data.day)) {
    throw new AppError('Data invalida', 400);
  }

  if (!isValidTime(data.startTime)) {
    throw new AppError('Horario invalido', 400);
  }

  const startsAt = new Date(`${data.day}T${data.startTime}:00`);

  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
    throw new AppError('Nao e possivel agendar em data ou horario passado', 400);
  }

  if (!data.serviceIds.length) {
    throw new AppError('Informe ao menos um servico', 400);
  }

  const services = await serviceRepository.findManyByIds(data.serviceIds);
  const barber = await barberRepository.findById(data.barberId);

  if (services.length !== data.serviceIds.length) {
    throw new AppError('Servico nao encontrado', 400);
  }

  if (!barber) {
    throw new AppError('Profissional nao encontrado', 400);
  }

  const belongsToBarbershop = services.every(
    (service) => service.barbershopId === data.barbershopId
  );

  if (!belongsToBarbershop || barber.barbershopId !== data.barbershopId) {
    throw new AppError('Servico ou profissional nao pertencem a esta barbearia', 400);
  }

  const professionalCanDoServices = services.every((service) =>
    service.barbers.some((item) => item.barberId === data.barberId)
  );

  if (!professionalCanDoServices) {
    throw new AppError('Este profissional nao atende todos os servicos', 400);
  }

  const totalDuration = services.reduce((total, service) => total + service.duration, 0);
  const endTime = addMinutesToTime(data.startTime, totalDuration);
  const weekDay = getWeekDayFromDay(data.day);
  const barbershopWorkingHour = await barbershopRepository.findWorkingHour(
    data.barbershopId,
    weekDay
  );
  const barberAvailability = await barberRepository.findAvailability(data.barberId, weekDay);
  const workingHour = barberAvailability ?? barbershopWorkingHour;

  if (!workingHour) {
    throw new AppError('Profissional indisponivel neste dia', 400);
  }

  if (
    timeToMinutes(data.startTime) < timeToMinutes(workingHour.startTime)
    || timeToMinutes(endTime) > timeToMinutes(workingHour.endTime)
  ) {
    throw new AppError('Horario fora do expediente', 400);
  }

  const existing = await bookingRepository.findByBarberDay(
  data.barberId,
  data.day,
  data.ignoreBookingId
);
  const hasConflict = existing.some((item) =>
    intervalsOverlap(data.startTime, endTime, item.startTime, item.endTime)
  );

  if (hasConflict) {
    throw new AppError('Horario ja esta ocupado', 400);
  }

  const blocks = await barberRepository.findBlocksByBarberDay(data.barberId, data.day);
  const hasBlock = blocks.some((block) => {
    if (!block.startTime || !block.endTime) {
      return true;
    }

    return intervalsOverlap(data.startTime, endTime, block.startTime, block.endTime);
  });

  if (hasBlock) {
    throw new AppError('Profissional bloqueado neste horario', 400);
  }

  return {
    endTime,
    totalDuration,
  };
}

export const bookingService = {
  async create(data: {
    accountId: string;
    barberId: string;
    serviceIds: string[];
    barbershopId: string;
    day: string;
    startTime: string;
  }) {
    const client = await clientRepository.findByAccountId(data.accountId);

    if (!client) {
      throw new AppError('Cliente nao encontrado para esta conta', 400);
    }

    const { endTime, totalDuration } = await findBookingWindow(data);

    const booking = await bookingRepository.createIfAvailable({
      clientId: client.id,
      barberId: data.barberId,
      serviceIds: data.serviceIds,
      barbershopId: data.barbershopId,
      day: data.day,
      startTime: data.startTime,
      endTime,
      totalDuration,
    });

    if (!booking) {
      throw new AppError('Horario ja esta ocupado', 409);
    }

    await clientRepository.linkToBarbershop({
      clientId: client.id,
      barbershopId: data.barbershopId,
    });

    if (booking.client && booking.barbershop && booking.barber && booking.services) void notificationService.sendBookingEmail({
      to: booking.client.email,
      clientName: booking.client.name,
      barbershopName: booking.barbershop.name,
      barberName: booking.barber.name,
      day: booking.day,
      startTime: booking.startTime,
      services: booking.services.map((item) => item.service.name),
      event: 'CREATED',
    }).catch(() => undefined);

    return booking;
  },

  async createGuest(data: {
    client: {
      name: string;
      phone: string;
      email?: string | null;
    };
    barberId: string;
    serviceIds: string[];
    barbershopId: string;
    day: string;
    startTime: string;
  }) {
    const { endTime, totalDuration } = await findBookingWindow(data);
    const existingClient = await clientRepository.findByPhoneInBarbershop(
      data.client.phone,
      data.barbershopId
    );
    const client = existingClient
      ? await clientRepository.update(existingClient.id, {
          name: data.client.name,
          email: data.client.email ?? existingClient.email,
        })
      : await clientRepository.create({
          name: data.client.name,
          phone: data.client.phone,
          email: data.client.email,
        });

    await clientRepository.linkToBarbershop({
      clientId: client.id,
      barbershopId: data.barbershopId,
    });

    const booking = await bookingRepository.createIfAvailable({
      clientId: client.id,
      barberId: data.barberId,
      serviceIds: data.serviceIds,
      barbershopId: data.barbershopId,
      day: data.day,
      startTime: data.startTime,
      endTime,
      totalDuration,
    });

    if (!booking) {
      throw new AppError('Horario ja esta ocupado', 409);
    }

    if (booking.client && booking.barbershop && booking.barber && booking.services) void notificationService.sendBookingEmail({
      to: booking.client.email,
      clientName: booking.client.name,
      barbershopName: booking.barbershop.name,
      barberName: booking.barber.name,
      day: booking.day,
      startTime: booking.startTime,
      services: booking.services.map((item) => item.service.name),
      event: 'CREATED',
    }).catch(() => undefined);

    return booking;
  },

  async createQuick(data: {
    accountId: string;
    role: string;
    client: {
      name: string;
      phone: string;
      email?: string | null;
    };
    barberId: string;
    serviceIds: string[];
    barbershopId: string;
    day: string;
    startTime: string;
  }) {
    await ensureCanManageBarber(data);

    return this.createGuest({
      client: data.client,
      barberId: data.barberId,
      serviceIds: data.serviceIds,
      barbershopId: data.barbershopId,
      day: data.day,
      startTime: data.startTime,
    });
  },

  async listByDay(barbershopId: string, day: string) {
    if (!isValidDay(day)) {
      throw new AppError('Data invalida', 400);
    }

    return bookingRepository.findByDay(barbershopId, day);
  },

  async listByDayForRequester(data: {
    accountId: string;
    role: string;
    barbershopId: string;
    day: string;
  }) {
    if (data.role === 'BARBERSHOP_ADMIN') {
      const admin = await barbershopRepository.findAdmin(
        data.barbershopId,
        data.accountId
      );

      if (!admin) {
        throw new AppError('Administrador nao pertence a esta barbearia', 403);
      }
    } else if (data.role !== 'SUPER_ADMIN') {
      throw new AppError('Perfil sem permissao para ver agenda da barbearia', 403);
    }

    return this.listByDay(data.barbershopId, data.day);
  },

  async listWeekForRequester(data: {
    accountId: string;
    role: string;
    startDay: string;
    barbershopId?: string;
  }) {
    if (!isValidDay(data.startDay)) {
      throw new AppError('Data inicial invalida', 400);
    }

    const endDay = addDaysToDay(data.startDay, 6);

    if (data.role === 'BARBER') {
      const barber = await barberRepository.findByAccountId(data.accountId);

      if (!barber) {
        throw new AppError('Barbeiro nao encontrado para esta conta', 404);
      }

      const bookings = await bookingRepository.findByBarberRange(
        barber.id,
        data.startDay,
        endDay
      );

      return { startDay: data.startDay, endDay, bookings };
    }

    if (!data.barbershopId) {
      throw new AppError('Informe a barbearia', 400);
    }

    if (data.role === 'BARBERSHOP_ADMIN') {
      const admin = await barbershopRepository.findAdmin(
        data.barbershopId,
        data.accountId
      );

      if (!admin) {
        throw new AppError('Administrador nao pertence a esta barbearia', 403);
      }
    } else if (data.role !== 'SUPER_ADMIN') {
      throw new AppError('Perfil sem permissao para ver agenda semanal', 403);
    }

    const bookings = await bookingRepository.findByBarbershopRange(
      data.barbershopId,
      data.startDay,
      endDay
    );

    return { startDay: data.startDay, endDay, bookings };
  },

  async listForRequester(data: {
    accountId: string;
    role: string;
    day?: string;
  }) {
    if (data.role === 'CLIENT') {
      const client = await clientRepository.findByAccountId(data.accountId);

      if (!client) {
        throw new AppError('Cliente nao encontrado para esta conta', 400);
      }

      return bookingRepository.findByClient(client.id);
    }

    if (data.role === 'BARBER') {
      const barber = await barberRepository.findByAccountId(data.accountId);

      if (!barber) {
        throw new AppError('Barbeiro nao encontrado para esta conta', 400);
      }

      return bookingRepository.findByBarber(barber.id, data.day);
    }

    throw new AppError('Use a rota de agenda da barbearia para administradores', 400);
  },

  async listAvailableTimes(data: {
    barberId: string;
    serviceIds: string[];
    day: string;
  }) {
    if (!isValidDay(data.day)) {
      throw new AppError('Data invalida', 400);
    }

    if (!data.serviceIds.length) {
      throw new AppError('Informe ao menos um servico', 400);
    }

    const services = await serviceRepository.findManyByIds(data.serviceIds);
    const barber = await barberRepository.findById(data.barberId);

    if (services.length !== data.serviceIds.length) {
      throw new AppError('Servico nao encontrado', 400);
    }

    if (!barber) {
      throw new AppError('Profissional nao encontrado', 400);
    }

    const professionalCanDoServices = services.every((service) =>
      service.barbers.some((item) => item.barberId === data.barberId)
    );

    if (!professionalCanDoServices) {
      throw new AppError('Este profissional nao atende todos os servicos', 400);
    }

    const existing = await bookingRepository.findByBarberDay(data.barberId, data.day);
    const totalDuration = services.reduce((total, service) => total + service.duration, 0);
    const shortestServiceDuration = Math.min(...services.map((service) => service.duration));
    const step = Math.max(5, shortestServiceDuration);
    const barbershopWorkingHour = await barbershopRepository.findWorkingHour(
      barber.barbershopId,
      getWeekDayFromDay(data.day)
    );
    const barberAvailability = await barberRepository.findAvailability(
      data.barberId,
      getWeekDayFromDay(data.day)
    );
    const workingHour = barberAvailability ?? barbershopWorkingHour;
    const times: string[] = [];
    const blocks = await barberRepository.findBlocksByBarberDay(data.barberId, data.day);
    const hasFullDayBlock = blocks.some((block) => !block.startTime || !block.endTime);

    if (!workingHour) {
      return times;
    }

    if (hasFullDayBlock) {
      return times;
    }

    for (
      let start = timeToMinutes(workingHour.startTime);
      start + totalDuration <= timeToMinutes(workingHour.endTime);
      start += step
    ) {
      const startTime = minutesToTime(start);
      const endTime = minutesToTime(start + totalDuration);
      const startsAt = new Date(`${data.day}T${startTime}:00`);

      if (startsAt <= new Date()) {
        continue;
      }

      const hasConflict = existing.some((item) =>
        intervalsOverlap(startTime, endTime, item.startTime, item.endTime)
      );
      const hasBlock = blocks.some((block) => {
        if (!block.startTime || !block.endTime) {
          return true;
        }

        return intervalsOverlap(startTime, endTime, block.startTime, block.endTime);
      });

      if (!hasConflict && !hasBlock) {
        times.push(startTime);
      }
    }

    return times;
  },

  async registerPayment(data: {
    accountId: string;
    role: string;
    bookingId: string;
    paymentMethod: 'DEBIT' | 'CREDIT' | 'PIX' | 'CASH';
    amountPaid: number;
  }) {
    if (!['BARBER', 'BARBERSHOP_ADMIN', 'SUPER_ADMIN'].includes(data.role)) {
      throw new AppError('Perfil sem permissao para registrar pagamento', 403);
    }

    const booking = await bookingRepository.findById(data.bookingId);

    if (!booking) {
      throw new AppError('Agendamento nao encontrado', 404);
    }

    await ensureCanAccessBooking({
      accountId: data.accountId,
      role: data.role,
      booking,
    });

    return bookingRepository.updatePayment({
      bookingId: data.bookingId,
      paymentMethod: data.paymentMethod,
      amountPaid: data.amountPaid,
    });
  },

  async updateStatus(data: {
    accountId: string;
    role: string;
    bookingId: string;
    status: 'SCHEDULED' | 'CANCELLED' | 'COMPLETED';
    cancellationReason?: string;
  }) {
    const booking = await bookingRepository.findById(data.bookingId);

    if (!booking) {
      throw new AppError('Agendamento nao encontrado', 404);
    }

    await ensureCanAccessBooking({ accountId: data.accountId, role: data.role, booking });
    const isClientOwner = booking.client.accountId === data.accountId;

    if (booking.status !== 'SCHEDULED') {
      throw new AppError('Agendamento finalizado nao pode mudar de status', 400);
    }

    if (data.status === 'SCHEDULED') {
      throw new AppError('Agendamento ja esta agendado', 400);
    }

    if (data.status === 'COMPLETED' && isClientOwner) {
      throw new AppError('Cliente nao pode concluir agendamento', 403);
    }

    const updated = await bookingRepository.updateStatus({
      bookingId: data.bookingId,
      status: data.status,
      cancellationReason: data.cancellationReason,
    });

    if (data.status === 'CANCELLED') {
      void notificationService.sendBookingEmail({
        to: updated.client.email,
        clientName: updated.client.name,
        barbershopName: updated.barbershop.name,
        barberName: updated.barber.name,
        day: updated.day,
        startTime: updated.startTime,
        services: updated.services.map((item) => item.service.name),
        event: 'CANCELLED',
      }).catch(() => undefined);
    }

    return updated;
  },

  async updateServices(data: {
    accountId: string;
    role: string;
    bookingId: string;
    serviceIds: string[];
  }) {
    if (!['BARBER', 'BARBERSHOP_ADMIN', 'SUPER_ADMIN'].includes(data.role)) {
      throw new AppError('Perfil sem permissao para alterar servicos', 403);
    }

    if (!data.serviceIds.length) {
      throw new AppError('Informe ao menos um servico', 400);
    }

    const booking = await bookingRepository.findById(data.bookingId);

    if (!booking) {
      throw new AppError('Agendamento nao encontrado', 404);
    }

    if (booking.status !== 'SCHEDULED') {
      throw new AppError('Servicos so podem ser alterados antes da conclusao', 400);
    }

    await ensureCanAccessBooking({
      accountId: data.accountId,
      role: data.role,
      booking,
    });

    const services = await serviceRepository.findManyByIds(data.serviceIds);

    if (
      services.length !== data.serviceIds.length ||
      services.some((service) => service.barbershopId !== booking.barbershopId)
    ) {
      throw new AppError('Servico nao pertence a esta barbearia', 400);
    }

    const canPerformAll = services.every((service) =>
      service.barbers.some((item) => item.barberId === booking.barberId)
    );

    if (!canPerformAll) {
      throw new AppError('O barbeiro nao atende todos os servicos selecionados', 400);
    }

    const totalDuration = services.reduce(
      (total, service) => total + service.duration,
      0
    );

    return bookingRepository.replaceServices({
      bookingId: booking.id,
      serviceIds: data.serviceIds,
      totalDuration,
      endTime: addMinutesToTime(booking.startTime, totalDuration),
    });
  },

  async cancel(data: {
    accountId: string;
    role: string;
    bookingId: string;
    cancellationReason?: string;
  }) {
    const booking = await bookingRepository.findById(data.bookingId);

    if (!booking) {
      throw new AppError('Agendamento nao encontrado', 404);
    }

    if (booking.status === 'CANCELLED') {
      throw new AppError('Agendamento ja esta cancelado', 400);
    }

    if (booking.status === 'COMPLETED') {
      throw new AppError('Agendamento concluido nao pode ser cancelado', 400);
    }

    await ensureCanAccessBooking({ accountId: data.accountId, role: data.role, booking });

    const cancelled = await bookingRepository.cancel({
      bookingId: data.bookingId,
      cancellationReason: data.cancellationReason,
    });

    void notificationService.sendBookingEmail({
      to: cancelled.client.email,
      clientName: cancelled.client.name,
      barbershopName: cancelled.barbershop.name,
      barberName: cancelled.barber.name,
      day: cancelled.day,
      startTime: cancelled.startTime,
      services: cancelled.services.map((item) => item.service.name),
      event: 'CANCELLED',
    }).catch(() => undefined);

    return cancelled;
  },

  async reschedule(data: {
    accountId: string;
    role: string;
    bookingId: string;
    day: string;
    startTime: string;
    ignoreBookingId?: string;
  }) {
    const booking = await bookingRepository.findById(data.bookingId);

    if (!booking) {
      throw new AppError('Agendamento nao encontrado', 404);
    }

    if (booking.status !== 'SCHEDULED') {
      throw new AppError('Apenas agendamentos ativos podem ser reagendados', 400);
    }

    await ensureCanAccessBooking({ accountId: data.accountId, role: data.role, booking });

    const serviceIds = booking.services.map((item) => item.serviceId);

    const { endTime, totalDuration } = await findBookingWindow({
      barberId: booking.barberId,
      barbershopId: booking.barbershopId,
      serviceIds,
      day: data.day,
      startTime: data.startTime,
      ignoreBookingId: booking.id,
    });

    const updated = await bookingRepository.updateSchedule({
      bookingId: data.bookingId,
      day: data.day,
      startTime: data.startTime,
      endTime,
      totalDuration,
    });

    void notificationService.sendBookingEmail({
      to: updated.client.email,
      clientName: updated.client.name,
      barbershopName: updated.barbershop.name,
      barberName: updated.barber.name,
      day: updated.day,
      startTime: updated.startTime,
      services: updated.services.map((item) => item.service.name),
      event: 'RESCHEDULED',
    }).catch(() => undefined);

    return updated;
  },

  async getById(data: {
    requester: {
      accountId: string;
      role: string;
    };
    bookingId: string;
  }) {
    const booking = await bookingRepository.findById(data.bookingId);

    if (!booking) {
      throw new AppError('Agendamento nao encontrado', 404);
    }

    await ensureCanAccessBooking({
      accountId: data.requester.accountId,
      role: data.requester.role,
      booking,
    });

    return booking;
  },
};
