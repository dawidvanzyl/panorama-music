import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../../BasePage';

export class DashboardPage extends BasePage {
  readonly heading: Locator;
  readonly logoutButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Welcome to Panorama Music' });
    this.logoutButton = page.locator('#logoutBtn');
  }

  async gotoDashboard(): Promise<void> {
    await this.goto('/#/');
  }

  async logout(): Promise<void> {
    await this.logoutButton.click();
  }
}
