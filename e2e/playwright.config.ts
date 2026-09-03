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
      // The empty-state Waiting List spec needs the whole WaitingList table
      // clean at read time (see that file's own comment), so it runs in its
      // own project instead — excluded here to avoid running it twice.
      testIgnore: '**/waiting-list-empty-state.spec.ts',
    },
    {
      name: 'waiting-list-empty-state',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/waiting-list-empty-state.spec.ts',
      fullyParallel: false,
      // Runs only after every `chromium` test — including the rest of this
      // story's own — has finished writing to the WaitingList table, so its
      // "no entries at all" and "occurrence type omitted" checks read a table
      // nothing else is still populating.
      dependencies: ['chromium'],
    },
  ],
});
