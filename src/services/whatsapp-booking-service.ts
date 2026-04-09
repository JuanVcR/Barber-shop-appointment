import { AppError } from '../errors/app-error.js';
import { conversationStore, type ConversationState } from '../bot/conversation-states.js';
import { bookingService } from './booking-service.js';
import { userRepository } from '../repositories/user-repository.js';
import { barberRepository } from '../repositories/barber-repository.js';
import { serviceRepository } from '../repositories/service-repository.js';

export const whatsappBookingService = {
  async startConversation(phone: string, barbershopId: string) {
    const services = await serviceRepository.findManyByBarbershopId(barbershopId);

    if (services.length === 0) {
      throw new AppError('Nenhum servico cadastrado para essa barbearia', 400);
    }

    conversationStore.set(phone, {
      step: 'awaiting_service',
      barbershopId,
    });

    const list = services
      .map(
        (service, index) =>
          `${index + 1}. ${service.name} - R$ ${service.price} - ${service.duration} min`
      )
      .join('\n');

    return `Escolha um servico:\n${list}`;
  },

  async handleServiceSelection(
    phone: string,
    text: string,
    state: ConversationState
  ) {
    const services = await serviceRepository.findManyByBarbershopId(state.barbershopId);
    const serviceIndex = Number(text) - 1;
    const service = services[serviceIndex];

    if (!service) {
      throw new AppError('Servico invalido. Escolha um numero da lista', 400);
    }

    conversationStore.set(phone, {
      ...state,
      step: 'awaiting_day',
      selectedServiceId: service.id,
    });

    return 'Agora envie a data no formato YYYY-MM-DD.';
  },

  async handleDaySelection(
    phone: string,
    text: string,
    state: ConversationState
  ) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      throw new AppError('Data invalida. Use o formato YYYY-MM-DD', 400);
    }

    const barber = await barberRepository.findFirstByBarbershopId(state.barbershopId);

    if (!barber) {
      throw new AppError('Nenhum profissional encontrado para essa barbearia', 400);
    }

    if (!state.selectedServiceId) {
      throw new AppError('Servico nao selecionado', 400);
    }

    const times = await bookingService.listAvailableTimes({
      barberId: barber.id,
      serviceId: state.selectedServiceId,
      day: text,
    });

    if (times.length === 0) {
      throw new AppError('Nao ha horarios disponiveis nessa data', 400);
    }

    conversationStore.set(phone, {
      ...state,
      step: 'awaiting_time',
      selectedDay: text,
      selectedBarberId: barber.id,
    });

    return `Horarios disponiveis:\n${times.join('\n')}\n\nEnvie um horario no formato HH:MM.`;
  },

  async handleTimeSelection(
    phone: string,
    text: string,
    state: ConversationState
  ) {
    if (!/^\d{2}:\d{2}$/.test(text)) {
      throw new AppError('Horario invalido. Use o formato HH:MM', 400);
    }

    const user = await userRepository.findByPhone(phone);

    if (!user) {
      conversationStore.clear(phone);
      throw new AppError('Usuario nao encontrado. Faca seu cadastro antes de agendar', 400);
    }

    if (!state.selectedServiceId || !state.selectedDay || !state.selectedBarberId) {
      conversationStore.clear(phone);
      throw new AppError('Nao foi possivel concluir o agendamento', 400);
    }

    const booking = await bookingService.create({
      userId: user.id,
      barberId: state.selectedBarberId,
      serviceId: state.selectedServiceId,
      barbershopId: state.barbershopId,
      day: state.selectedDay,
      time: text,
    });

    conversationStore.clear(phone);

    return `Agendamento confirmado para ${booking.day} as ${booking.time}.`;
  },
};
