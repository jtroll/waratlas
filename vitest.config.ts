import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./', import.meta.url)),
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    // The data test parses ~19 MB of JSON and runs both validators.
    testTimeout: 60_000,
    hookTimeout: 60_000,
  },
});
