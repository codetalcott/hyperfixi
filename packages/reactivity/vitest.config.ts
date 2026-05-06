import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // happy-dom provides Element / parentElement / addEventListener so
    // signals.ts can walk the DOM for `^name` resolution and attach
    // input/change listeners for bind's DOM-tracking effects.
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
});
