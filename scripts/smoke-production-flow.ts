import { readFile } from 'node:fs/promises';

const apiUrl = process.env.SMOKE_API_URL;
const adminEmail = process.env.SMOKE_SUPER_ADMIN_EMAIL;
const adminPassword = process.env.SMOKE_SUPER_ADMIN_PASSWORD;

if (!apiUrl || !adminEmail || !adminPassword) {
  throw new Error('Defina SMOKE_API_URL, SMOKE_SUPER_ADMIN_EMAIL e SMOKE_SUPER_ADMIN_PASSWORD');
}

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...options.headers,
    },
  });

  if (!response.ok) {
    throw new Error(`${options.method ?? 'GET'} ${path} falhou: ${response.status} ${await response.text()}`);
  }

  return response.headers.get('content-type')?.includes('application/json')
    ? response.json()
    : response.text();
}

const health = await request('/health');
console.log('health:', health.ok ? 'ok' : 'falhou');

const login = await request('/api/auth/login', {
  method: 'POST',
  body: JSON.stringify({ email: adminEmail, password: adminPassword }),
});

const auth = { Authorization: `Bearer ${login.token}` };
const shops = await request('/api/admin/barbershops', { headers: auth });
console.log(`barbearias admin: ${shops.length}`);

if (process.env.SMOKE_BARBERSHOP_ID && process.env.SMOKE_IMAGE_PATH) {
  const form = new FormData();
  const bytes = await readFile(process.env.SMOKE_IMAGE_PATH);
  form.append('file', new Blob([bytes]), 'smoke.webp');

  await request(`/api/admin/barbershops/${process.env.SMOKE_BARBERSHOP_ID}/images/logo`, {
    method: 'POST',
    headers: auth,
    body: form,
  });
  console.log('upload logo: ok');
}

console.log('smoke test finalizado');
