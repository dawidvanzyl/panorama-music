import { existsSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, devices } from '@playwright/test';

// Load the repository .env (untracked, per-worktree) so the QA_* port
// variables that configure docker-compose.yml also reach this config and
// the fixtures, keeping both in sync with a single source per worktree.
const repoEnvPath = path.resolve(import.meta.dirname, '../.env');
if (existsSync(repoEnvPath)) {
  process.loadEnvFile(repoEnvPath);
}

export default defineConfig({
  testDir: './features',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'html',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? `http://localhost:${process.env.QA_API_PORT ?? 3000}`,
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
