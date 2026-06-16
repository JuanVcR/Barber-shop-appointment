import { prisma } from '../database/prisma.js';

export const barbershopRepository = {
  findPublic() {
    return prisma.barbershop.findMany({
      where: { setupCompleted: true },
      include: {
        workingHours: true,
        services: {
          include: {
            barbers: {
              include: {
                barber: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  },

  findMany() {
    return prisma.barbershop.findMany({
      include: {
        workingHours: true,
        services: {
          include: {
            barbers: {
              include: {
                barber: true,
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  },

  findBySlug(slug: string) {
    return prisma.barbershop.findUnique({
      where: { slug },
      include: {
        workingHours: true,
        services: {
          include: {
            barbers: {
              include: {
                barber: true,
              },
            },
          },
        },
      },
    });
  },

  findById(id: string) {
    return prisma.barbershop.findUnique({ where: { id } });
  },

  create(data: {
    name: string;
    slug: string;
    cnpj?: string | null;
    address?: string | null;
    plan?: 'FREE' | 'BASIC' | 'PRO';
    phoneOwner?: string | null;
    adminAccountId?: string;
  }) {
    return prisma.barbershop.create({
      data: {
        name: data.name,
        slug: data.slug,
        cnpj: data.cnpj,
        address: data.address,
        plan: data.plan ?? 'FREE',
        phoneOwner: data.phoneOwner,
        admins: data.adminAccountId
          ? {
              create: {
                accountId: data.adminAccountId,
              },
            }
          : undefined,
        workingHours: {
          createMany: {
            data: [1, 2, 3, 4, 5, 6].map((weekDay) => ({
              weekDay,
              startTime: '08:00',
              endTime: '18:00',
            })),
          },
        },
      },
      include: {
        admins: true,
        workingHours: true,
      },
    });
  },

  findAdmin(barbershopId: string, accountId: string) {
    return prisma.barbershopAdmin.findUnique({
      where: {
        accountId_barbershopId: {
          accountId,
          barbershopId,
        },
      },
    });
  },

  findWorkingHour(barbershopId: string, weekDay: number) {
    return prisma.barbershopWorkingHour.findUnique({
      where: {
        barbershopId_weekDay: {
          barbershopId,
          weekDay,
        },
      },
    });
  },

  upsertWorkingHours(data: {
    barbershopId: string;
    workingHours: Array<{
      weekDay: number;
      startTime: string;
      endTime: string;
    }>;
  }) {
    return prisma.$transaction(
      data.workingHours.map((item) =>
        prisma.barbershopWorkingHour.upsert({
          where: {
            barbershopId_weekDay: {
              barbershopId: data.barbershopId,
              weekDay: item.weekDay,
            },
          },
          update: {
            startTime: item.startTime,
            endTime: item.endTime,
          },
          create: {
            barbershopId: data.barbershopId,
            weekDay: item.weekDay,
            startTime: item.startTime,
            endTime: item.endTime,
          },
        })
      )
    );
  },

  markSetupCompleted(barbershopId: string) {
    return prisma.barbershop.update({
      where: { id: barbershopId },
      data: { setupCompleted: true },
    });
  },

  updateLocation(data: {
    barbershopId: string;
    latitude: number;
    longitude: number;
    address?: string;
  }) {
    return prisma.barbershop.update({
      where: { id: data.barbershopId },
      data: {
        latitude: data.latitude,
        longitude: data.longitude,
        address: data.address,
      },
    });
  },

  update(
    barbershopId: string,
    data: {
      name?: string;
      address?: string | null;
      phoneOwner?: string | null;
      plan?: 'FREE' | 'BASIC' | 'PRO';
      setupCompleted?: boolean;
      logoUrl?: string | null;
      coverUrl?: string | null;
    }
  ) {
    return prisma.barbershop.update({
      where: { id: barbershopId },
      data,
    });
  },

  async getReadiness(barbershopId: string) {
    const [workingHours, services, barbers] = await Promise.all([
      prisma.barbershopWorkingHour.count({ where: { barbershopId } }),
      prisma.service.count({ where: { barbershopId } }),
      prisma.barber.count({ where: { barbershopId } }),
    ]);

    return { workingHours, services, barbers };
  },
};
