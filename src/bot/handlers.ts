import { bookingService } from "../services/booking-service.js";

export async function handleIncomingText(
  phone: string,
  body: string,
  barbershopId: string
) {
  const text = body.toLocaleLowerCase().trim();
  if (text === 'menu') {
    return 'Servicos disponíveis:\n1. Corte\n2. Barba\n3. Corte + Barba\n\nResponda com o número do serviço para agendar.';
  }
  if (text === '1') {
    return 'Escolha um dia para o corte (formato YYYY-MM-DD):';
  }

  if (text.includes('-')) {
    return 'Escolha um horário para o corte (formato HH:MM):';
  }
  if (text.includes(':')) {
    const booking = await bookingService.create({
      userId: 'id-do-usuario',
      barberId: 'id-do-barbeiro',
      barbershopId,
      serviceId: 'corte',
      day: '2024-07-01',
      time: text, 
    });
    return `Agendamento confirmado para 
    ${booking.day} às 
    ${booking.time}. Obrigado!`;
  }

  return 'Digite "menu" para ver os serviços disponíveis.';
}