import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // happy-dom gives us a browser-like window/navigator; we inject a mock
    // `navigator.serviceWorker` in integration tests since happy-dom doesn't
    // ship one.
    environment: 'happy-dom',
    include: ['src/**/*.test.ts'],
  },
});
