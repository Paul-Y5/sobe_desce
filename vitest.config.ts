import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['shared/**/*.test.ts', 'server/**/*.test.ts'],
    testTimeout: 15000,
    coverage: {
      provider: 'v8',
      include: ['shared/engine.ts', 'server/rooms.ts'],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 },
    },
  },
});
