import { beforeEach, describe, expect, it, vi } from 'vitest';
import crypto from 'node:crypto';

vi.mock('../repositories/account-repository.js', () => ({
  accountRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    updatePassword: vi.fn(),
    updateRefreshToken: vi.fn(),
    anonymizeClientAccount: vi.fn(),
  },
}));

vi.mock('../repositories/client-repository.js', () => ({
  clientRepository: {
    findByPhone: vi.fn(),
    findByCpf: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../repositories/password-reset-repository.js', () => ({
  passwordResetRepository: {
    create: vi.fn(),
    findValidToken: vi.fn(),
    markAsUsed: vi.fn(),
  },
}));

vi.mock('../repositories/barber-invite-repository.js', () => ({
  barberInviteRepository: {
    findPendingByEmail: vi.fn(),
    create: vi.fn(),
    findValidByToken: vi.fn(),
    markAccepted: vi.fn(),
  },
}));

vi.mock('../repositories/barber-repository.js', () => ({
  barberRepository: {
    findManyByBarbershopId: vi.fn(),
    create: vi.fn(),
    upsertAvailability: vi.fn(),
  },
}));

vi.mock('./notification-service.js', () => ({
  buildPasswordResetUrl: vi.fn((token: string) => `http://localhost:5173/#/auth/reset-password?token=${token}`),
  notificationService: {
    sendPasswordResetEmail: vi.fn(),
    sendBarberInviteEmail: vi.fn(),
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
  },
}));

describe('authService', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.JWT_SECRET = 'test-secret';
  });

  it('should register a new client account', async () => {
    const { authService } = await import('./auth-service.js');
    const { accountRepository } = await import('../repositories/account-repository.js');
    const { clientRepository } = await import('../repositories/client-repository.js');
    const bcrypt = (await import('bcrypt')).default;

    vi.mocked(accountRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(clientRepository.findByPhone).mockResolvedValue(null);
    vi.mocked(bcrypt.hash).mockResolvedValue('hashed-password' as never);
    vi.mocked(accountRepository.create).mockResolvedValue({
      id: 'account-1',
      email: 'joao@test.com',
      role: 'CLIENT',
      password: 'hashed-password',
    } as never);
    vi.mocked(clientRepository.create).mockResolvedValue({
      id: 'client-1',
      accountId: 'account-1',
      name: 'Joao',
      phone: '5581999999999',
    } as never);

    const result = await authService.register({
      name: 'Joao',
      email: 'joao@test.com',
      phone: '5581999999999',
      password: 'Senha123!',
    });

    expect(accountRepository.findByEmail).toHaveBeenCalledWith('joao@test.com');
    expect(accountRepository.create).toHaveBeenCalledWith({
      email: 'joao@test.com',
      password: 'hashed-password',
      role: 'CLIENT',
    });
    expect(clientRepository.create).toHaveBeenCalled();
    expect(result.id).toBe('client-1');
  });

  it('should not register duplicated email', async () => {
    const { authService } = await import('./auth-service.js');
    const { accountRepository } = await import('../repositories/account-repository.js');

    vi.mocked(accountRepository.findByEmail).mockResolvedValue({ id: 'account-1' } as never);

    await expect(
      authService.register({
        name: 'Joao',
        email: 'joao@test.com',
        phone: '5581999999999',
        password: 'Senha123!',
      })
    ).rejects.toThrow('Email ja cadastrado');
  });

  it('should create a barber invite with a shareable link', async () => {
    const { authService } = await import('./auth-service.js');
    const { accountRepository } = await import('../repositories/account-repository.js');
    const { barberInviteRepository } = await import('../repositories/barber-invite-repository.js');
    const { barberRepository } = await import('../repositories/barber-repository.js');

    vi.mocked(accountRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(barberInviteRepository.findPendingByEmail).mockResolvedValue(null);
    vi.mocked(barberRepository.findManyByBarbershopId).mockResolvedValue([]);
    vi.mocked(barberInviteRepository.create).mockResolvedValue({
      id: 'invite-1',
      barbershop: { name: 'Barbearia Alpha' },
    } as never);

    const result = await authService.createBarber({
      requester: { accountId: 'admin-1', role: 'SUPER_ADMIN' },
      name: 'Carlos',
      email: 'carlos@example.com',
      phone: '5581999999999',
      barbershopId: 'shop-1',
    });

    expect(result.emailSent).toBe(true);
    expect(result.inviteUrl).toContain('/#/auth/barber-invite?token=');
  });

  it('should reject a duplicated pending barber invite', async () => {
    const { authService } = await import('./auth-service.js');
    const { accountRepository } = await import('../repositories/account-repository.js');
    const { barberInviteRepository } = await import('../repositories/barber-invite-repository.js');

    vi.mocked(accountRepository.findByEmail).mockResolvedValue(null);
    vi.mocked(barberInviteRepository.findPendingByEmail).mockResolvedValue({
      id: 'invite-1',
    } as never);

    await expect(
      authService.createBarber({
        requester: { accountId: 'admin-1', role: 'SUPER_ADMIN' },
        name: 'Carlos',
        email: 'carlos@example.com',
        phone: '5581999999999',
        barbershopId: 'shop-1',
      })
    ).rejects.toThrow('Ja existe um convite pendente');
  });

  it('should login with valid credentials', async () => {
    const { authService } = await import('./auth-service.js');
    const { accountRepository } = await import('../repositories/account-repository.js');
    const bcrypt = (await import('bcrypt')).default;
    const jwt = (await import('jsonwebtoken')).default;

    vi.mocked(accountRepository.findByEmail).mockResolvedValue({
      id: 'account-1',
      email: 'joao@test.com',
      password: 'hashed-password',
      role: 'CLIENT',
    } as never);

    vi.mocked(bcrypt.compare).mockResolvedValue(true as never);
    vi.mocked(jwt.sign)
      .mockReturnValueOnce('token-123' as never)
      .mockReturnValueOnce('refresh-token-123' as never);

    const result = await authService.login({
      email: 'joao@test.com',
      password: 'Senha123!',
    });

    expect(accountRepository.updateRefreshToken).toHaveBeenCalledWith(
      'account-1',
      crypto.createHash('sha256').update('refresh-token-123').digest('hex')
    );
    expect(result).toMatchObject({
      token: 'token-123',
      accessToken: 'token-123',
      refreshToken: 'refresh-token-123',
      role: 'CLIENT',
      account: {
        id: 'account-1',
        email: 'joao@test.com',
        role: 'CLIENT',
      },
    });
  });

  it('should fail login with invalid password', async () => {
    const { authService } = await import('./auth-service.js');
    const { accountRepository } = await import('../repositories/account-repository.js');
    const bcrypt = (await import('bcrypt')).default;

    vi.mocked(accountRepository.findByEmail).mockResolvedValue({
      id: 'account-1',
      email: 'joao@test.com',
      password: 'hashed-password',
    } as never);

    vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

    await expect(
      authService.login({
        email: 'joao@test.com',
        password: 'wrong-password',
      })
    ).rejects.toThrow('Credenciais invalidas');
  });

  it('should create password reset token for account', async () => {
    const { authService } = await import('./auth-service.js');
    const { accountRepository } = await import('../repositories/account-repository.js');
    const { passwordResetRepository } = await import('../repositories/password-reset-repository.js');
    const { notificationService } = await import('./notification-service.js');

    vi.mocked(accountRepository.findByEmail).mockResolvedValue({
      id: 'account-1',
      email: 'joao@test.com',
    } as never);

    const result = await authService.requestUserPasswordReset('joao@test.com');

    expect(passwordResetRepository.create).toHaveBeenCalled();
    expect(notificationService.sendPasswordResetEmail).toHaveBeenCalled();
    expect(result.message).toContain('Email de recuperacao');
  });

  it('should reset password with valid token', async () => {
    const { authService } = await import('./auth-service.js');
    const { passwordResetRepository } = await import('../repositories/password-reset-repository.js');
    const { accountRepository } = await import('../repositories/account-repository.js');
    const bcrypt = (await import('bcrypt')).default;

    vi.mocked(passwordResetRepository.findValidToken).mockResolvedValue({
      id: 'reset-1',
      token: 'token-123',
      accountId: 'account-1',
    } as never);

    vi.mocked(bcrypt.hash).mockResolvedValue('new-hash' as never);

    const result = await authService.resetPassword({
      token: 'token-123',
      newPassword: 'NovaSenha123!',
    });

    expect(accountRepository.updatePassword).toHaveBeenCalledWith('account-1', 'new-hash');
    expect(passwordResetRepository.markAsUsed).toHaveBeenCalledWith('reset-1');
    expect(result.message).toContain('Senha redefinida');
  });

  it('should anonymize client account on LGPD deletion', async () => {
    const { authService } = await import('./auth-service.js');
    const { accountRepository } = await import('../repositories/account-repository.js');

    await authService.deleteOwnAccount({ accountId: 'account-1', role: 'CLIENT' });

    expect(accountRepository.anonymizeClientAccount).toHaveBeenCalledWith('account-1');
  });
});
