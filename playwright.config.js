import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser',
  use: {
    baseURL: 'http://127.0.0.1:8080',
    viewport: { width: 768, height: 1024 },
    launchOptions: process.env.NTAREI_CHROME_PATH
      ? { executablePath: process.env.NTAREI_CHROME_PATH } : {},
  },
  webServer: { command: '/usr/bin/python3 -m http.server 8080 --bind 127.0.0.1', port: 8080 },
});
