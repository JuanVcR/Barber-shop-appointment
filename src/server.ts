import fastify from "fastify";
import { startWhatsAppBot } from "./bot/whatsapp.js";

const app = fastify();

const barbershops = [
  'barbearia-Alpha',
  'barbershop-Odnan',
  'barbershop-Centro'
];

for (const id of barbershops) {
  startWhatsAppBot(id);
}

app.get('/', async (request, reply) => {
  return { ok: true };
});

app.listen({ port: 3000 }).then(() => {
  console.log('Server is running');
});