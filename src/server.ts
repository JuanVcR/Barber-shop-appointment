/// <reference types="node" />
import 'dotenv/config';
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { initializeMonitoring } from './config/monitoring.js';

async function bootstrap() {
  initializeMonitoring();
  const app = await buildApp();

  await app.listen({
    port: env.PORT,
    host: '0.0.0.0',
  });

  console.log(`Server is running on port ${env.PORT}`);

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, 'Shutting down');
    await app.close();
    process.exit(0);
  };

  process.once('SIGINT', () => void shutdown('SIGINT'));
  process.once('SIGTERM', () => void shutdown('SIGTERM'));
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
