import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  // The public Petstore is shared and sometimes slow or inconsistent between nodes.
  retries: 2,
  timeout: 30_000,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'https://petstore.swagger.io/v2/',
    extraHTTPHeaders: { Accept: 'application/json' },
  },
});
