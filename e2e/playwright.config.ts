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

const GLOBAL_REVOKE_SPEC = '**/revoke-all-sessions.spec.ts';

export default defineConfig({
  testDir: './features',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 4 : undefined,
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
      testIgnore: ['**/waiting-list-empty-state.spec.ts', GLOBAL_REVOKE_SPEC],
      teardown: 'global-revoke',
    },
    {
      name: 'waiting-list-empty-state',
      use: { ...devices['Desktop Chrome'] },
      testMatch: '**/waiting-list-empty-state.spec.ts',
      // Serial, single-worker: the three scenarios in this file each
      // truncate the WaitingList table for themselves (see that file's own
      // comment) rather than depending on the `chromium` project finishing
      // first — a `dependencies: ['chromium']` wiring was tried and dropped:
      // it forces the *entire* chromium project to re-run as a prerequisite
      // even for a single-code `--grep` invocation, which is both far more
      // expensive than the QA loop can afford and, by re-running
      // already-passed specs, mutates the very table these tests need clean.
      // Running the whole suite in one shot (no --grep) can still interleave
      // the two projects' workers; running each IT code through its own
      // `--grep` invocation, as the QA process does, does not.
      fullyParallel: false,
      teardown: 'global-revoke',
    },
    {
      // "Revoke All" ends every session in the system, including the ones
      // other specs are signed in with. It runs as the teardown of the other
      // projects, so it starts only after they finish and still runs when
      // some of their tests fail. A single-code `--grep` run filters it like
      // any other project, so it costs nothing there.
      name: 'global-revoke',
      use: { ...devices['Desktop Chrome'] },
      testMatch: GLOBAL_REVOKE_SPEC,
      fullyParallel: false,
    },
  ],
});
