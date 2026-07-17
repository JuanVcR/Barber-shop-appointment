import 'dotenv/config';
import { env } from '../src/config/env.js';
import { prisma } from '../src/database/prisma.js';
import { verifyMailer } from '../src/lib/mailer.js';

const checks: Array<{ name: string; run: () => Promise<void> | void }> = [
  {
    name: 'environment',
    run: () => {
      if (env.NODE_ENV !== 'production') {
        throw new Error('NODE_ENV must be production');
      }
    },
  },
  {
    name: 'database',
    run: async () => {
      await prisma.$queryRaw`SELECT 1`;
    },
  },
  {
    name: 'mailer',
    run: async () => {
      await verifyMailer();
    },
  },
];

for (const check of checks) {
  try {
    await check.run();
    console.log(`OK ${check.name}`);
  } catch (error) {
    console.error(`FAIL ${check.name}`);
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
    break;
  }
}

await prisma.$disconnect();
