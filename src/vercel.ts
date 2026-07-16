import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildApp } from './app.js';
import { initializeMonitoring } from './config/monitoring.js';

let appPromise: ReturnType<typeof buildApp> | undefined;

async function getApp() {
  if (!appPromise) {
    initializeMonitoring();
    appPromise = buildApp();
  }

  return appPromise;
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
) {
  const app = await getApp();
  await app.ready();
  app.server.emit('request', req, res);
}
