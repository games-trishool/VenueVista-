import { defineConfig } from '@playwright/test';

// These tests use running services and real PostgreSQL records. No API mocking.
// Start API :4000, Admin :3000, Customer web :8081 and Partner web :8082 first.
// PLAYWRIGHT_CONTAINER=true permits Chromium without its own sandbox only inside
// the isolated execution container; leave it unset on normal workstations.
const inContainer = process.env.PLAYWRIGHT_CONTAINER === 'true';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 240_000,
  expect: { timeout: 25_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  outputDir: 'test-results/browser',
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    headless: true,
    viewport: { width: 1280, height: 960 },
    actionTimeout: 20_000,
    navigationTimeout: 60_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || '/usr/bin/chromium',
      chromiumSandbox: !inContainer,
      args: inContainer ? ['--no-sandbox', '--disable-dev-shm-usage'] : [],
    },
  },
});
