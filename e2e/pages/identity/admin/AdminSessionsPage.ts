import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../../BasePage';

export class AdminSessionsPage extends BasePage {
  readonly heading: Locator;
  readonly filterInput: Locator;
  readonly revokeAllBtn: Locator;
  readonly rows: Locator;
  readonly revokeAllModalConfirmInput: Locator;
  readonly revokeAllModalConfirmButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Global Session Management' });
    this.filterInput = page.locator('#filterInput');
    this.revokeAllBtn = page.getByRole('button', { name: 'Revoke All (Global)' });
    this.rows = page.locator('table tbody tr');
    this.revokeAllModalConfirmInput = page.locator('#revokeAllModal').locator('#confirmInput');
    this.revokeAllModalConfirmButton = page.locator('#revokeAllModal').locator('#revokeAllBtn');
  }

  async gotoAdminSessions(): Promise<void> {
    await this.goto('/#/admin/sessions');
  }

  rowByEmail(email: string): Locator {
    return this.rows.filter({ hasText: email });
  }

  async revokeRow(row: Locator): Promise<void> {
    await row.getByRole('button', { name: 'Revoke' }).click();
  }

  async revokeAllGlobal(): Promise<void> {
    await this.revokeAllBtn.click();
    await this.revokeAllModalConfirmInput.fill('REVOKE ALL');
    await this.revokeAllModalConfirmButton.click();
  }
}
