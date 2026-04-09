import { AppError } from '../errors/app-error.js';
import { bookingRepository } from '../repositories/booking-repository.js';
import { serviceRepository } from '../repositories/service-repository.js';
import { barberRepository } from '../repositories/barber-repository.js';
import { isValidDay, isValidTime } from '../utils/datetime.js';

export const bookingService = {
  async create(data: {
    userId: string;
    barberId: string;
    serviceId: string;
    barbershopId: string;
    day: string;
    time: string;
  }) {
    if (!isValidDay(data.day)) {
      throw new AppError('Data invalida', 400);
    }

    if (!isValidTime(data.time)) {
      throw new AppError('Horario invalido', 400);
    }

    const service = await serviceRepository.findById(data.serviceId);
    const barber = await barberRepository.findById(data.barberId);

    if (!service) {
      throw new AppError('Servico nao encontrado', 400);
    }

    if (!barber) {
      throw new AppError('Profissional nao encontrado', 400);
    }

    if (service.barbershopId !== data.barbershopId || barber.barbershopId !== data.barbershopId) {
      throw new AppError('Servico ou profissional nao pertencem a esta barbearia', 400);
    }

    const professionalCanDoService = service.barbers.some(
      (item) => item.barberId === data.barberId
    );

    if (!professionalCanDoService) {
      throw new AppError('Este profissional nao atende este servico', 400);
    }

    const existing = await bookingRepository.findByBarberDay(data.barberId, data.day);
    const hasConflict = existing.some((item) => item.time === data.time);

    if (hasConflict) {
      throw new AppError('Horario ja esta ocupado', 400);
    }

    return bookingRepository.create(data);
  },

  async listByDay(barbershopId: string, day: string) {
    if (!isValidDay(day)) {
      throw new AppError('Data invalida', 400);
    }

    return bookingRepository.findByDay(barbershopId, day);
  },

  async listAvailableTimes(data: {
    barberId: string;
    serviceId: string;
    day: string;
  }) {
    if (!isValidDay(data.day)) {
      throw new AppError('Data invalida', 400);
    }

    const service = await serviceRepository.findById(data.serviceId);
    const barber = await barberRepository.findById(data.barberId);

    if (!service) {
      throw new AppError('Servico nao encontrado', 400);
    }

    if (!barber) {
      throw new AppError('Profissional nao encontrado', 400);
    }

    const professionalCanDoService = service.barbers.some(
      (item) => item.barberId === data.barberId
    );

    if (!professionalCanDoService) {
      throw new AppError('Este profissional nao atende este servico', 400);
    }

    const existing = await bookingRepository.findByBarberDay(data.barberId, data.day);
    const booked = new Set(existing.map((item) => item.time));

    const allTimes = [
      '09:00',
      '10:00',
      '11:00',
      '14:00',
      '15:00',
      '16:00',
      '17:00',
    ];

    return allTimes.filter((time) => !booked.has(time));
  },
};
