import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { authService } from '../services/auth-service.js';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(11),
  password: z.string().min(6),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(6),
  newPassword: z.string().min(6),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(6),
});

export const authController = {
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

    return reply.send(result);
  },

  async changePassword(req: FastifyRequest, reply: FastifyReply) {
    const body = changePasswordSchema.parse(req.body);

    const result = await authService.changeUserPassword({
      userId: req.user!.id,
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
};
