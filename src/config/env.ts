import 'dotenv/config';
/// <reference types="node" />
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  JWT_ISSUER: z.string().min(1).default('barberflow-api'),
  JWT_AUDIENCE: z.string().min(1).default('barberflow-client'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(10).max(14).default(12),
  APP_URL: z.string().default('http://localhost:3333'),
  FRONTEND_URL: z.string().url().default('http://localhost:5173'),
  CORS_ORIGINS: z.string().optional(),
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
  STORAGE_DRIVER: z.enum(['local', 'cloudinary']).default('local'),
  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('barberflow'),
  GLOBAL_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(100),
  GLOBAL_RATE_LIMIT_WINDOW: z.string().min(1).default('1 minute'),
}).superRefine((env, ctx) => {
  if (
    env.NODE_ENV === 'production' &&
    !env.JWT_REFRESH_SECRET
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

  if (env.NODE_ENV === 'production') {
    const insecureUrls = [
      ['DATABASE_URL', env.DATABASE_URL],
      ['APP_URL', env.APP_URL],
      ['FRONTEND_URL', env.FRONTEND_URL],
    ];

    for (const [name, value] of insecureUrls) {
      if (value.includes('localhost') || value.includes('127.0.0.1')) {
        ctx.addIssue({
          code: 'custom',
          path: [name],
          message: `${name} must not use localhost in production`,
        });
      }
    }

    for (const [name, value] of [['APP_URL', env.APP_URL], ['FRONTEND_URL', env.FRONTEND_URL]]) {
      if (!value.startsWith('https://')) {
        ctx.addIssue({
          code: 'custom',
          path: [name],
          message: `${name} must use HTTPS in production`,
        });
      }
    }

    if (env.SMTP_USER.includes('seu-email') || env.SMTP_PASS.includes('app-password')) {
      ctx.addIssue({
        code: 'custom',
        path: ['SMTP_USER'],
        message: 'SMTP credentials must be real in production',
      });
    }

    if (env.STORAGE_DRIVER !== 'cloudinary') {
      ctx.addIssue({
        code: 'custom',
        path: ['STORAGE_DRIVER'],
        message: 'STORAGE_DRIVER must be cloudinary in production',
      });
    }
  }

  if (env.STORAGE_DRIVER === 'cloudinary') {
    for (const key of ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'] as const) {
      if (!env[key]) {
        ctx.addIssue({
          code: 'custom',
          path: [key],
          message: `${key} is required when STORAGE_DRIVER is cloudinary`,
        });
      }
    }
  }
});

export const env = envSchema.parse(process.env);

export const corsOrigins = (env.CORS_ORIGINS ?? env.FRONTEND_URL)
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
