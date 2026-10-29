import type { Locator, Page } from '@playwright/test';
import { expect } from './base';

/** A gap, in pixels, between the clicked point and the modal card's edge. */
const BACKDROP_GAP = 16;

/**
 * Clicks the dimmed area at a point outside the card's measured box: left of
 * the card and then above it. The box is read in the browser first, so the
 * point does not depend on any width the stylesheet chooses.
 */
export async function clickBackdropLeftThenAbove(
  page: Page,
  card: Locator,
  afterEach: () => Promise<void>,
): Promise<void> {
  await expect(card).toBeVisible();
  const box = await card.boundingBox();
  expect(box, 'the modal card has a box').not.toBeNull();
  const { x, y, width, height } = box!;
  const viewport = page.viewportSize();
  expect(viewport, 'the page has a viewport').not.toBeNull();

  const centreY = y + height / 2;
  const centreX = x + width / 2;
  const left = x >= BACKDROP_GAP ? { x: x - BACKDROP_GAP, y: centreY } : null;
  const right =
    x + width + BACKDROP_GAP <= viewport!.width
      ? { x: x + width + BACKDROP_GAP, y: centreY }
      : null;
  const above = y >= BACKDROP_GAP ? { x: centreX, y: y - BACKDROP_GAP } : null;
  const below =
    y + height + BACKDROP_GAP <= viewport!.height
      ? { x: centreX, y: y + height + BACKDROP_GAP }
      : null;

  const first = left ?? right;
  const second = above ?? below;
  expect(first, 'room beside the card for a backdrop click').not.toBeNull();
  expect(second, 'room above or below the card for a backdrop click').not.toBeNull();

  await page.mouse.click(first!.x, first!.y);
  await afterEach();
  await page.mouse.click(second!.x, second!.y);
  await afterEach();
}

/** Counts the requests of one method to one path the page sends. */
export function countRequests(page: Page, method: string, path: string): () => number {
  let sent = 0;
  page.on('request', (request) => {
    if (request.method() === method && new URL(request.url()).pathname === path) sent += 1;
  });
  return () => sent;
}

/**
 * Takes over every request of one method to one path and never passes it on,
 * counting each. A wrongly wired control then fails through the count and
 * cannot change the shared record it points at.
 */
export async function blockRequests(
  page: Page,
  method: string,
  path: string,
): Promise<() => number> {
  let received = 0;
  await page.route(
    (url) => url.pathname === path,
    async (route) => {
      if (route.request().method() !== method) {
        await route.fallback();
        return;
      }
      received += 1;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Blocked by the spec' }),
      });
    },
  );
  return () => received;
}
