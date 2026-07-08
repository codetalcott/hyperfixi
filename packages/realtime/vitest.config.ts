import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // happy-dom provides Element / addEventListener so connection cleanup can
    // bind to owner elements and handler bodies can mutate a document.
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
});
