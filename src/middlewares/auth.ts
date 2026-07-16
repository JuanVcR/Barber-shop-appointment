import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

type TokenPayload = {
  sub: string;
  role: 'SUPER_ADMIN' | 'BARBERSHOP_ADMIN' | 'BARBER' | 'CLIENT';
  type: 'access';
};

export async function authMiddleware(req: FastifyRequest, reply: FastifyReply) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return reply.status(401).send({ message: 'Token nao informado' });
  }

  const [, token] = authHeader.split(' ');

  if (!token) {
    return reply.status(401).send({ message: 'Token invalido' });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: env.JWT_ISSUER,
      audience: env.JWT_AUDIENCE,
    }) as TokenPayload;

    const validRoles = ['SUPER_ADMIN', 'BARBERSHOP_ADMIN', 'BARBER', 'CLIENT'];
    if (
      payload.type !== 'access' ||
      typeof payload.sub !== 'string' ||
      !validRoles.includes(payload.role)
    ) {
      throw new Error('Invalid access token');
    }

    req.user = { id: payload.sub, role: payload.role };
  } catch {
    return reply.status(401).send({ message: 'Token invalido ou expirado' });
  }
}
