import { test as base, expect } from '@playwright/test';

/**
 * The app shell links Google Fonts stylesheets in its <head>, which block the
 * page's load event, and the icon font is what gives the Material Symbols
 * buttons their size — without it the layout shifts under the pointer. Every
 * test starts a fresh browser context, so none of them ever hits the browser
 * cache and each would wait on a round trip to a third party. The responses
 * are fetched once per worker and replayed from memory for every later test.
 */
const THIRD_PARTY_FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

interface CachedResponse {
  status: number;
  headers: Record<string, string>;
  body: Buffer;
}

const fontResponses = new Map<string, Promise<CachedResponse>>();

export const test = base.extend({
  context: async ({ context }, use) => {
    await context.route(THIRD_PARTY_FONTS, async (route) => {
      const url = route.request().url();
      let cached = fontResponses.get(url);
      if (!cached) {
        cached = route.fetch().then(async (response) => {
          // `body()` is already decoded, so the encoding and length headers no longer describe it.
          const headers = response.headers();
          delete headers['content-encoding'];
          delete headers['content-length'];
          return { status: response.status(), headers, body: await response.body() };
        });
        fontResponses.set(url, cached);
        cached.catch(() => fontResponses.delete(url));
      }
      try {
        await route.fulfill(await cached);
      } catch {
        await route.continue().catch(() => undefined);
      }
    });
    await use(context);
  },
});
export { expect };
