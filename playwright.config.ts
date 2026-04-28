import { defineConfig } from '@playwright/test';

const port = Number(process.env.PORT ?? 3774);
const localBaseURL = `http://127.0.0.1:${port}`;
const baseURL = process.env.BASE_URL ?? localBaseURL;
const shouldStartLocalServer = !process.env.BASE_URL && process.env.PLAYWRIGHT_SKIP_WEBSERVER !== '1';

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  fullyParallel: true,
  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],
  use: {
    baseURL,
    extraHTTPHeaders: {
      Accept: 'application/json'
    }
  },
  ...(shouldStartLocalServer
    ? {
        webServer: {
          command: `PORT=${port} npm run start`,
          url: `${localBaseURL}/`,
          reuseExistingServer: !process.env.CI,
          timeout: 15_000,
          stdout: 'pipe' as const,
          stderr: 'pipe' as const
        }
      }
    : {})
});
