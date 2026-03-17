import qrcode from 'qrcode-terminal';
import pkg from 'whatsapp-web.js';
import { handleIncomingText } from './handlers.js';

const { Client, LocalAuth } = pkg;

export function createWhatsAppClient() {
  const client = new Client({
    authStrategy: new LocalAuth({
      clientId: 'barbearia-principal',
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
  });

  client.on('qr', (qr) => {
    console.log('Escaneie o QR Code abaixo:');
    qrcode.generate(qr, { small: true });
  });

  client.on('ready', () => {
    console.log('WhatsApp Conectado com Sucesso!');
  });

  client.on('authenticated', async (message) => {
    console.log('Autenticado com Sucesso!');
  });

  client.on('auth_failure', (message) => {
    console.error('Falha na autenticação:', message);
  });

  client.on('message', async (message) => {
    if (message.fromMe) return;
    if (message.from.includes('@g.us')) return;

    const reply = await handleIncomingText(message.from, message.body);
    await message.reply(reply);
  });

  return client;
}
