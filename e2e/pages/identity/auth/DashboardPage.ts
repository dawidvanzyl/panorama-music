import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../../BasePage';

/**
 * `/` renders no screen of its own — it resolves to the topmost sidebar entry
 * the signed-in user's roles permit. What survives here is the shell chrome
 * every authenticated screen carries.
 */
export class DashboardPage extends BasePage {
  readonly accountChip: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page);
    // Signing out is an account action, so it is offered from the account chip
    // in the header rather than from the sidebar, which is navigation only.
    this.accountChip = page.locator('pm-nav-bar #accountChip');
    this.logoutButton = page.locator('pm-logout-menu #logoutBtn');
  }

  async gotoDashboard(): Promise<void> {
    await this.goto('/#/');
  }

  async logout(): Promise<void> {
    await this.accountChip.click();
    await this.logoutButton.click();
  }
}
