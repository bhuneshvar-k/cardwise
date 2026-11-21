import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/lib/**/*.ts', 'src/hooks/**/*.ts', 'src/features/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}'],
      // Logic and the picker are unit-tested here. The cards, spends and settings screens are
      // covered by the Playwright suite in e2e/, so they are reported but not gated.
      thresholds: {
        'src/lib/**': { lines: 80, branches: 75, functions: 80, statements: 80 },
        'src/features/picker/**': { lines: 80, branches: 75, functions: 80, statements: 80 },
      },
    },
  },
});
