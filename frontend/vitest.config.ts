import { fileURLToPath } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    exclude: ['e2e/**', 'node_modules/**', '.next/**'],
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'html'],
      include: [
        'src/components/admin/AdminShell.tsx',
        'src/components/admin/AdminOperationsScreen.tsx',
        'src/lib/api.ts',
      ],
      thresholds: {
        lines: 80,
        branches: 80,
      },
    },
  },
});
