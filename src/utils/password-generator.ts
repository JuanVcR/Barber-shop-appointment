import crypto from 'node:crypto';

export function generateRandomPassword(length = 12): string {
  return crypto.randomBytes(length).toString('hex').slice(0, length);
}
