import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../config/env.js', () => ({
  env: {
    JWT_SECRET: 'test-secret-with-at-least-32-characters',
    JWT_ISSUER: 'barberflow-api',
    JWT_AUDIENCE: 'barberflow-client',
  },
}));

vi.mock('jsonwebtoken', () => ({
  default: {
    verify: vi.fn(),
  },
}));

describe('authMiddleware', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('should return 401 when authorization header is missing', async () => {
    const { authMiddleware } = await import('./auth.js');

    const req = { headers: {} } as any;
    const send = vi.fn();
    const reply = {
      status: vi.fn(() => ({ send })),
    } as any;

    await authMiddleware(req, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(send).toHaveBeenCalledWith({ message: 'Token nao informado' });
  });

  it('should return 401 when token is missing after Bearer', async () => {
    const { authMiddleware } = await import('./auth.js');

    const req = {
      headers: { authorization: 'Bearer' },
    } as any;
    const send = vi.fn();
    const reply = {
      status: vi.fn(() => ({ send })),
    } as any;

    await authMiddleware(req, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(send).toHaveBeenCalledWith({ message: 'Token invalido' });
  });

  it('should attach req.user when token is valid', async () => {
    const { authMiddleware } = await import('./auth.js');
    const jwt = (await import('jsonwebtoken')).default;

    vi.mocked(jwt.verify).mockReturnValue({
      sub: 'account-1',
      role: 'CLIENT',
      type: 'access',
    } as never);

    const req = {
      headers: { authorization: 'Bearer valid-token' },
    } as any;
    const reply = {
      status: vi.fn(),
    } as any;

    await authMiddleware(req, reply);

    expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'test-secret-with-at-least-32-characters', {
      algorithms: ['HS256'],
      issuer: 'barberflow-api',
      audience: 'barberflow-client',
    });
    expect(req.user).toEqual({ id: 'account-1', role: 'CLIENT' });
    expect(reply.status).not.toHaveBeenCalled();
  });

  it('should reject a refresh token on protected routes', async () => {
    const { authMiddleware } = await import('./auth.js');
    const jwt = (await import('jsonwebtoken')).default;

    vi.mocked(jwt.verify).mockReturnValue({
      sub: 'account-1',
      type: 'refresh',
    } as never);

    const req = {
      headers: { authorization: 'Bearer refresh-token' },
    } as any;
    const send = vi.fn();
    const reply = {
      status: vi.fn(() => ({ send })),
    } as any;

    await authMiddleware(req, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
  });

  it('should return 401 when token is invalid', async () => {
    const { authMiddleware } = await import('./auth.js');
    const jwt = (await import('jsonwebtoken')).default;

    vi.mocked(jwt.verify).mockImplementation(() => {
      throw new Error('invalid token');
    });

    const req = {
      headers: { authorization: 'Bearer invalid-token' },
    } as any;
    const send = vi.fn();
    const reply = {
      status: vi.fn(() => ({ send })),
    } as any;

    await authMiddleware(req, reply);

    expect(reply.status).toHaveBeenCalledWith(401);
    expect(send).toHaveBeenCalledWith({ message: 'Token invalido ou expirado' });
  });
});
