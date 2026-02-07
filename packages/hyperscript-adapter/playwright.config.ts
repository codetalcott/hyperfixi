import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  testDir: './test/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],

  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
  },

  projects: [
    {
      name: 'smoke',
      grep: /@smoke/,
      timeout: 10000,
    },
    {
      name: 'quick',
      grep: /@quick|@smoke/,
      timeout: 15000,
    },
    {
      name: 'full',
      grepInvert: /@skip/,
      timeout: 30000,
    },
  ],

  webServer: {
    command: 'npx http-server ../.. -p 3000 -c-1',
    port: 3000,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    cwd: __dirname,
  },

  timeout: 30000,
});
