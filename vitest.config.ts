import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'src/**/*.spec.ts', 'src/**/*.test.tsx', 'src/**/*.spec.tsx'],
    setupFiles: ['src/renderer/src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      exclude: [
        'src/main/index.ts',
        'src/main/db/client.ts',
        'src/main/ipc/register.ts',
        'src/renderer/src/main.tsx',
        'src/renderer/src/components/ui/**',
        'src/renderer/src/App.tsx',
        'src/renderer/src/test/**',
        '**/*.config.*',
        '**/*.d.ts',
      ],
      thresholds: {
        statements: 80,
        branches: 75,
        functions: 85,
        lines: 80,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src/renderer/src'),
      '@renderer': resolve(__dirname, 'src/renderer/src'),
      '@shared': resolve(__dirname, 'src/shared'),
    },
  },
});
