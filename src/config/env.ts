import 'dotenv/config';
/// <reference types="node" />
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  JWT_REFRESH_SECRET: z.string().min(1).optional(),
  APP_URL: z.string().default('http://localhost:3333'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().min(1),
  SMTP_PASS: z.string().min(1),
  SMTP_FROM: z.string().email(),
  SMTP_SECURE: z.preprocess((v) => v === 'true' || v === true, z.boolean().optional()),
  SMTP_REQUIRE_TLS: z.preprocess((v) => v === 'true' || v === true, z.boolean().optional()),
  SMTP_TLS_REJECT_UNAUTHORIZED: z.preprocess((v) => v === 'false' || v === false ? false : true, z.boolean().optional()),
  SENTRY_DSN: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().url().optional()
  ),
  UPLOAD_DIR: z.string().default('uploads'),
}).superRefine((env, ctx) => {
  if (env.NODE_ENV === 'production' && env.JWT_SECRET.length < 32) {
    ctx.addIssue({
      code: 'custom',
      path: ['JWT_SECRET'],
      message: 'JWT_SECRET must have at least 32 characters in production',
    });
  }

  if (
    env.NODE_ENV === 'production' &&
    (!env.JWT_REFRESH_SECRET || env.JWT_REFRESH_SECRET.length < 32)
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['JWT_REFRESH_SECRET'],
      message: 'JWT_REFRESH_SECRET must have at least 32 characters in production',
    });
  }

  if (
    env.NODE_ENV === 'production' &&
    env.JWT_REFRESH_SECRET === env.JWT_SECRET
  ) {
    ctx.addIssue({
      code: 'custom',
      path: ['JWT_REFRESH_SECRET'],
      message: 'JWT_REFRESH_SECRET must be different from JWT_SECRET',
    });
  }
});

export const env = envSchema.parse(process.env);
