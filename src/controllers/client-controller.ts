import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { AppError } from '../errors/app-error.js';
import { clientRepository } from '../repositories/client-repository.js';
import { prisma } from '../database/prisma.js';

const updateClientSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().min(11).optional(),
  cpf: z.string().min(11).optional(),
  email: z.string().email().toLowerCase().optional(),
});

const getRequester = (req: FastifyRequest) => ({
  accountId: req.user!.id,
  role: req.user!.role,
});

export const clientController = {
  async getProfile(req: FastifyRequest, reply: FastifyReply) {
    const { accountId } = getRequester(req);
    const client = await clientRepository.findByAccountId(accountId);

    if (!client) {
      throw new AppError('Perfil de cliente não encontrado', 404);
    }

    return reply.send({
      id: client.id,
      name: client.name,
      phone: client.phone,
      cpf: client.cpf,
      email: client.email,
      createdAt: client.createdAt,
    });
  },

  async updateProfile(req: FastifyRequest, reply: FastifyReply) {
    const body = updateClientSchema.parse(req.body);

    const { accountId } = getRequester(req);
    const client = await clientRepository.findByAccountId(accountId);

    if (!client) {
      throw new AppError('Perfil de cliente não encontrado', 404);
    }

    if (body.email) {
      const existingAccount = await prisma.account.findUnique({
        where: { email: body.email },
      });

      if (existingAccount && existingAccount.id !== accountId) {
        throw new AppError('Email ja cadastrado', 400);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (body.email) {
        await tx.account.update({
          where: { id: accountId },
          data: { email: body.email },
        });
      }

      return tx.client.update({
        where: { id: client.id },
        data: body,
      });
    });

    return reply.send(updated);
  },

  async getFavoriteBarbershops(req: FastifyRequest, reply: FastifyReply) {
    const { accountId } = getRequester(req);
    const client = await clientRepository.findByAccountId(accountId);

    if (!client) {
      throw new AppError('Cliente não encontrado', 404);
    }

    const favorites = await prisma.clientBarbershop.findMany({
      where: { clientId: client.id },
      include: { barbershop: true },
    });

    return reply.send(favorites.map(f => ({
      id: f.barbershop.id,
      name: f.barbershop.name,
      slug: f.barbershop.slug,
      address: f.barbershop.address,
      phone: f.barbershop.phoneOwner,
      addedAt: f.createdAt,
    })));
  },

  async addFavoriteBarbershop(
    req: FastifyRequest<{ Params: { barbershopId: string } }>,
    reply: FastifyReply
  ) {
    const { barbershopId } = req.params;

    const { accountId } = getRequester(req);
    const client = await clientRepository.findByAccountId(accountId);

    if (!client) {
      throw new AppError('Cliente não encontrado', 404);
    }

    const barbershop = await prisma.barbershop.findUnique({
      where: { id: barbershopId }
    });

    if (!barbershop) {
      throw new AppError('Barbearia não encontrada', 404);
    }

    const alreadyFavorited = await prisma.clientBarbershop.findUnique({
      where: {
        clientId_barbershopId: {
          clientId: client.id,
          barbershopId,
        }
      }
    });

    if (alreadyFavorited) {
      throw new AppError('Barbearia já favoritada', 400);
    }

    const favorite = await prisma.clientBarbershop.create({
      data: {
        clientId: client.id,
        barbershopId,
      },
      include: { barbershop: true }
    });

    return reply.status(201).send({
      id: favorite.barbershop.id,
      name: favorite.barbershop.name,
      slug: favorite.barbershop.slug,
    });
  },

  async removeFavoriteBarbershop(
    req: FastifyRequest<{ Params: { barbershopId: string } }>,
    reply: FastifyReply
  ) {
    const { barbershopId } = req.params;

    const { accountId } = getRequester(req);
    const client = await clientRepository.findByAccountId(accountId);

    if (!client) {
      throw new AppError('Cliente não encontrado', 404);
    }

    await prisma.clientBarbershop.deleteMany({
      where: {
        clientId: client.id,
        barbershopId,
      }
    });

    return reply.status(204).send();
  },
};
