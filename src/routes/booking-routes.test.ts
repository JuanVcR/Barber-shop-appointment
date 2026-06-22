import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../controllers/booking-controller.js', () => ({
  bookingController: {
    create: async (req: any, reply: any) => {
      return reply.status(201).send({
        id: 'booking-1',
        accountId: req.user.id,
      });
    },
    createGuest: async (_req: any, reply: any) => {
      return reply.status(201).send({ id: 'booking-1' });
    },
    createQuick: async (_req: any, reply: any) => {
      return reply.status(201).send({ id: 'booking-quick' });
    },
    listByDay: async (_req: any, reply: any) => {
      return reply.send([{ id: 'booking-1' }]);
    },
    listMine: async (_req: any, reply: any) => {
      return reply.send([{ id: 'booking-1' }]);
    },
    listWeek: async (_req: any, reply: any) => {
      return reply.send({ startDay: '2026-04-06', endDay: '2026-04-12', bookings: [] });
    },
    listAvailableTimes: async (_req: any, reply: any) => {
      return reply.send(['10:00', '11:00']);
    },
    registerPayment: async (_req: any, reply: any) => {
      return reply.send({ id: 'booking-1', paymentMethod: 'PIX' });
    },
    updateStatus: async (_req: any, reply: any) => {
      return reply.send({ id: 'booking-1', status: 'COMPLETED' });
    },
    updateServices: async (_req: any, reply: any) => {
      return reply.send({ id: 'booking-1', services: [] });
    },
    reschedule: async (_req: any, reply: any) => {
      return reply.send({ id: 'booking-1', day: '2026-04-11' });
    },
    getById: async (_req: any, reply: any) => {
      return reply.send({ id: 'booking-1' });
    },
    cancel: async (_req: any, reply: any) => {
      return reply.status(204).send();
    },
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

describe('booking routes', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('should create booking in authenticated route', async () => {
    const { buildApp } = await import('../app.js');
    const app = await buildApp();

    const response = await app.inject({
      method: 'POST',
      url: '/api/bookings',
      headers: {
        authorization: 'Bearer token-123',
      },
      payload: {
        barberId: 'barber-1',
        serviceId: 'service-1',
        barbershopId: 'shop-1',
        day: '2026-04-10',
        time: '10:00',
      },
    });

    expect(response.statusCode).toBe(201);
    expect(JSON.parse(response.body).accountId).toBe('account-1');
    await app.close();
  });

  it('should list available times', async () => {
    const { buildApp } = await import('../app.js');
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/availability?barberId=barber-1&serviceId=service-1&day=2026-04-10',
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual(['10:00', '11:00']);
    await app.close();
  });

  it('should expose weekly agenda', async () => {
    const { buildApp } = await import('../app.js');
    const app = await buildApp();

    const response = await app.inject({
      method: 'GET',
      url: '/api/bookings/week?startDay=2026-04-06',
      headers: { authorization: 'Bearer token-123' },
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body).startDay).toBe('2026-04-06');
    await app.close();
  });
});
