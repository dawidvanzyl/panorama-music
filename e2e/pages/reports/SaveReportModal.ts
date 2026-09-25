import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/** The `pm-save-report-modal`, opened from the builder's Save or the results' Save report. */
export class SaveReportModal extends BasePage {
  readonly host: Locator;
  readonly title: Locator;
  readonly text: Locator;
  readonly nameInput: Locator;
  readonly saveButton: Locator;
  readonly cancelButton: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    super(page);
    this.host = page.locator('pm-save-report-modal');
    this.title = this.host.locator('[data-testid="save-report-title"]');
    this.text = this.host.locator('[data-testid="save-report-text"]');
    this.nameInput = this.host.getByRole('textbox', { name: 'Report name' });
    this.saveButton = this.host.getByRole('button', { name: 'Save report', exact: true });
    this.cancelButton = this.host.getByRole('button', { name: 'Cancel', exact: true });
    this.errorBanner = this.host.locator('[data-testid="save-report-error"]');
  }

  async waitForOpen(): Promise<void> {
    await this.host.waitFor({ state: 'visible' });
    await this.nameInput.waitFor({ state: 'visible' });
  }

  async waitForClosed(): Promise<void> {
    await this.host.waitFor({ state: 'hidden' });
  }

  async fillName(name: string): Promise<void> {
    await this.nameInput.fill(name);
  }

  async confirm(): Promise<void> {
    await this.saveButton.click();
  }

  async cancel(): Promise<void> {
    await this.cancelButton.click();
  }

  /** Fills the name and confirms, in one call — the common path through the modal. */
  async saveAs(name: string): Promise<void> {
    await this.fillName(name);
    await this.confirm();
  }
}
