import type { FastifyInstance } from "fastify";
import { prisma } from "../database/prisma.js";

export async function barbershopRoutes(app: FastifyInstance) {
  app.get('/barbershops', async () => {
    return prisma.barbershop.findMany()
  })

  app.get('/barbershops/:slug', async (req) => {
    const { slug } = req.params as any

    return prisma.barbershop.findUnique({
      where: { slug },
      include: {
        services: true,
        barbers: true
      }
    })
  })
}