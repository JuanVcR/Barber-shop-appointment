import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';

import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';
import { barberRepository } from '../repositories/barber-repository.js';
import { passwordResetRepository } from '../repositories/password-reset-repository.js';
import { userRepository } from '../repositories/user-repository.js';
import { notificationService } from './notification-service.js';

export const authService = {
  async register(data: {
    name: string;
    email: string;
    phone: string;
    password: string;
  }) {
    const existingUser = await userRepository.findByEmail(data.email);

    if (existingUser) {
      throw new AppError('Email ja cadastrado', 400);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return userRepository.create({
      ...data,
      password: passwordHash,
    });
  },

  async login(data: {
    email: string;
    password: string;
  }) {
    const user = await userRepository.findByEmail(data.email);

    if (!user) {
      throw new AppError('Usuario nao encontrado', 400);
    }

    const valid = await bcrypt.compare(data.password, user.password);

    if (!valid) {
      throw new AppError('Senha invalida', 400);
    }

    const token = jwt.sign({ sub: user.id }, env.JWT_SECRET, {
      expiresIn: '7d',
    });

    return { token };
  },

  async changeUserPassword(data: {
    userId: string;
    currentPassword: string;
    newPassword: string;
  }) {
    const user = await userRepository.findById(data.userId);

    if (!user) {
      throw new AppError('Usuario nao encontrado', 400);
    }

    const valid = await bcrypt.compare(data.currentPassword, user.password);

    if (!valid) {
      throw new AppError('Senha atual invalida', 400);
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10);

    await userRepository.updatePassword(user.id, passwordHash);

    return { message: 'Senha alterada com sucesso' };
  },

  async requestUserPasswordReset(email: string) {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      return { message: 'Se o email existir, enviaremos instrucoes' };
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await passwordResetRepository.createForUser({
      token,
      userId: user.id,
      expiresAt,
    });

    await notificationService.sendPasswordResetEmail({
      to: user.email,
      name: user.name,
      token,
    });

    return { message: 'Email de recuperacao enviado com sucesso' };
  },

  async requestBarberPasswordReset(email: string) {
    const barber = await barberRepository.findByEmail(email);

    if (!barber) {
      return { message: 'Se o email existir, enviaremos instrucoes' };
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await passwordResetRepository.createForBarber({
      token,
      barberId: barber.id,
      expiresAt,
    });

    await notificationService.sendPasswordResetEmail({
      to: barber.email,
      name: barber.name,
      token,
    });

    return { message: 'Email de recuperacao enviado com sucesso' };
  },

  async resetPassword(data: {
    token: string;
    newPassword: string;
  }) {
    const resetToken = await passwordResetRepository.findValidToken(data.token);

    if (!resetToken) {
      throw new AppError('Token invalido ou expirado', 400);
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10);

    if (resetToken.userId) {
      await userRepository.updatePassword(resetToken.userId, passwordHash);
    }

    if (resetToken.barberId) {
      await barberRepository.updatePassword(resetToken.barberId, passwordHash);
    }

    await passwordResetRepository.markAsUsed(resetToken.id);

    return { message: 'Senha redefinida com sucesso' };
  },
};
