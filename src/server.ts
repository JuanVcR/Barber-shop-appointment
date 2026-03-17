import { buildApp } from "./app.js";
import { env } from "./config/env.js";
import { createWhatsAppClient } from "./bot/whatsapp.js";
import { handleIncomingText } from "./bot/handlers.js";

async function bootstrap() {
  const app = buildApp();

console.log(await handleIncomingText('5511999999999', 'oi'));
console.log(await handleIncomingText('5511999999999', '1'));
console.log(await handleIncomingText('5511999999999', '3'));
console.log(await handleIncomingText('5511999999999', 'Joao'));


  const whatsapp = createWhatsAppClient();

  await whatsapp.initialize();

  await app.listen({
    port: env.PORT,
    host: '0.0.0.0'
  });

  console.log(`Server is running on port ${env.PORT}`);
}

bootstrap().catch((error) => {
  console.error(error);
  process.exit(1);  
});