import 'fastify';

declare module 'fastify' {
  interface FastifyRequest {
    user?: {
      id: string;
      role: 'SUPER_ADMIN' | 'BARBERSHOP_ADMIN' | 'BARBER' | 'CLIENT';
    };
  }
}
