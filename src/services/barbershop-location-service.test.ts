import { beforeEach, describe, expect, it, vi } from 'vitest';

const repositoryMocks = vi.hoisted(() => ({
  findById: vi.fn(),
  findAdmin: vi.fn(),
  updateLocation: vi.fn(),
}));

const reverseGeocodingMocks = vi.hoisted(() => ({
  getAddress: vi.fn(),
}));

vi.mock('../repositories/barbershop-repository.js', () => ({
  barbershopRepository: repositoryMocks,
}));

vi.mock('../repositories/service-repository.js', () => ({
  serviceRepository: {},
}));

vi.mock('./auth-service.js', () => ({
  authService: {},
}));

vi.mock('./reverse-geocoding-service.js', () => ({
  reverseGeocodingService: reverseGeocodingMocks,
}));

describe('barbershop location service', () => {
  beforeEach(() => {
    repositoryMocks.findById.mockReset();
    repositoryMocks.findAdmin.mockReset();
    repositoryMocks.updateLocation.mockReset();
    reverseGeocodingMocks.getAddress.mockReset();
  });

  it('saves coordinates and the reverse geocoded address', async () => {
    repositoryMocks.findById.mockResolvedValue({ id: 'shop-1' });
    reverseGeocodingMocks.getAddress.mockResolvedValue('Praca da Se, Sao Paulo');
    repositoryMocks.updateLocation.mockResolvedValue({
      id: 'shop-1',
      latitude: -23.5505,
      longitude: -46.6333,
      address: 'Praca da Se, Sao Paulo',
    });

    const { barbershopService } = await import('./barbershop-service.js');
    const result = await barbershopService.updateLocation({
      requester: { accountId: 'admin-1', role: 'SUPER_ADMIN' },
      barbershopId: 'shop-1',
      latitude: -23.5505,
      longitude: -46.6333,
    });

    expect(reverseGeocodingMocks.getAddress).toHaveBeenCalledWith(
      -23.5505,
      -46.6333
    );
    expect(repositoryMocks.updateLocation).toHaveBeenCalledWith({
      barbershopId: 'shop-1',
      latitude: -23.5505,
      longitude: -46.6333,
      address: 'Praca da Se, Sao Paulo',
    });
    expect(result.address).toBe('Praca da Se, Sao Paulo');
  });

  it('still saves coordinates when reverse geocoding is unavailable', async () => {
    repositoryMocks.findById.mockResolvedValue({ id: 'shop-1' });
    reverseGeocodingMocks.getAddress.mockResolvedValue(null);
    repositoryMocks.updateLocation.mockResolvedValue({
      id: 'shop-1',
      latitude: -8.0476,
      longitude: -34.877,
      address: 'Endereco informado no cadastro',
    });

    const { barbershopService } = await import('./barbershop-service.js');
    await barbershopService.updateLocation({
      requester: { accountId: 'admin-1', role: 'SUPER_ADMIN' },
      barbershopId: 'shop-1',
      latitude: -8.0476,
      longitude: -34.877,
    });

    expect(repositoryMocks.updateLocation).toHaveBeenCalledWith({
      barbershopId: 'shop-1',
      latitude: -8.0476,
      longitude: -34.877,
      address: undefined,
    });
  });
});
