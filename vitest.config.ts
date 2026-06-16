import { defineConfig } from 'vitest/config';

export default defineConfig({
  cacheDir: '/tmp/projeto-chatboot-vitest',
  test: {
    environment: 'node',
    globals: true,
    clearMocks: true,
    restoreMocks: true,
    mockReset: true,
    tsconfig: './tsconfig.test.json',
    exclude: ['dist/**', 'node_modules/**'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
