import type { FastifyReply, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { barbershopService } from '../services/barbershop-service.js';
import crypto from 'node:crypto';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

const getRequester = (req: FastifyRequest) => ({
  accountId: req.user!.id,
  role: req.user!.role,
});

const slugParamsSchema = z.object({
  slug: z.string().min(1),
});

const createBarbershopSchema = z.object({
  name: z.string().min(2),
  slug: z.string().min(1),
  cnpj: z.string().min(14),
  address: z.string().min(3),
  plan: z.enum(['FREE', 'BASIC', 'PRO']).optional(),
  phoneOwner: z.string().min(10),
  admin: z.object({
    email: z.string().email(),
    password: z.string().min(6),
  }).optional(),
});

const barbershopParamsSchema = z.object({
  barbershopId: z.string().uuid(),
});

const locationParamsSchema = z.object({
  id: z.string().uuid(),
});

const barberInviteParamsSchema = barbershopParamsSchema.extend({
  inviteId: z.string().uuid(),
});

const updateLocationSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  reverseGeocode: z.boolean().optional(),
});

const serviceParamsSchema = barbershopParamsSchema.extend({
  serviceId: z.string().uuid(),
});

const createServiceSchema = z.object({
  name: z.string().min(2),
  price: z.number().positive(),
  duration: z.number().int().positive(),
  barberIds: z.array(z.string().min(1)).optional(),
});

const createBarberSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  phone: z.string().min(11),
  serviceIds: z.array(z.string().min(1)).optional(),
});

const setupBarbershopSchema = z.object({
  workingHours: z.array(z.object({
    weekDay: z.number().int().min(0).max(6),
    startTime: z.string().min(1),
    endTime: z.string().min(1),
  })).optional(),
  services: z.array(z.object({
    name: z.string().min(2),
    price: z.number().positive(),
    duration: z.number().int().positive(),
  })).optional(),
});

const updateServiceSchema = z.object({
  name: z.string().min(2).optional(),
  price: z.number().positive().optional(),
  duration: z.number().int().positive().optional(),
});

const workingHoursSchema = z.object({
  weekDay: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
});

const updateWorkingHoursSchema = z.object({
  workingHours: z.array(workingHoursSchema),
});

const updateBarbershopSchema = z.object({
  name: z.string().min(2).optional(),
  address: z.string().min(3).nullable().optional(),
  phoneOwner: z.string().min(10).nullable().optional(),
  plan: z.enum(['FREE', 'BASIC', 'PRO']).optional(),
  setupCompleted: z.boolean().optional(),
  logoUrl: z.string().url().nullable().optional(),
  coverUrl: z.string().url().nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'Informe ao menos um campo para atualizar',
});

const imageParamsSchema = barbershopParamsSchema.extend({
  type: z.enum(['logo', 'cover']),
});

function detectImageExtension(buffer: Buffer) {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpg';
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return 'webp';
  }

  return null;
}

export const barbershopController = {
  async list(req: FastifyRequest, reply: FastifyReply) {
    const barbershops = await barbershopService.list();

    return reply.send(barbershops);
  },

  async getBySlug(req: FastifyRequest, reply: FastifyReply) {
    const params = slugParamsSchema.parse(req.params);

    const barbershop = await barbershopService.getBySlug(params.slug);

    return reply.send(barbershop);
  },

  async create(req: FastifyRequest, reply: FastifyReply) {
    const body = createBarbershopSchema.parse(req.body);

    const barbershop = await barbershopService.create({
      requester: getRequester(req),
      ...body,
    });

    return reply.status(201).send(barbershop);
  },

  async createService(req: FastifyRequest, reply: FastifyReply) {
    const params = barbershopParamsSchema.parse(req.params);
    const body = createServiceSchema.parse(req.body);

    const service = await barbershopService.createService({
      requester: getRequester(req),
      barbershopId: params.barbershopId,
      ...body,
    });

    return reply.status(201).send(service);
  },

  async setup(req: FastifyRequest, reply: FastifyReply) {
    const params = barbershopParamsSchema.parse(req.params);
    const body = setupBarbershopSchema.parse(req.body);

    const barbershop = await barbershopService.setup({
      requester: getRequester(req),
      barbershopId: params.barbershopId,
      ...body,
    });

    return reply.send(barbershop);
  },

  async createBarber(req: FastifyRequest, reply: FastifyReply) {
    const params = barbershopParamsSchema.parse(req.params);
    const body = createBarberSchema.parse(req.body);

    const barber = await barbershopService.createBarber({
      requester: getRequester(req),
      barbershopId: params.barbershopId,
      ...body,
    });

    return reply.status(201).send(barber);
  },

  async listPendingBarberInvites(
    req: FastifyRequest,
    reply: FastifyReply
  ) {
    const params = barbershopParamsSchema.parse(req.params);
    const invites = await barbershopService.listPendingBarberInvites({
      requester: getRequester(req),
      barbershopId: params.barbershopId,
    });

    return reply.send(invites);
  },

  async cancelBarberInvite(req: FastifyRequest, reply: FastifyReply) {
    const params = barberInviteParamsSchema.parse(req.params);

    await barbershopService.cancelBarberInvite({
      requester: getRequester(req),
      barbershopId: params.barbershopId,
      inviteId: params.inviteId,
    });

    return reply.status(204).send();
  },

  async listServices(req: FastifyRequest, reply: FastifyReply) {
    const params = barbershopParamsSchema.parse(req.params);

    const services = await barbershopService.listServices(params.barbershopId);

    return reply.send(services);
  },

  async updateService(req: FastifyRequest, reply: FastifyReply) {
    const { barbershopId, serviceId } = serviceParamsSchema.parse(req.params);
    const body = updateServiceSchema.parse(req.body);

    const service = await barbershopService.updateService({
      requester: getRequester(req),
      serviceId,
      barbershopId,
      ...body,
    });

    return reply.send(service);
  },

  async deleteService(req: FastifyRequest, reply: FastifyReply) {
    const { barbershopId, serviceId } = serviceParamsSchema.parse(req.params);

    await barbershopService.deleteService({
      requester: getRequester(req),
      serviceId,
      barbershopId,
    });

    return reply.status(204).send();
  },

  async getWorkingHours(req: FastifyRequest, reply: FastifyReply) {
    const params = barbershopParamsSchema.parse(req.params);
    const { barbershopId } = params;

    const workingHours = await barbershopService.getWorkingHours(barbershopId);

    return reply.send(workingHours);
  },

  async updateWorkingHours(req: FastifyRequest, reply: FastifyReply) {
    const params = barbershopParamsSchema.parse(req.params);
    const { barbershopId } = params;
    const body = updateWorkingHoursSchema.parse(req.body);

    const workingHours = await barbershopService.updateWorkingHours({
      requester: getRequester(req),
      barbershopId,
      workingHours: body.workingHours,
    });

    return reply.send(workingHours);
  },

  async updateLocation(req: FastifyRequest, reply: FastifyReply) {
    const params = locationParamsSchema.parse(req.params);
    const body = updateLocationSchema.parse(req.body);

    const barbershop = await barbershopService.updateLocation({
      requester: getRequester(req),
      barbershopId: params.id,
      ...body,
    });

    return reply.send(barbershop);
  },

  async update(req: FastifyRequest, reply: FastifyReply) {
    const params = barbershopParamsSchema.parse(req.params);
    const body = updateBarbershopSchema.parse(req.body);

    const barbershop = await barbershopService.update({
      requester: getRequester(req),
      barbershopId: params.barbershopId,
      ...body,
    });

    return reply.send(barbershop);
  },

  async uploadImage(req: FastifyRequest, reply: FastifyReply) {
    const { barbershopId, type } = imageParamsSchema.parse(req.params);
    const file = await req.file();

    if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)) {
      throw new AppError('Envie uma imagem PNG, JPEG ou WebP', 400);
    }

    const buffer = await file.toBuffer();
    const extension = detectImageExtension(buffer);

    if (!extension) {
      throw new AppError('Arquivo invalido. Envie uma imagem real PNG, JPEG ou WebP', 400);
    }

    const directory = path.resolve(env.UPLOAD_DIR, 'barbershops');
    const filename = `${barbershopId}-${type}-${crypto.randomUUID()}.${extension}`;
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), buffer);
    const url = `${env.APP_URL}/uploads/barbershops/${filename}`;

    const barbershop = await barbershopService.update({
      requester: getRequester(req),
      barbershopId,
      ...(type === 'logo' ? { logoUrl: url } : { coverUrl: url }),
    });

    return reply.send(barbershop);
  },
};
