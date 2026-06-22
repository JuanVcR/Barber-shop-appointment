import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../controllers/barbershop-controller.js', () => ({
  barbershopController: {
    uploadImage: async (_req: any, reply: any) => reply.send({}),
    list: async (_req: any, reply: any) => {
      return reply.send([{ id: 'shop-1', name: 'Barbearia Alpha' }]);
    },
    getBySlug: async (_req: any, reply: any) => {
      return reply.send({ id: 'shop-1', slug: 'barbearia-alpha' });
    },
    create: async (_req: any, reply: any) => reply.status(201).send({ id: 'shop-1' }),
    update: async (_req: any, reply: any) => reply.send({ id: 'shop-1' }),
    createService: async (_req: any, reply: any) => reply.status(201).send({ id: 'service-1' }),
    setup: async (_req: any, reply: any) => reply.send({ id: 'shop-1' }),
    createBarber: async (_req: any, reply: any) => reply.status(201).send({ id: 'barber-1' }),
    listPendingBarberInvites: async (_req: any, reply: any) => reply.send([]),
    cancelBarberInvite: async (_req: any, reply: any) => reply.status(204).send(),
    listServices: async (_req: any, reply: any) => reply.send([]),
    updateService: async (_req: any, reply: any) => reply.send({ id: 'service-1' }),
    deleteService: async (_req: any, reply: any) => reply.status(204).send(),
    getWorkingHours: async (_req: any, reply: any) => reply.send([]),
    updateWorkingHours: async (_req: any, reply: any) => reply.send([]),
    updateLocation: async (_req: any, reply: any) => reply.send({
      id: 'shop-1',
      latitude: -23.5505,
      longitude: -46.6333,
    }),
  },
}));

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

describe('barbershop routes', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should list barbershops', async () => {
    const { buildApp } = await import('../app.js');
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/barbershops',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)[0].name).toBe('Barbearia Alpha');
    await app.close();
  });

  it('should get barbershop by slug', async () => {
    const { buildApp } = await import('../app.js');
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/barbershops/barbearia-alpha',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).slug).toBe('barbearia-alpha');
    await app.close();
  });
});
