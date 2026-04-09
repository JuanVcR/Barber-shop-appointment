import 'dotenv/config';
import { buildApp } from './app.js';
import { env } from './config/env.js';
import { startWhatsAppBot } from './bot/whatsapp.js';

async function bootstrap() {
  const app = await buildApp();

  await app.listen({
    port: env.PORT,
    host: '0.0.0.0',
  });

  if (env.ENABLE_WHATSAPP) {
    const barbershopIds = [
      'barbearia-alpha',
      'barbearia-odnan',
      'barbearia-centro',
    ];

    for (const id of barbershopIds) {
      startWhatsAppBot(id);
    }
  }

  console.log(`Server is running on port ${env.PORT}`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);
});
