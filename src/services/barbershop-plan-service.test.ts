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

  it('blocks new barbers when the initial plan already has one professional', async () => {
    barbershopRepository.findById.mockResolvedValue({
      id: 'shop-1',
      plan: 'FREE',
    });
    barberRepository.findManyByBarbershopId.mockResolvedValue([{ id: 'barber-1' }]);
    barberInviteRepository.findManyPendingByBarbershopId.mockResolvedValue([]);

    const { barbershopService } = await import('./barbershop-service.js');

    await expect(
      barbershopService.ensurePlanCapacity('shop-1', 'barbers')
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

  it('prevents a barbershop admin from changing the plan without paying', async () => {
    barbershopRepository.findAdmin.mockResolvedValue({ id: 'admin-link-1' });

    const { barbershopService } = await import('./barbershop-service.js');

    await expect(
      barbershopService.update({
        requester: { accountId: 'admin-1', role: 'BARBERSHOP_ADMIN' },
        barbershopId: 'shop-1',
        plan: 'PRO',
      })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(barbershopRepository.update).not.toHaveBeenCalled();
  });

  it('lets a super admin change the plan', async () => {
    barbershopRepository.findById.mockResolvedValue({ id: 'shop-1', plan: 'FREE' });
    serviceRepository.findByBarbershopId.mockResolvedValue([]);
    barberRepository.findManyByBarbershopId.mockResolvedValue([]);
    barberInviteRepository.findManyPendingByBarbershopId.mockResolvedValue([]);
    barbershopRepository.update.mockResolvedValue({ id: 'shop-1', plan: 'PRO' });

    const { barbershopService } = await import('./barbershop-service.js');

    await barbershopService.update({
      requester: { accountId: 'super-1', role: 'SUPER_ADMIN' },
      barbershopId: 'shop-1',
      plan: 'PRO',
    });

    expect(barbershopRepository.update).toHaveBeenCalledWith(
      'shop-1',
      expect.objectContaining({ plan: 'PRO' })
    );
  });
});
