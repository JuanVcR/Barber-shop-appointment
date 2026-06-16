import 'dotenv/config';
import bcrypt from 'bcrypt';
import { prisma } from '../src/database/prisma.js';

async function main() {
  const clientPassword = await bcrypt.hash('123456', 10);
  const barberPassword = await bcrypt.hash('123456', 10);
  const adminPassword = await bcrypt.hash('123456', 10);
  const superAdminPassword = await bcrypt.hash('123456', 10);

  await prisma.account.upsert({
    where: { email: 'super@admin.com' },
    update: {},
    create: {
      email: 'super@admin.com',
      password: superAdminPassword,
      role: 'SUPER_ADMIN',
    },
  });

  const adminAccount = await prisma.account.upsert({
    where: { email: 'admin@barbearia.com' },
    update: {},
    create: {
      email: 'admin@barbearia.com',
      password: adminPassword,
      role: 'BARBERSHOP_ADMIN',
    },
  });

  const barbershop = await prisma.barbershop.upsert({
    where: { slug: 'barbearia-alpha' },
    update: {},
    create: {
      name: 'Barbearia Alpha',
      slug: 'barbearia-alpha',
      phoneOwner: '5581999999999',
    },
  });

  await prisma.barbershopAdmin.upsert({
    where: {
      accountId_barbershopId: {
        accountId: adminAccount.id,
        barbershopId: barbershop.id,
      },
    },
    update: {},
    create: {
      accountId: adminAccount.id,
      barbershopId: barbershop.id,
    },
  });

  for (const weekDay of [1, 2, 3, 4, 5, 6]) {
    await prisma.barbershopWorkingHour.upsert({
      where: {
        barbershopId_weekDay: {
          barbershopId: barbershop.id,
          weekDay,
        },
      },
      update: {},
      create: {
        barbershopId: barbershop.id,
        weekDay,
        startTime: '08:00',
        endTime: '18:00',
      },
    });
  }

  const clientAccount = await prisma.account.upsert({
    where: { email: 'cliente@teste.com' },
    update: {},
    create: {
      email: 'cliente@teste.com',
      password: clientPassword,
      role: 'CLIENT',
    },
  });

  const client = await prisma.client.upsert({
    where: { accountId: clientAccount.id },
    update: {},
    create: {
      accountId: clientAccount.id,
      name: 'Cliente Teste',
      phone: '5581999999999',
      cpf: '12345678901',
    },
  });

  const barberAccount = await prisma.account.upsert({
    where: { email: 'carlos@barber.com' },
    update: {},
    create: {
      email: 'carlos@barber.com',
      password: barberPassword,
      role: 'BARBER',
    },
  });

  const barber = await prisma.barber.upsert({
    where: { accountId: barberAccount.id },
    update: {},
    create: {
      accountId: barberAccount.id,
      name: 'Carlos',
      phone: '5581888888888',
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
    clientAccountId: clientAccount.id,
    clientId: client.id,
    adminAccountId: adminAccount.id,
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
