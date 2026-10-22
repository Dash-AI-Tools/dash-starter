import { defineConfig, devices } from '@playwright/test'

/**
 * The origin the web app is published on. The suite drives the browser, so
 * the API is only reached through the proxy of the dev server.
 */
const WEB_URL = process.env.E2E_WEB_URL ?? 'http://localhost:5174'

export default defineConfig({
  testDir: './specs',

  /**
   * The flows share the stack and the database, so they run one after the
   * other: a parallel run would fight for the same rows.
   */
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],

  use: {
    baseURL: WEB_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
