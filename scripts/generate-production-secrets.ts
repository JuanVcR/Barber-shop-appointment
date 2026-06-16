import crypto from 'node:crypto';

console.log('JWT_SECRET=' + crypto.randomBytes(48).toString('base64'));
console.log('JWT_REFRESH_SECRET=' + crypto.randomBytes(48).toString('base64'));
