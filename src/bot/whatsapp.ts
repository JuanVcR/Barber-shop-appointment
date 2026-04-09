import pkg from 'whatsapp-web.js';
import { handleIncomingText } from './handlers.js';

const { Client, LocalAuth } = pkg;

export function startWhatsAppBot(barbershopId: string) {
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: barbershopId,
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    },
  });

  client.on('qr', (qr) => {
    console.log(`QR Code (${barbershopId}):`, qr);
  });

  client.on('ready', () => {
    console.log(`Whatsapp conectado (${barbershopId})`);
  });

  client.on('message', async (message) => {
    if (message.fromMe) return;
    if (message.from.includes('@g.us')) return;

    const reply = await handleIncomingText(
      message.from,
      message.body,
      barbershopId
    );

    await message.reply(reply);
  });

  client.initialize();
}
