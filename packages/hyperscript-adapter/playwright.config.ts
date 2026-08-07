import { defineConfig, devices } from '@playwright/test';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Managed remote environments pre-install Chromium behind a stable
// symlink; its build number may not match this @playwright/test pin, so
// default resolution fails there. Prefer the symlink when present; CI
// and dev machines (no symlink) use normal resolution after
// `npx playwright install chromium`.
const PINNED_CHROMIUM = '/opt/pw-browsers/chromium';

// Serves the REPO root so the fixture can reference this package's
// dist/ bundle. Port is unique to this package to avoid clashing with
// other suites' servers (core uses 3000, htmx-adapter 3009) — they run
// as sequential steps of the same CI job.
export default defineConfig({
  testDir: './test/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],

  use: {
    baseURL: 'http://localhost:3010',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : existsSync(PINNED_CHROMIUM)
        ? { executablePath: PINNED_CHROMIUM }
        : {},
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
    command: 'npx http-server ../.. -p 3010 -c-1 -s',
    port: 3010,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    cwd: __dirname,
  },

  timeout: 30000,
});
