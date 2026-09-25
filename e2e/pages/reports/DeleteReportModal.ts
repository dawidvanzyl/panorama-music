import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/** The `pm-delete-report-modal`, opened from the Reports list's own Delete. */
export class DeleteReportModal extends BasePage {
  readonly host: Locator;
  readonly title: Locator;
  readonly text: Locator;
  readonly name: Locator;
  readonly deleteButton: Locator;
  readonly cancelButton: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    super(page);
    this.host = page.locator('pm-delete-report-modal');
    this.title = this.host.locator('[data-testid="delete-report-title"]');
    this.text = this.host.locator('[data-testid="delete-report-text"]');
    this.name = this.host.locator('[data-testid="delete-report-name"]');
    this.deleteButton = this.host.getByRole('button', { name: 'Delete', exact: true });
    this.cancelButton = this.host.getByRole('button', { name: 'Cancel', exact: true });
    this.errorBanner = this.host.locator('[data-testid="delete-report-error"]');
  }

  async waitForOpen(): Promise<void> {
    await this.host.waitFor({ state: 'visible' });
    await this.deleteButton.waitFor({ state: 'visible' });
  }

  async waitForClosed(): Promise<void> {
    await this.host.waitFor({ state: 'hidden' });
  }

  async confirm(): Promise<void> {
    await this.deleteButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }
}
