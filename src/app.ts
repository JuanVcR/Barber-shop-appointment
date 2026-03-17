import fastify from "fastify";
import { barbershopRoutes } from "./routes/barbershop-routes.js";
import { ok } from "node:assert";

export function buildApp() {
  const app = fastify({
    logger: true,
  });

  app.get('/health', async () => {
    return { ok: true };
  });

  app.register(barbershopRoutes, { prefix: '/api' });

  return app;
}