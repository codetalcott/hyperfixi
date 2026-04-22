import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // happy-dom gives us a browser-like environment with window/document,
    // and lets us inject a SpeechSynthesis mock onto the global.
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
});
