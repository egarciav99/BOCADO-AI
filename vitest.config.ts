import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    exclude: ['node_modules/', 'functions/node_modules/', 'e2e/', '**/playwright/**'],
    include: ['src/**/*.test.ts', 'api/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
      exclude: ['node_modules/', 'functions/', 'src/test/', 'e2e/'],
    },
  },
});
