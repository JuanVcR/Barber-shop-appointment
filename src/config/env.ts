import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  BOT_NAME: z.string().default('BarberBot'),
  DEFAULT_SESSION_ID: z.string().default('barbearia-principal')
});

export const env = envSchema.parse(process.env)