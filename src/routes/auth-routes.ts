import type { FastifyInstance } from "fastify";
import { prisma } from "../database/prisma.js";
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken'

export async function authRoutes(app: FastifyInstance) {
  app.post('/register', async (req) => {
    const {name, email, password, phone} = req.body as any

    const hash = await bcrypt.hash(password, 10)

    const user = await prisma.user.create({
      data: { name, email, password: hash, phone}
    })

    return user
  })

  app.post('/login', async (req) => {
    const { email, password } = req.body as any

    const user = await prisma.user.findUnique({
      where: { email }
    })
    if (!user) throw new Error('usuario nao encontrado')
    
    const valid = await bcrypt.compare(password, user.password)

    if (!valid) throw new Error('Senha invalida')

    const token = jwt.sign({ id: user.id }, 'secret')

    return { token }
  })
}