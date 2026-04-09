import { AppError } from '../errors/app-error.js';
import { barbershopRepository } from '../repositories/barbershop-repository.js';

export const barbershopService = {
  async list() {
    return barbershopRepository.findMany();
  },

  async getBySlug(slug: string) {
    const barbershop = await barbershopRepository.findBySlug(slug);

    if (!barbershop) {
      throw new AppError('Barbearia nao encontrada', 404);
    }

    return barbershop;
  },
};
