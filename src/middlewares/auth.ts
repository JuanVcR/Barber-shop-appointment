import type { FastifyReply, FastifyRequest } from 'fastify';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

type TokenPayload = {
  sub: string;
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
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
    req.user = { id: payload.sub };
  } catch {
    return reply.status(401).send({ message: 'Token invalido ou expirado' });
  }
}
