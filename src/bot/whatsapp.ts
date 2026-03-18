import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;

import { handleIncomingText } from './handlers.js';

export function startWhatsAppBot(barbershopId: string) {
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: barbershopId,
    }),
  });
  client.on('qr', qr => {
    console.log ('QR Code (${barbershopId}):', qr);
  });
  client.on('ready', () => {
    console.log('Whatsapp Conectado (${barbershopId})');
  });
  client.on('message', async (message) => {

    const reply = await handleIncomingText(
      message.from,
      message.body,
      barbershopId
    );
    message.reply(reply
    )
  });
    client.initialize();
}