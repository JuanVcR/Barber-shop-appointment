import { store } from "../config/data/store.js";
import { BookingService } from "../services/booking-service.js";

const BARBERSHOP_ID = 'barbearia-principal';

function listServiceText() {
  const barbershop = store.getBarbershopById(BARBERSHOP_ID);

  if (!barbershop) {
    return 'Barbearia não encontrada.';
  }
    return barbershop.services
    .map((service, index) => `${index + 1} - ${service.name} | R$ ${service.price} | ${service.durationInMinutes} min`
    )
    .join('\n');
  }

  export async function handleIncomingText(phone: string, body: string) {
    const barbershop = store.getBarbershopById(BARBERSHOP_ID);

    if (!barbershop) {
      return 'Barbearia não encontrada.';
    }

    const text = body.trim().toLowerCase();
    const state = store.getConversation(phone);

    if (['oi', 'olá', 'ola', 'bom dia', 'boa tarde', 'boa noite', 'menu'].includes(text)) {
      store.clearConversations(phone);
      return barbershop.welcomeMessage;
    }

    if (state.step === 'Awaiting_Name') {
      store.updateConversation(phone, { ...state, step: 'Awaiting_Service_Selection', 
        customerName: body.trim() });
    }

    if (text === '1' || text === 'Services') {
      return 'servicos disponiveis:\n${listServiceText()}';
    }

    if (text === '2' || text === 'Preços') {
      return 'Preços dos serviços:\n${listServiceText()}';
    }

    if (state.step === 'Awaiting_Service_Selection') {
      const serviceIndex = parseInt(text) - 1;
      const service = barbershop.services[serviceIndex];

      if (!service) {
        return 'Serviço inválido. Por favor, escolha um serviço da lista:\n${listServiceText()}';
      }

    if (text === '3' || text === 'Agendar horário') {
      store.updateConversation(phone, { step: 'Awaiting_Service_Selection' })
      return 'Perfeito. Me diga seu nome para começar o agendamento:\n${listServiceText()}';
    }

    store.updateConversation(phone, {
       ...state, step: 'Awaiting_Day', 
       serviceId: service.id });
    return 'Ótima escolha! Agora me diga o dia que você gostaria de agendar (formato: DD/MM/YYYY):';
  }

    const availableTimes = BookingService.listAvailableTimes(
      BARBERSHOP_ID,
      body.trim(),
      barbershop.services.find((s) => s.id === state.serviceId)?.durationInMinutes || 0
    );
}