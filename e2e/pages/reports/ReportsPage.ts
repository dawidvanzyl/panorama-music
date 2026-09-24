import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/** The Reports list screen (`pm-reports-page`) — the saved-report list and Create report. */
export class ReportsPage extends BasePage {
  readonly host: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly createButton: Locator;
  readonly emptyState: Locator;

  constructor(page: Page) {
    super(page);
    this.host = page.locator('pm-reports-page');
    this.heading = this.host.locator('.reports-page__title');
    this.subtitle = this.host.locator('.reports-page__subtitle');
    this.createButton = this.host.locator('#create');
    this.emptyState = this.host.locator('#empty');
  }

  async gotoReports(): Promise<void> {
    await this.goto('/#/reports');
  }

  async createReport(): Promise<void> {
    await this.createButton.click();
  }
}
