import { defineConfig } from '@playwright/test';

// Short timeouts on purpose: upstream passes its whole suite in ~15 s, so a test that needs
// seconds here is a failing test, and long waits only make a low-parity run take half an hour.
export default defineConfig({
  testDir: './.work/test',
  testMatch: '**/*.js',
  testIgnore: ['fixtures.js', '**/.bundle/**'],
  fullyParallel: true,
  // CI runners are small: four workers there make the tests that assert on timing miss.
  workers: Number(process.env.HS_WORKERS || (process.env.CI ? 2 : 4)),
  timeout: 4_000,
  expect: { timeout: 1_200 },
  // As upstream's own config: one retry in CI, none locally.
  retries: process.env.CI ? 1 : 0,
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  reporter: [['json', { outputFile: process.env.HS_REPORT }]],
});
