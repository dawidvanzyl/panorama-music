import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../../BasePage';

export class DashboardPage extends BasePage {
  readonly heading: Locator;
  readonly accountChip: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Welcome to Panorama Music' });
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
