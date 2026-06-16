import { beforeEach, describe, expect, it, vi } from 'vitest';

const barbershopRepository = vi.hoisted(() => ({
  findById: vi.fn(),
  findAdmin: vi.fn(),
  getReadiness: vi.fn(),
  update: vi.fn(),
}));

const serviceRepository = vi.hoisted(() => ({
  findByBarbershopId: vi.fn(),
}));

const barberRepository = vi.hoisted(() => ({
  findManyByBarbershopId: vi.fn(),
}));

const barberInviteRepository = vi.hoisted(() => ({
  findManyPendingByBarbershopId: vi.fn(),
}));

vi.mock('../repositories/barbershop-repository.js', () => ({
  barbershopRepository,
}));
vi.mock('../repositories/service-repository.js', () => ({ serviceRepository }));
vi.mock('../repositories/barber-repository.js', () => ({ barberRepository }));
vi.mock('../repositories/barber-invite-repository.js', () => ({
  barberInviteRepository,
}));
vi.mock('./auth-service.js', () => ({ authService: {} }));
vi.mock('./reverse-geocoding-service.js', () => ({
  reverseGeocodingService: {},
}));

describe('barbershop plan rules', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('blocks new services when the FREE plan limit is reached', async () => {
    barbershopRepository.findById.mockResolvedValue({
      id: 'shop-1',
      plan: 'FREE',
    });
    serviceRepository.findByBarbershopId.mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => ({ id: `service-${index}` }))
    );

    const { barbershopService } = await import('./barbershop-service.js');

    await expect(
      barbershopService.ensurePlanCapacity('shop-1', 'services')
    ).rejects.toThrow('Limite do plano FREE');
  });

  it('requires working hours, services and barbers before activation', async () => {
    barbershopRepository.findById.mockResolvedValue({
      id: 'shop-1',
      plan: 'FREE',
    });
    barbershopRepository.getReadiness.mockResolvedValue({
      workingHours: 6,
      services: 1,
      barbers: 0,
    });

    const { barbershopService } = await import('./barbershop-service.js');

    await expect(
      barbershopService.update({
        requester: { accountId: 'super-1', role: 'SUPER_ADMIN' },
        barbershopId: 'shop-1',
        setupCompleted: true,
      })
    ).rejects.toThrow('Para ativar');
  });
});
