import { prisma } from '../database/prisma.js';

export const barberRepository = {
  findById(id: string) {
    return prisma.barber.findUnique({
      where: { id },
      include: {
        account: true,
        services: { include: { service: true } },
        availability: true,
        barbershop: true,
      },
    });
  },

  findByAccountId(accountId: string) {
    return prisma.barber.findUnique({
      where: { accountId },
      include: {
        account: true,
        services: { include: { service: true } },
        availability: true,
        barbershop: true,
      },
    });
  },

  update(id: string, data: {
    name?: string;
    phone?: string;
  }) {
    return prisma.barber.update({
      where: { id },
      data,
      include: {
        account: true,
        services: { include: { service: true } },
        availability: true,
        barbershop: true,
      }
    });
  },

  delete(id: string) {
    return prisma.barber.delete({
      where: { id },
    });
  },

  async replaceServices(barberId: string, serviceIds: string[]) {
    return prisma.$transaction(async (tx) => {
      await tx.barberService.deleteMany({ where: { barberId } });

      if (serviceIds.length) {
        await tx.barberService.createMany({
          data: serviceIds.map((serviceId) => ({ barberId, serviceId })),
        });
      }

      return tx.barber.findUnique({
        where: { id: barberId },
        include: {
          account: true,
          services: { include: { service: true } },
          availability: true,
          barbershop: true,
        },
      });
    });
  },

  findFirstByBarbershopId(barbershopId: string) {
    return prisma.barber.findFirst({
      where: { barbershopId },
      orderBy: { createdAt: 'asc' },
    });
  },

  findManyByBarbershopId(barbershopId: string) {
    return prisma.barber.findMany({
      where: { barbershopId },
      orderBy: { name: 'asc' },
      include: {
        account: true,
        services: { include: { service: true } },
        availability: true,
        barbershop: true,
      },
    });
  },

  create(data: {
    accountId: string;
    name: string;
    phone: string;
    barbershopId: string;
    serviceIds?: string[];
  }) {
    return prisma.barber.create({
      data: {
        accountId: data.accountId,
        name: data.name,
        phone: data.phone,
        barbershopId: data.barbershopId,
        services: data.serviceIds?.length
          ? {
              createMany: {
                data: data.serviceIds.map((serviceId) => ({ serviceId })),
              },
            }
          : undefined,
      },
      include: {
        account: true,
        services: {
          include: {
            service: true,
          },
        },
      },
    });
  },

  upsertAvailability(data: {
    barberId: string;
    availability: Array<{
      weekDay: number;
      startTime: string;
      endTime: string;
    }>;
  }) {
    return prisma.$transaction(
      data.availability.map((item) =>
        prisma.barberAvailability.upsert({
          where: {
            barberId_weekDay: {
              barberId: data.barberId,
              weekDay: item.weekDay,
            },
          },
          update: {
            startTime: item.startTime,
            endTime: item.endTime,
          },
          create: {
            barberId: data.barberId,
            weekDay: item.weekDay,
            startTime: item.startTime,
            endTime: item.endTime,
          },
        })
      )
    );
  },

  async replaceAvailability(
    barberId: string,
    availability: Array<{
      weekDay: number;
      startTime: string;
      endTime: string;
    }>
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.barberAvailability.deleteMany({
        where: { barberId },
      });

      if (!availability.length) {
        return [];
      }

      await tx.barberAvailability.createMany({
        data: availability.map((item) => ({
          barberId,
          weekDay: item.weekDay,
          startTime: item.startTime,
          endTime: item.endTime,
        })),
      });

      return tx.barberAvailability.findMany({
        where: { barberId },
        orderBy: { weekDay: 'asc' },
      });
    });
  },

  findAvailability(barberId: string, weekDay: number) {
    return prisma.barberAvailability.findUnique({
      where: {
        barberId_weekDay: {
          barberId,
          weekDay,
        },
      },
    });
  },

findBlocksByBarberDay(barberId: string, day: string) {
  return prisma.barberBlock.findMany({
    where: { barberId, day },
    orderBy: [{ startTime: 'asc' }, { createdAt: 'asc' }],
  });
},

findBlocksByBarber(barberId: string) {
  return prisma.barberBlock.findMany({
    where: { barberId },
    orderBy: [{ day: 'asc' }, { startTime: 'asc' }],
  });
},

createBlock(data: {
  barberId: string;
  day: string;
  startTime?: string | null;
  endTime?: string | null;
  reason?: string | null;
}) {
  return prisma.barberBlock.create({
    data,
  });
},

deleteBlock(id: string) {
  return prisma.barberBlock.delete({
    where: { id },
  });
},

findBlockById(id: string) {
  return prisma.barberBlock.findUnique({
    where: { id },
    include: { barber: true },
    });
  },
};
