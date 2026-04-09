import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '../src/database/prisma.js';

async function main() {
  const userPassword = await bcrypt.hash('123456', 10);
  const barberPassword = await bcrypt.hash('123456', 10);

  const barbershop = await prisma.barbershop.upsert({
    where: { slug: 'barbearia-alpha' },
    update: {},
    create: {
      name: 'Barbearia Alpha',
      slug: 'barbearia-alpha',
      phoneOwner: '5581999999999',
    },
  });

  const user = await prisma.user.upsert({
    where: { email: 'cliente@teste.com' },
    update: {},
    create: {
      name: 'Cliente Teste',
      email: 'cliente@teste.com',
      phone: '5581999999999',
      password: userPassword,
    },
  });

  const barber = await prisma.barber.upsert({
    where: { email: 'carlos@barber.com' },
    update: {},
    create: {
      name: 'Carlos',
      email: 'carlos@barber.com',
      phone: '5581888888888',
      password: barberPassword,
      barbershopId: barbershop.id,
    },
  });

  const existingService = await prisma.service.findFirst({
    where: {
      barbershopId: barbershop.id,
      name: 'Corte',
    },
  });

  const service =
    existingService ??
    (await prisma.service.create({
      data: {
        name: 'Corte',
        price: 35,
        duration: 40,
        barbershopId: barbershop.id,
      },
    }));

  await prisma.barberService.upsert({
    where: {
      barberId_serviceId: {
        barberId: barber.id,
        serviceId: service.id,
      },
    },
    update: {},
    create: {
      barberId: barber.id,
      serviceId: service.id,
    },
  });

  console.log({
    barbershopId: barbershop.id,
    userId: user.id,
    barberId: barber.id,
    serviceId: service.id,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
