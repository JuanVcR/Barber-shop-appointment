import { addDays, format } from 'date-fns';
import { bookingRepository } from '../src/repositories/booking-repository.js';
import { notificationService } from '../src/services/notification-service.js';
import { prisma } from '../src/database/prisma.js';

const day = format(addDays(new Date(), 1), 'yyyy-MM-dd');
const bookings = await bookingRepository.findScheduledByDay(day);

for (const booking of bookings) {
  await notificationService.sendBookingEmail({
    to: booking.client.email,
    clientName: booking.client.name,
    barbershopName: booking.barbershop.name,
    barberName: booking.barber.name,
    day: booking.day,
    startTime: booking.startTime,
    services: booking.services.map((item) => item.service.name),
    event: 'REMINDER',
  });
}

console.log(`${bookings.length} lembrete(s) processado(s).`);
await prisma.$disconnect();
