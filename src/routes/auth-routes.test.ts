import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../controllers/auth-controller.js', () => ({
  authController: {
    register: async (_req: any, reply: any) => reply.status(201).send({ ok: true }),
    login: async (_req: any, reply: any) => reply.send({ token: 'abc' }),
    changePassword: async (_req: any, reply: any) => reply.send({ ok: true }),
    forgotPassword: async (_req: any, reply: any) => reply.send({ ok: true }),
    forgotUserPassword: async (_req: any, reply: any) => reply.send({ ok: true }),
    forgotBarberPassword: async (_req: any, reply: any) => reply.send({ ok: true }),
    resetPassword: async (_req: any, reply: any) => reply.send({ ok: true }),
    getBarberInvite: async (_req: any, reply: any) => reply.send({ ok: true }),
    acceptBarberInvite: async (_req: any, reply: any) => reply.status(201).send({ ok: true }),
    createBarber: async (_req: any, reply: any) => reply.status(201).send({ ok: true }),
    createAdmin: async (_req: any, reply: any) => reply.status(201).send({ ok: true }),
    getMe: async (_req: any, reply: any) => reply.send({ id: 'account-1' }),
    refreshToken: async (_req: any, reply: any) => reply.send({ token: 'new-token' }),
    logout: async (_req: any, reply: any) => reply.status(204).send(),
    deleteMe: async (_req: any, reply: any) => reply.send({ ok: true }),
  },
}));

vi.mock('../controllers/booking-controller.js', () => ({
  bookingController: {
    create: async (_req: any, reply: any) => reply.status(201).send({ id: 'booking-1' }),
    createGuest: async (_req: any, reply: any) => reply.status(201).send({ id: 'booking-1' }),
    createQuick: async (_req: any, reply: any) => reply.status(201).send({ id: 'booking-quick' }),
    listByDay: async (_req: any, reply: any) => reply.send([]),
    listMine: async (_req: any, reply: any) => reply.send([]),
    listWeek: async (_req: any, reply: any) => reply.send({ bookings: [] }),
    listAvailableTimes: async (_req: any, reply: any) => reply.send([]),
    registerPayment: async (_req: any, reply: any) => reply.send({}),
    updateStatus: async (_req: any, reply: any) => reply.send({}),
    updateServices: async (_req: any, reply: any) => reply.send({}),
    reschedule: async (_req: any, reply: any) => reply.send({}),
    getById: async (_req: any, reply: any) => reply.send({ id: 'booking-1' }),
    cancel: async (_req: any, reply: any) => reply.status(204).send(),
  },
}));

vi.mock('../controllers/barbershop-controller.js', () => ({
  barbershopController: {
    uploadImage: async (_req: any, reply: any) => reply.send({}),
    list: async (_req: any, reply: any) => reply.send([]),
    getBySlug: async (_req: any, reply: any) => reply.send({}),
    create: async (_req: any, reply: any) => reply.status(201).send({}),
    update: async (_req: any, reply: any) => reply.send({}),
    createService: async (_req: any, reply: any) => reply.status(201).send({}),
    setup: async (_req: any, reply: any) => reply.send({}),
    createBarber: async (_req: any, reply: any) => reply.status(201).send({}),
    listPendingBarberInvites: async (_req: any, reply: any) => reply.send([]),
    cancelBarberInvite: async (_req: any, reply: any) => reply.status(204).send(),
    listServices: async (_req: any, reply: any) => reply.send([]),
    updateService: async (_req: any, reply: any) => reply.send({}),
    deleteService: async (_req: any, reply: any) => reply.status(204).send(),
    getWorkingHours: async (_req: any, reply: any) => reply.send([]),
    updateWorkingHours: async (_req: any, reply: any) => reply.send([]),
    updateLocation: async (_req: any, reply: any) => reply.send({}),
  },
}));

vi.mock('../middlewares/auth.js', () => ({
  authMiddleware: async (req: any) => {
    req.user = { id: 'account-1', role: 'CLIENT' };
  },
}));

describe('auth routes', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should register user', async () => {
    const { buildApp } = await import('../app.js');
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: {
        name: 'Joao',
        email: 'joao@test.com',
        phone: '5581999999999',
        password: '123456',
      },
    });

    expect(response.statusCode).toBe(201);
    await app.close();
  });

  it('should login user', async () => {
    const { buildApp } = await import('../app.js');
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'joao@test.com',
        password: '123456',
      },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({ token: 'abc' });
    await app.close();
  });
});
