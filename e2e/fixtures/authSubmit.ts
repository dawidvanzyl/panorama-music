import type { Locator, Page } from '@playwright/test';
import { expect } from './base';

export interface HeldRequest {
  /** How many requests to the path have reached the browser's network layer. */
  count(): number;
  /** Lets every held request, and every later one, through. Safe to call twice. */
  release(): void;
}

/**
 * Holds every `POST` to `path` open until `release()` is called, so "the
 * request has not ended" is a state the test controls, not a race.
 */
export async function holdPost(page: Page, path: string): Promise<HeldRequest> {
  let sent = 0;
  let open: () => void = () => undefined;
  const gate = new Promise<void>((resolve) => {
    open = resolve;
  });

  await page.route(`**${path}`, async (route) => {
    if (route.request().method() !== 'POST') {
      await route.continue();
      return;
    }
    sent += 1;
    await gate;
    await route.continue().catch(() => undefined);
  });

  return { count: () => sent, release: () => open() };
}

/** Counts every `POST` to `path` the page sends. */
export function countPosts(page: Page, path: string): () => number {
  let sent = 0;
  page.on('request', (request) => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === path) sent += 1;
  });
  return () => sent;
}

/** The submit is enabled, not busy, reads `label` and holds no element at all. */
export async function expectSubmitAtRest(submit: Locator, label: string): Promise<void> {
  await expect(submit).toBeEnabled();
  await expect(submit).not.toHaveAttribute('aria-busy', 'true');
  await expect(submit).toHaveAccessibleName(label);
  await expect(submit.locator(':scope > *')).toHaveCount(0);
}

/** The submit is disabled and busy, still reads `label`, and its only element is the loading icon. */
export async function expectSubmitLoading(submit: Locator, label: string): Promise<void> {
  await expect(submit).toBeDisabled();
  await expect(submit).toHaveAttribute('aria-busy', 'true');
  await expect(submit).toHaveAccessibleName(label);
  const children = submit.locator(':scope > *');
  await expect(children).toHaveCount(1);
  await expect(children.first()).toHaveAttribute('data-testid', 'button-loading-icon');
}
