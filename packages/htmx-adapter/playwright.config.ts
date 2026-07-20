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

// Serves the REPO root so fixtures can reference both this package's
// dist/ and packages/core/vocab/htmx/ vocab modules. Port is unique to
// this package to avoid clashing with other suites' servers.
export default defineConfig({
  testDir: './test/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['list']],

  use: {
    baseURL: 'http://localhost:3009',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH }
      : existsSync(PINNED_CHROMIUM)
        ? { executablePath: PINNED_CHROMIUM }
        : {},
  },

  webServer: {
    command: 'npx http-server ../.. -p 3009 -c-1 -s',
    port: 3009,
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
    cwd: __dirname,
  },

  timeout: 30000,
});
