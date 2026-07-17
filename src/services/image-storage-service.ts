import crypto from 'node:crypto';
import path from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import { env } from '../config/env.js';
import { AppError } from '../errors/app-error.js';

type UploadImageInput = {
  buffer: Buffer;
  contentType: string;
  filename: string;
  folder: string;
};

function signCloudinaryParams(params: Record<string, string | number>) {
  const payload = Object.entries(params)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('&');

  return crypto
    .createHash('sha1')
    .update(`${payload}${env.CLOUDINARY_API_SECRET}`)
    .digest('hex');
}

async function uploadToCloudinary(input: UploadImageInput) {
  const cloudName = env.CLOUDINARY_CLOUD_NAME;
  const apiKey = env.CLOUDINARY_API_KEY;

  if (!cloudName || !apiKey || !env.CLOUDINARY_API_SECRET) {
    throw new AppError('Storage externo nao configurado', 500);
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const publicId = input.filename.replace(/\.[^.]+$/, '');
  const folder = `${env.CLOUDINARY_UPLOAD_FOLDER}/${input.folder}`;
  const signature = signCloudinaryParams({
    folder,
    public_id: publicId,
    timestamp,
  });

  const formData = new FormData();
  const fileBytes = new Uint8Array(input.buffer);
  const file = new File([fileBytes], input.filename, { type: input.contentType });
  formData.append('file', file);
  formData.append('api_key', apiKey);
  formData.append('timestamp', String(timestamp));
  formData.append('folder', folder);
  formData.append('public_id', publicId);
  formData.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new AppError('Falha ao enviar imagem para o storage externo', 502);
  }

  const result = await response.json() as { secure_url?: string };

  if (!result.secure_url) {
    throw new AppError('Storage externo nao retornou URL segura', 502);
  }

  return result.secure_url;
}

async function uploadToLocalDisk(input: UploadImageInput) {
  const directory = path.resolve(env.UPLOAD_DIR, input.folder);
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, input.filename), input.buffer);
  return `${env.APP_URL}/uploads/${input.folder}/${input.filename}`;
}

export const imageStorageService = {
  upload(input: UploadImageInput) {
    if (env.STORAGE_DRIVER === 'cloudinary') {
      return uploadToCloudinary(input);
    }

    return uploadToLocalDisk(input);
  },
};
