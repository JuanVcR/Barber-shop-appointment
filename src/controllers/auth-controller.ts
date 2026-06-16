import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authService } from '../services/auth-service.js';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(11),
  cpf: z.string().min(11).optional(),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(8),
  newPassword: z.string().min(8),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

const createBarberSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(11),
  barbershopId: z.string().uuid(),
  serviceIds: z.array(z.string().uuid()).optional(),
});

const acceptBarberInviteSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8),
  name: z.string().min(2).optional(),
  phone: z.string().min(11).optional(),
  availability: z.array(z.object({
    weekDay: z.number().int().min(0).max(6),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
  })).optional(),
});

const barberInviteParamsSchema = z.object({
  token: z.string().min(1),
});

const createAdminSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  barbershopId: z.string().uuid().optional(),
});

const refreshCookieName = 'barberflow_refresh';

function setRefreshCookie(reply: FastifyReply, refreshToken: string) {
  reply.setCookie(refreshCookieName, refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export const authController = {
  async getBarberInvite(req: FastifyRequest, reply: FastifyReply) {
    const { token } = barberInviteParamsSchema.parse(req.params);
    const invite = await authService.getBarberInvite(token);

    return reply.send(invite);
  },

  async register(req: FastifyRequest, reply: FastifyReply) {
    const body = registerSchema.parse(req.body);

    const user = await authService.register(body);

    return reply.status(201).send({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
    });
  },

  async login(req: FastifyRequest, reply: FastifyReply) {
    const body = loginSchema.parse(req.body);

    const result = await authService.login(body);
    setRefreshCookie(reply, result.refreshToken);

    const { refreshToken: _refreshToken, ...response } = result;
    return reply.send(response);
  },

  async changePassword(req: FastifyRequest, reply: FastifyReply) {
    const body = changePasswordSchema.parse(req.body);

    const result = await authService.changeUserPassword({
      accountId: req.user!.id,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    });

    return reply.send(result);
  },

  async forgotUserPassword(req: FastifyRequest, reply: FastifyReply) {
    const body = forgotPasswordSchema.parse(req.body);

    const result = await authService.requestUserPasswordReset(body.email);

    return reply.send(result);
  },

  async forgotBarberPassword(req: FastifyRequest, reply: FastifyReply) {
    const body = forgotPasswordSchema.parse(req.body);

    const result = await authService.requestBarberPasswordReset(body.email);

    return reply.send(result);
  },

  async resetPassword(req: FastifyRequest, reply: FastifyReply) {
    const body = resetPasswordSchema.parse(req.body);

    const result = await authService.resetPassword(body);

    return reply.send(result);
  },

  async createBarber(req: FastifyRequest, reply: FastifyReply) {
    const body = createBarberSchema.parse(req.body);

    const result = await authService.createBarber({
      requester: {
        accountId: req.user!.id,
        role: req.user!.role,
      },
      ...body,
    });

    return reply.status(201).send(result);
  },

  async acceptBarberInvite(req: FastifyRequest, reply: FastifyReply) {
    const body = acceptBarberInviteSchema.parse(req.body);

    const result = await authService.acceptBarberInvite(body);

    return reply.status(201).send(result);
  },

  async createAdmin(req: FastifyRequest, reply: FastifyReply) {
    const body = createAdminSchema.parse(req.body);

    const result = await authService.createAdmin({
      requester: {
        accountId: req.user.id,
        role: req.user.role,
      },
      ...body,
    });

    return reply.status(201).send(result);
  },

  async getMe(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.user.id;

    const { accountRepository } = await import('../repositories/account-repository.js');
    const account = await accountRepository.findByIdWithRelations(userId);

    if (!account) {
      const { AppError } = await import('../errors/app-error.js');
      throw new AppError('User not Found', 404);
    }

    const response = {
      id: account.id,
      email: account.email,
      role: account.role,
      createdAt: account.createdAt,
    };

    if (account.role === 'CLIENT' && account.client) {
      return reply.send({
        ...response,
        type: 'CLIENT',
        data: {
          id: account.client.id,
          name: account.client.name,
          phone: account.client.phone,
          cpf: account.client.cpf,
        }
      });
    }

    if (account.role === 'BARBER' && account.barber) {
      return reply.send({
        ...response,
        type: 'BARBER',
        data: {
          id: account.barber.barbershopId,
          name: account.barber.barbershop.name,
          slug: account.barber.barbershop.slug,
        }
      });
    }

    return reply.send(response);
  },

  async refreshToken(req: FastifyRequest, reply: FastifyReply) {
    const refreshToken = req.cookies[refreshCookieName];

    const result = await authService.refreshToken({ refreshToken });
    setRefreshCookie(reply, result.refreshToken);

    const { refreshToken: _refreshToken, ...response } = result;
    return reply.send(response);
  },

  async logout(req: FastifyRequest, reply: FastifyReply) {
    const userId = req.user!.id;

    const result = await authService.logout(userId);

    reply.clearCookie(refreshCookieName, { path: '/api/auth' });
    return reply.send(result);
  },

  async deleteMe(req: FastifyRequest, reply: FastifyReply) {
    const result = await authService.deleteOwnAccount({
      accountId: req.user!.id,
      role: req.user!.role,
    });

    reply.clearCookie(refreshCookieName, { path: '/api/auth' });
    return reply.send(result);
  },
};
