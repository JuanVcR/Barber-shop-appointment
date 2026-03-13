import type { BarbershopSettings, Booking, ConversationState  } from "../../types.js"; 


const barbershops: Map<string, BarbershopSettings> = new Map<string, BarbershopSettings>();
const bookings: Map<string, Booking> = new Map<string, Booking>();
const conversationStates: Map<string, ConversationState> = new Map<string, ConversationState>();

barbershops.set('barbearia-principal', {
    id: 'barbearia-principal',
    name: 'Barbearia Alpha',
    phoneOwner: '5581999999999',
    welcomeMessage:
      'Fala, meu amigo. Bem-vindo à Barbearia Alpha. Responda com:\n1 - Ver serviços\n2 - Agendar horário\n3 - Ver preços',
    pixKey: 'barbearia@pix.com',
    workingDays: ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'],
    workingHours: {
    start: '09:00',
    end: '19:00'
  },
    breakStart: '12:00',
  breakEnd: '13:00',
  intervalBetweenAppointments: 30,
  services: [
    {
      id: 'corte',
      name: 'Corte',
      price: 30,
      durationInMinutes: 40
    },
    {
      id: 'barba',
      name: 'Barba',
      price: 20,
      durationInMinutes: 30
    },
    {
      id: 'combo',
      name: 'Corte + Barba',
      price: 45,
      durationInMinutes: 70
    }
  ]
});
export const store = {
  getBarbershops: () => Array.from(barbershops.values()),
  getBarbershopById: (id: string) => barbershops.get(id),
  saveBarbershop: (settings: BarbershopSettings) => {
    barbershops.set(settings.id, settings);
    return settings;
  },
  getBookings: () => Array.from(bookings.values()),
  getBookingsByBarbershopId: (barbershopId: string) =>
    Array.from(bookings.values()).filter((b) => b.barbershopId === barbershopId),
  createBooking: (booking: Booking) => {
    bookings.set(booking.id, booking);
    return booking;
  },
  updateConversation: (phone: string, data: ConversationState) => {
    conversationStates.set(phone, data);
    return data;
  },
  getConversation: (phone: string) =>
    conversationStates.get(phone) ?? { step: 'Idle' as const },
  clearConversations: (phone: string) => { conversationStates.delete(phone);
  }  
}; 