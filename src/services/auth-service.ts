import bcrypt from 'bcrypt';
import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { AccountRole } from '../domain/account-role.js';
import { AppError } from '../errors/app-error.js';
import { accountRepository } from '../repositories/account-repository.js';
import { barberInviteRepository } from '../repositories/barber-invite-repository.js';
import { barberRepository } from '../repositories/barber-repository.js';
import { barbershopAdminRepository } from '../repositories/barbershop-admin-repository.js';
import { clientRepository } from '../repositories/client-repository.js';
import { passwordResetRepository } from '../repositories/password-reset-repository.js';
import { notificationService } from './notification-service.js';

const refreshSecret = env.JWT_REFRESH_SECRET ?? env.JWT_SECRET;
const hashToken = (token: string) =>
  crypto.createHash('sha256').update(token).digest('hex');

export const authService = {
  async getBarberInvite(token: string) {
    const invite = await barberInviteRepository.findValidByToken(token);

    if (!invite) {
      throw new AppError('Convite invalido ou expirado', 404);
    }

    return {
      token: invite.token,
      email: invite.email,
      name: invite.name,
      phone: invite.phone,
      expiresAt: invite.expiresAt,
      barbershop: {
        id: invite.barbershop.id,
        name: invite.barbershop.name,
        address: invite.barbershop.address,
      },
    };
  },

  async registerClient(data: {
    name: string;
    email: string;
    phone: string;
    cpf?: string | null;
    password: string;
  }) {
    const existingAccount = await accountRepository.findByEmail(data.email);

    if (existingAccount) {
      throw new AppError('Email ja cadastrado', 400);
    }

    const existingPhone = await clientRepository.findByPhone(data.phone);

    if (existingPhone) {
      throw new AppError('Telefone ja cadastrado', 400);
    }

    if (data.cpf) {
      const existingCpf = await clientRepository.findByCpf(data.cpf);

      if (existingCpf) {
        throw new AppError('CPF ja cadastrado', 400);
      }
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const account = await accountRepository.create({
      email: data.email,
      password: passwordHash,
      role: 'CLIENT',
    });

    return clientRepository.create({
      accountId: account.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      cpf: data.cpf,
    });
  },

  register(data: {
    name: string;
    email: string;
    phone: string;
    cpf?: string | null;
    password: string;
  }) {
    return this.registerClient(data);
  },

  async login(data: {
    email: string;
    password: string;
  }) {
    const account = await accountRepository.findByEmail(data.email);

    if (!account) {
      throw new AppError('Credenciais invalidas', 401);
    }

    if (account.deletedAt) {
      throw new AppError('Credenciais invalidas', 401);
    }

    const valid = await bcrypt.compare(data.password, account.password);

    if (!valid) {
      throw new AppError('Credenciais invalidas', 401);
    }

    const token = jwt.sign({
      sub: account.id,
      role: account.role,
      type: 'access',
    }, env.JWT_SECRET, {
      expiresIn: '15m',
    });

    const refreshToken = jwt.sign(
      { sub: account.id, type: 'refresh' },
      refreshSecret,
      { expiresIn: '7d' }
    );

    await accountRepository.updateRefreshToken(account.id, hashToken(refreshToken));

    return {
      token,
      accessToken: token,
      refreshToken,
      role: account.role,
      account: {
        id: account.id,
        email: account.email,
        role: account.role,
      },
    };
  },

  async createAccount(data: {
    email: string;
    password: string;
    role: AccountRole;
  }) {
    const existingAccount = await accountRepository.findByEmail(data.email);

    if (existingAccount) {
      throw new AppError('Email ja cadastrado', 400);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    return accountRepository.create({
      email: data.email,
      password: passwordHash,
      role: data.role,
    });
  },

  async changeUserPassword(data: {
    accountId: string;
    currentPassword: string;
    newPassword: string;
  }) {
    const account = await accountRepository.findById(data.accountId);

    if (!account) {
      throw new AppError('Conta nao encontrada', 400);
    }

    const valid = await bcrypt.compare(data.currentPassword, account.password);

    if (!valid) {
      throw new AppError('Senha atual invalida', 400);
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10);

    await accountRepository.updatePassword(account.id, passwordHash);

    return { message: 'Senha alterada com sucesso' };
  },

  async requestPasswordReset(email: string) {
    const account = await accountRepository.findByEmail(email);

    if (!account) {
      return { message: 'Se o email existir, enviaremos instrucoes' };
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30);

    await passwordResetRepository.create({
      token: hashToken(token),
      accountId: account.id,
      expiresAt,
    });

    await notificationService.sendPasswordResetEmail({
      to: account.email,
      name: account.email,
      token,
    });

    return { message: 'Email de recuperacao enviado com sucesso' };
  },

  async requestUserPasswordReset(email: string) {
    return this.requestPasswordReset(email);
  },

  async requestBarberPasswordReset(email: string) {
    return this.requestPasswordReset(email);
  },

  async resetPassword(data: {
    token: string;
    newPassword: string;
  }) {
    const resetToken = await passwordResetRepository.findValidToken(
      hashToken(data.token)
    );

    if (!resetToken) {
      throw new AppError('Token invalido ou expirado', 400);
    }

    const passwordHash = await bcrypt.hash(data.newPassword, 10);

    await accountRepository.updatePassword(resetToken.accountId, passwordHash);
    await passwordResetRepository.markAsUsed(resetToken.id);

    return { message: 'Senha redefinida com sucesso' };
  },

  async createBarber(data: {
    requester?: {
      accountId: string;
      role: string;
    };
    name: string;
    email: string;
    phone: string;
    barbershopId: string;
    serviceIds?: string[];
  }) {
    if (!data.requester?.accountId) {
      throw new AppError('Conta do administrador nao informada', 400);
    }

    if (!['SUPER_ADMIN', 'BARBERSHOP_ADMIN'].includes(data.requester.role)) {
      throw new AppError('Perfil sem permissao para convidar barbeiro', 403);
    }

    if (data.requester.role === 'BARBERSHOP_ADMIN') {
      const admin = await barbershopAdminRepository.findByAccountAndBarbershop(
        data.requester.accountId,
        data.barbershopId
      );

      if (!admin) {
        throw new AppError('Administrador nao pertence a esta barbearia', 403);
      }
    }

    const existingAccount = await accountRepository.findByEmail(data.email);

    if (existingAccount) {
      throw new AppError('Email ja cadastrado', 400);
    }

    const pendingInvite = await barberInviteRepository.findPendingByEmail(
      data.barbershopId,
      data.email
    );

    if (pendingInvite) {
      throw new AppError('Ja existe um convite pendente para este email', 400);
    }

    const allBarbers = await barberRepository.findManyByBarbershopId(
      data.barbershopId
    );
    const existingPhone = allBarbers.some((barber) => barber.phone === data.phone);

    if (existingPhone) {
      throw new AppError('Telefone ja cadastrado nesta barbearia', 400);
    }

    const token = crypto.randomUUID();
    const invite = await barberInviteRepository.create({
      token,
      email: data.email,
      name: data.name,
      phone: data.phone,
      barbershopId: data.barbershopId,
      invitedByAccountId: data.requester.accountId,
      serviceIds: data.serviceIds,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    });

    let emailSent = true;

    try {
      await notificationService.sendBarberInviteEmail({
        to: data.email,
        name: data.name,
        barbershopName: invite.barbershop.name,
        inviteToken: token,
      });
    } catch {
      emailSent = false;
    }

    const inviteUrl = `${env.FRONTEND_URL}/#/auth/barber-invite?token=${encodeURIComponent(token)}`;

    return {
      id: invite.id,
      email: data.email,
      phone: data.phone,
      token,
      inviteUrl,
      emailSent,
      message: emailSent
        ? 'Convite de barbeiro criado e enviado por email.'
        : 'Convite criado. O email nao foi enviado; compartilhe o link manualmente.',
    };
  },

  async acceptBarberInvite(data: {
    token: string;
    password: string;
    name?: string;
    phone?: string;
    availability?: Array<{
      weekDay: number;
      startTime: string;
      endTime: string;
    }>;
  }) {
    const invite = await barberInviteRepository.findValidByToken(data.token);

    if (!invite) {
      throw new AppError('Convite invalido ou expirado', 400);
    }

    const existingAccount = await accountRepository.findByEmail(invite.email);

    if (existingAccount) {
      throw new AppError('Email ja cadastrado', 400);
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const account = await accountRepository.create({
      email: invite.email,
      password: passwordHash,
      role: 'BARBER',
    });

    const barber = await barberRepository.create({
      accountId: account.id,
      name: data.name ?? invite.name,
      phone: data.phone ?? invite.phone,
      barbershopId: invite.barbershopId,
      serviceIds: invite.serviceIds,
    });

    if (data.availability?.length) {
      await barberRepository.upsertAvailability({
        barberId: barber.id,
        availability: data.availability,
      });
    }

    await barberInviteRepository.markAccepted(invite.id);

    return {
      id: barber.id,
      name: barber.name,
      email: invite.email,
      barbershopId: invite.barbershopId,
      message: 'Convite aceito. Perfil de barbeiro criado.',
    };
  },

  async createAdmin(data: {
    requester: {
      accountId: string;
      role: string;
    };
    name: string;
    email: string;
    barbershopId?: string;
  }) {
    if (data.requester.role !== 'SUPER_ADMIN') {
      throw new AppError('Apenas super admin pode criar administradores', 403);
    }

    if (!data.barbershopId) {
      throw new AppError('Informe a barbearia do administrador', 400);
    }

    const existingAccount = await accountRepository.findByEmail(data.email);

    if (existingAccount) {
      throw new AppError('Email ja cadastrado', 400);
    }

    const role = 'BARBERSHOP_ADMIN';
    const temporaryPassword = crypto.randomUUID().slice(0, 12);
    const passwordHash = await bcrypt.hash(temporaryPassword, 10);

    const account = await accountRepository.create({
      email: data.email,
      password: passwordHash,
      role,
    });

    await barbershopAdminRepository.create({
      accountId: account.id,
      barbershopId: data.barbershopId,
    });

    await notificationService.sendAdminInviteEmail({
      to: data.email,
      name: data.name,
      email: data.email,
      password: temporaryPassword,
      role,
    });

    return {
      id: account.id,
      email: data.email,
      role,
      temporaryPassword,
      message: 'Administrador criado! Email com credenciais enviado.',
    };
  },

  async refreshToken(data: { refreshToken?: string }) {
    if (!data.refreshToken) {
      throw new AppError('Refresh token inválido', 401);
    }

    try {
      const decoded = jwt.verify(data.refreshToken, refreshSecret) as {
        sub: string;
        type: string;
      };

      if (decoded.type !== 'refresh') {
        throw new AppError('Token inválido', 401);
      }

      const account = await accountRepository.findById(decoded.sub);

      if (!account || account.refreshToken !== hashToken(data.refreshToken)) {
        throw new AppError('Refresh token inválido ou expirado', 401);
      }

      const newAccessToken = jwt.sign(
        {
          sub: account.id,
          role: account.role,
          type: 'access',
        },
        env.JWT_SECRET,
        { expiresIn: '15m' }
      );

      const newRefreshToken = jwt.sign(
        {
          sub: account.id,
          type: 'refresh',
        },
        refreshSecret,
        { expiresIn: '7d' }
      );

      await accountRepository.updateRefreshToken(
        account.id,
        hashToken(newRefreshToken)
      );

      return {
        token: newAccessToken,
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
        expiresIn: 900,
      };
    } catch (error) {
      throw new AppError('Refresh token inválido ou expirado', 401);
    }
  },

  async logout(accountId: string) {
    await accountRepository.updateRefreshToken(accountId, null);
    return { message: 'Logout realizado com sucesso' };
  },

  async deleteOwnAccount(data: { accountId: string; role: string }) {
    if (data.role !== 'CLIENT') {
      throw new AppError('A exclusao automatica esta disponivel apenas para clientes', 403);
    }

    await accountRepository.anonymizeClientAccount(data.accountId);
    return { message: 'Conta removida e dados pessoais anonimizados' };
  },
};
