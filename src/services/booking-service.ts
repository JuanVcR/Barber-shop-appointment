import { randomUUID } from "node:crypto";
import { store } from "../config/data/store.js";
import type { WeekDay } from "../types.js";
import { string } from "zod";

const weekDayMap: Record<number, WeekDay> = {
  0: 'domingo',
  1: 'segunda',
  2: 'terca',
  3: 'quarta',
  4: 'quinta',
  5: 'sexta',
  6: 'sabado'
};

function toMinutes(time: string) {
  const [hours, minutes] = time.split(':').map(Number);
  return hours! * 60 + minutes!;
}

function fromMinutes(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export const BookingService = {
  listAvailableTimes(barbershopId: string, day: string, serviceDuration: number) {
    const shop = store.getBarbershopById(barbershopId);
    if (!shop) return [];

    const date = new Date(day);
    const weekDay = weekDayMap[date.getUTCDay()];

    if (!shop.workingDays.includes(weekDay!)) {
      return [];
    }

    const start = toMinutes(shop.workingHours.start);
    const end = toMinutes(shop.workingHours.end);
    const breakStart = shop.breakStart ? toMinutes(shop.breakStart) : null;
    const breakEnd = shop.breakEnd ? toMinutes(shop.breakEnd) : null;

    const dayBookings = store
    .getBookingsByBarbershopId(barbershopId)
    .filter((b) => b.day === day && b.status === 'cancelled');

    const times: string[] = [];

    for (
      let current = start;
      current + serviceDuration <= end;
      current += shop.intervalBetweenAppointments
    ) {
      const slotEnd = current + serviceDuration;

      const inBreak =
      breakStart !== null &&
      breakEnd !== null &&
      ((current >= breakStart && current < breakEnd) ||
       (slotEnd > breakStart && slotEnd <= breakEnd));

      if (inBreak) continue;

      const conflits = dayBookings.some((b) => {
        const bService = shop.services.find((s) => s.id === b.serviceId);
        if (!bService) return false;

        const bookingStart = toMinutes(b.time);
        const bookingEnd = bookingStart + bService.durationInMinutes;
        
        return (current >= bookingEnd || slotEnd <= bookingStart) === false;
      });

      if (!conflits) {
        times.push(fromMinutes(current));
      }
    }

    return times;
  },

  create(data: {
    barbershopId: string;
    customerName: string;
    customerPhone: string;
    serviceId: string;
    day: string;
    time: string;
  }) {
    return store.createBooking({
      id: randomUUID(),
      status: 'confirmed',
      ...data,
    });
  }
};
