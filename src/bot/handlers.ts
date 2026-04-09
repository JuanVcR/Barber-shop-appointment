import { AppError } from "../errors/app-error.js";
import { conversationStore } from "./conversation-states.js";
import { whatsappBookingService } from "../services/whatsapp-booking-service.js";

export async function handleIncomingText(
  phone: string,
  body: string,
  barbershopId: string
) {
  const text = body.trim().toLowerCase();
  const state = conversationStore.get(phone);

 try {
    if (text === 'oi' || text === 'menu') {
      return await whatsappBookingService.startConversation(phone, barbershopId);
    }

    if (state?.step === 'awaiting_service') {
      return await whatsappBookingService.handleServiceSelection(phone, text, state);
    }

    if (state?.step === 'awaiting_day') {
      return await whatsappBookingService.handleDaySelection(phone, text, state);
    }

    if (state?.step === 'awaiting_time') {
      return await whatsappBookingService.handleTimeSelection(phone, text, state);
    }

    return 'Digite "oi" ou "menu" para iniciar seu agendamento.';
  } catch (error) {
    if (error instanceof AppError) {
      return error.message;
    }

    return 'Ocorreu um erro ao processar sua mensagem.';
  }
}