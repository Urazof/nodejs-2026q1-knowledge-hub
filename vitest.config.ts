import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: [
        'src/main.ts',
        'src/**/*.module.ts',
        'src/**/*.controller.ts', // covered by e2e tests
        'src/**/*.dto.ts',
        'src/**/*.model.ts',
        'src/**/*.enum.ts',
        'src/app.service.ts',
        'src/prisma/**',
        'src/storage/**',
        'src/auth/decorators/**',
        'src/common/logger/**', // wraps ConsoleLogger + fs I/O — tested via integration
      ],
      thresholds: {
        lines: 90,
        branches: 85,
      },
      reporter: ['text', 'lcov'],
    },
  },
});
