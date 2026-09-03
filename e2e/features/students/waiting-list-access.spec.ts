import { test, expect } from '../../fixtures/base';

test.describe('Waiting List requires an authenticated session', { tag: '@272IT28' }, () => {
  test('unauthenticated direct navigation to the Waiting List route is sent to sign in', async ({ page }) => {
    await page.goto('/#/waiting-list');

    await expect(page).toHaveURL(/#\/login$/);
    await expect(page.locator('pm-waiting-list-page')).toHaveCount(0);
  });
});
