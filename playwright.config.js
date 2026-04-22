const { defineConfig } = require('@playwright/test');
const { TEST_DB_PATH } = require('./e2e/globalSetup');

// Use a dedicated port for the test backend so it never collides with a
// locally-running dev server or the docker-compose container on 5001.
const BACKEND_PORT = process.env.PORT || 5002;

module.exports = defineConfig({
  testDir: './e2e',
  timeout: 60000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'html',
  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    trace: 'on-first-retry',
    video: 'on',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        launchOptions: { slowMo: 250 },
      },
    },
  ],
  webServer: [
    {
      command: `node server/server.js`,
      // Pin presence thresholds to the fast values the e2e tests assume.
      // Production defaults are much longer (see server/db.js).
      // DB_PATH points the server at an isolated test DB (wiped by globalSetup).
      env: {
        NODE_ENV: 'test',
        PORT: String(BACKEND_PORT),
        DB_PATH: TEST_DB_PATH,
        OFFLINE_THRESHOLD_S: '15',
        AUTO_SKIP_TURN_S: '30',
        AUTO_TRANSFER_OWNER_S: '60',
      },
      url: `http://localhost:${BACKEND_PORT}/api/health`,
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: `npm run dev:client`,
      // Tell Vite to proxy /api to the test backend port above rather than
      // the default 5001, so tests work regardless of what's on 5001.
      env: {
        VITE_PROXY_TARGET: `http://localhost:${BACKEND_PORT}`,
      },
      url: 'http://localhost:3000',
      reuseExistingServer: !process.env.CI,
      timeout: 30000,
    },
  ],
});
