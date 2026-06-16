import * as Sentry from '@sentry/node';
import { env } from './env.js';

export function initializeMonitoring() {
  if (!env.SENTRY_DSN) return;

  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
    tracesSampleRate: env.NODE_ENV === 'production' ? 0.1 : 1,
  });
}

export function captureException(error: unknown) {
  if (env.SENTRY_DSN) Sentry.captureException(error);
}
