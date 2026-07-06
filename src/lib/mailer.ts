import nodemailer from 'nodemailer';
import { env } from '../config/env.js';

const secure = env.SMTP_SECURE ?? (env.SMTP_PORT === 465);

export const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure,
  requireTLS: env.SMTP_REQUIRE_TLS ?? false,
  auth: {
    user: env.SMTP_USER,
    pass: env.SMTP_PASS,
  },
  tls: {
    // allow custom rejection for self-signed certs in development
    rejectUnauthorized: env.SMTP_TLS_REJECT_UNAUTHORIZED ?? true,
  },
});

export function verifyMailer() {
  return mailer.verify();
}
