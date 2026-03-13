import { store } from "../config/data/store.js";
import { BookingService } from "../services/booking-service.js";

const BARBERSHOP_ID = "barbearia-principal";

function listServiceText() {
  const barbershop = store.getBarbershopById(BARBERSHOP_ID);

  if (!barbershop) {
    return "Barbearia nao encontrada.";
  }

  return barbershop.services
    .map(
      (service, index) =>
        `${index + 1} - ${service.name} | R$ ${service.price} | ${service.durationInMinutes} min`,
    )
    .join("\n");
}

function parseDateInput(input: string) {
  const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);

  if (!match) {
    return null;
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

export async function handleIncomingText(phone: string, body: string) {
  const barbershop = store.getBarbershopById(BARBERSHOP_ID);

  if (!barbershop) {
    return "Barbearia nao encontrada.";
  }

  const text = body.trim().toLowerCase();
  const state = store.getConversation(phone);

  if (["oi", "ola", "bom dia", "boa tarde", "boa noite", "menu"].includes(text)) {
    store.clearConversations(phone);
    return barbershop.welcomeMessage;
  }

  if (text === "1" || text === "servicos") {
    return `Servicos disponiveis:\n${listServiceText()}`;
  }

  if (text === "2" || text === "agendar horario") {
    store.updateConversation(phone, { step: "Awaiting_Name" });
    return "Perfeito. Me diga seu nome para comecar o agendamento.";
  }

  if (text === "3" || text === "precos") {
    return `Precos dos servicos:\n${listServiceText()}`;
  }

  if (state.step === "Awaiting_Name") {
    store.updateConversation(phone, {
      ...state,
      step: "Awaiting_Service_Selection",
      customerName: body.trim(),
    });

    return `Prazer, ${body.trim()}. Escolha um servico pelo numero:\n${listServiceText()}`;
  }

  if (state.step === "Awaiting_Service_Selection") {
    const serviceIndex = Number.parseInt(text, 10) - 1;
    const service = barbershop.services[serviceIndex];

    if (!service) {
      return `Servico invalido. Escolha um servico da lista:\n${listServiceText()}`;
    }

    store.updateConversation(phone, {
      ...state,
      step: "Awaiting_Day",
      serviceId: service.id,
    });

    return "Otima escolha. Agora me diga o dia desejado no formato DD/MM/YYYY.";
  }

  if (state.step === "Awaiting_Day") {
    const parsedDay = parseDateInput(body);

    if (!parsedDay) {
      return "Data invalida. Use o formato DD/MM/YYYY.";
    }

    const selectedService = barbershop.services.find((service) => service.id === state.serviceId);
    const availableTimes = BookingService.listAvailableTimes(
      BARBERSHOP_ID,
      parsedDay,
      selectedService?.durationInMinutes ?? 0,
    );

    if (availableTimes.length === 0) {
      return "Nao ha horarios disponiveis para esse dia. Tente outra data.";
    }

    store.updateConversation(phone, {
      ...state,
      step: "Awaiting_Time",
      day: parsedDay,
    });

    return `Horarios disponiveis em ${body.trim()}:\n${availableTimes.join("\n")}\n\nResponda com um horario, por exemplo: 14:00`;
  }

  if (state.step === "Awaiting_Time") {
    if (!state.customerName || !state.serviceId || !state.day) {
      store.clearConversations(phone);
      return "Nao consegui continuar o agendamento. Digite menu e tente novamente.";
    }

    const selectedService = barbershop.services.find((service) => service.id === state.serviceId);
    const availableTimes = BookingService.listAvailableTimes(
      BARBERSHOP_ID,
      state.day,
      selectedService?.durationInMinutes ?? 0,
    );

    if (!availableTimes.includes(body.trim())) {
      return `Horario invalido. Escolha um destes horarios:\n${availableTimes.join("\n")}`;
    }

    BookingService.create({
      barbershopId: BARBERSHOP_ID,
      customerName: state.customerName,
      customerPhone: phone,
      serviceId: state.serviceId,
      day: state.day,
      time: body.trim(),
    });

    store.clearConversations(phone);
    return "Agendamento confirmado com sucesso.";
  }

  return 'Nao entendi. Digite "menu" para ver as opcoes.';
}