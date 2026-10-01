import { defineConfig } from '@playwright/test';

// Short timeouts on purpose: upstream passes its whole suite in ~15 s, so a test that needs
// seconds here is a failing test, and long waits only make a low-parity run take half an hour.
export default defineConfig({
  testDir: './.work/test',
  testMatch: '**/*.js',
  testIgnore: ['fixtures.js', '**/.bundle/**'],
  fullyParallel: true,
  workers: Number(process.env.HS_WORKERS || 4),
  timeout: 4_000,
  expect: { timeout: 1_200 },
  retries: 0,
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  reporter: [['json', { outputFile: process.env.HS_REPORT }]],
});
