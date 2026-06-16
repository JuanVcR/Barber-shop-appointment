import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../repositories/booking-repository.js', () => ({
  bookingRepository: {
    create: vi.fn(),
    createIfAvailable: vi.fn(),
    findByDay: vi.fn(),
    findByBarberDay: vi.fn(),
    updatePayment: vi.fn(),
  },
}));

vi.mock('../repositories/service-repository.js', () => ({
  serviceRepository: {
    findManyByIds: vi.fn(),
  },
}));

vi.mock('../repositories/barber-repository.js', () => ({
  barberRepository: {
    findById: vi.fn(),
    findByAccountId: vi.fn(),
    findAvailability: vi.fn(),
    findBlocksByBarberDay: vi.fn(),
  },
}));

vi.mock('../repositories/client-repository.js', () => ({
  clientRepository: {
    findByAccountId: vi.fn(),
    findByPhoneInBarbershop: vi.fn(),
    create: vi.fn(),
    linkToBarbershop: vi.fn(),
  },
}));

vi.mock('../repositories/barbershop-repository.js', () => ({
  barbershopRepository: {
    findWorkingHour: vi.fn(),
    findAdmin: vi.fn(),
  },
}));

describe('bookingService', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should create booking when the whole interval is free', async () => {
    const { bookingService } = await import('./booking-service.js');
    const { serviceRepository } = await import('../repositories/service-repository.js');
    const { barberRepository } = await import('../repositories/barber-repository.js');
    const { clientRepository } = await import('../repositories/client-repository.js');
    const { bookingRepository } = await import('../repositories/booking-repository.js');
    const { barbershopRepository } = await import('../repositories/barbershop-repository.js');

    vi.mocked(clientRepository.findByAccountId).mockResolvedValue({
      id: 'client-1',
      accountId: 'account-1',
    } as never);
    vi.mocked(serviceRepository.findManyByIds).mockResolvedValue([
      {
        id: 'service-1',
        barbershopId: 'shop-1',
        duration: 40,
        barbers: [{ barberId: 'barber-1' }],
      },
    ] as never);
    vi.mocked(barberRepository.findById).mockResolvedValue({
      id: 'barber-1',
      barbershopId: 'shop-1',
    } as never);
    vi.mocked(bookingRepository.findByBarberDay).mockResolvedValue([] as never);
    vi.mocked(barberRepository.findBlocksByBarberDay).mockResolvedValue([] as never);
    vi.mocked(barbershopRepository.findWorkingHour).mockResolvedValue({
      startTime: '08:00',
      endTime: '18:00',
    } as never);
    vi.mocked(bookingRepository.createIfAvailable).mockResolvedValue({
      id: 'booking-1',
      startTime: '10:00',
      endTime: '10:40',
      day: '2027-04-10',
    } as never);

    const result = await bookingService.create({
      accountId: 'account-1',
      barberId: 'barber-1',
      serviceIds: ['service-1'],
      barbershopId: 'shop-1',
      day: '2027-04-10',
      startTime: '10:00',
    });

    expect(result.id).toBe('booking-1');
    expect(bookingRepository.createIfAvailable).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: 'client-1',
        serviceIds: ['service-1'],
        startTime: '10:00',
        endTime: '10:40',
        totalDuration: 40,
      })
    );
  });

  it('should reject booking if intervals overlap', async () => {
    const { bookingService } = await import('./booking-service.js');
    const { serviceRepository } = await import('../repositories/service-repository.js');
    const { barberRepository } = await import('../repositories/barber-repository.js');
    const { clientRepository } = await import('../repositories/client-repository.js');
    const { bookingRepository } = await import('../repositories/booking-repository.js');
    const { barbershopRepository } = await import('../repositories/barbershop-repository.js');

    vi.mocked(clientRepository.findByAccountId).mockResolvedValue({
      id: 'client-1',
      accountId: 'account-1',
    } as never);
    vi.mocked(serviceRepository.findManyByIds).mockResolvedValue([
      {
        id: 'service-1',
        barbershopId: 'shop-1',
        duration: 20,
        barbers: [{ barberId: 'barber-1' }],
      },
    ] as never);
    vi.mocked(barberRepository.findById).mockResolvedValue({
      id: 'barber-1',
      barbershopId: 'shop-1',
    } as never);
    vi.mocked(bookingRepository.findByBarberDay).mockResolvedValue([
      { startTime: '09:00', endTime: '09:40' },
    ] as never);
    vi.mocked(barberRepository.findBlocksByBarberDay).mockResolvedValue([] as never);
    vi.mocked(barbershopRepository.findWorkingHour).mockResolvedValue({
      startTime: '08:00',
      endTime: '18:00',
    } as never);

    await expect(
      bookingService.create({
        accountId: 'account-1',
        barberId: 'barber-1',
        serviceIds: ['service-1'],
        barbershopId: 'shop-1',
        day: '2027-04-10',
        startTime: '09:20',
      })
    ).rejects.toThrow('Horario ja esta ocupado');
  });

  it('should reject booking if barber does not perform all services', async () => {
    const { bookingService } = await import('./booking-service.js');
    const { serviceRepository } = await import('../repositories/service-repository.js');
    const { barberRepository } = await import('../repositories/barber-repository.js');
    const { clientRepository } = await import('../repositories/client-repository.js');
    const { bookingRepository } = await import('../repositories/booking-repository.js');

    vi.mocked(clientRepository.findByAccountId).mockResolvedValue({
      id: 'client-1',
      accountId: 'account-1',
    } as never);
    vi.mocked(serviceRepository.findManyByIds).mockResolvedValue([
      {
        id: 'service-1',
        barbershopId: 'shop-1',
        duration: 40,
        barbers: [{ barberId: 'barber-2' }],
      },
    ] as never);
    vi.mocked(barberRepository.findById).mockResolvedValue({
      id: 'barber-1',
      barbershopId: 'shop-1',
    } as never);
    vi.mocked(bookingRepository.findByBarberDay).mockResolvedValue([] as never);

    await expect(
      bookingService.create({
        accountId: 'account-1',
        barberId: 'barber-1',
        serviceIds: ['service-1'],
        barbershopId: 'shop-1',
        day: '2027-04-10',
        startTime: '10:00',
      })
    ).rejects.toThrow('Este profissional nao atende todos os servicos');
  });

  it('should list available times by service duration and occupied intervals', async () => {
    const { bookingService } = await import('./booking-service.js');
    const { serviceRepository } = await import('../repositories/service-repository.js');
    const { barberRepository } = await import('../repositories/barber-repository.js');
    const { bookingRepository } = await import('../repositories/booking-repository.js');
    const { barbershopRepository } = await import('../repositories/barbershop-repository.js');

    vi.mocked(serviceRepository.findManyByIds).mockResolvedValue([
      {
        id: 'service-1',
        barbershopId: 'shop-1',
        duration: 20,
        barbers: [{ barberId: 'barber-1' }],
      },
    ] as never);
    vi.mocked(barberRepository.findById).mockResolvedValue({
      id: 'barber-1',
      barbershopId: 'shop-1',
    } as never);
    vi.mocked(bookingRepository.findByBarberDay).mockResolvedValue([
      { startTime: '09:00', endTime: '09:40' },
    ] as never);
    vi.mocked(barberRepository.findBlocksByBarberDay).mockResolvedValue([] as never);
    vi.mocked(barbershopRepository.findWorkingHour).mockResolvedValue({
      startTime: '08:00',
      endTime: '18:00',
    } as never);

    const result = await bookingService.listAvailableTimes({
      barberId: 'barber-1',
      serviceIds: ['service-1'],
      day: '2027-04-10',
    });

    expect(result).not.toContain('09:00');
    expect(result).not.toContain('09:20');
    expect(result).toContain('09:40');
  });
});
