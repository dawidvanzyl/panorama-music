import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../../BasePage';

export class SessionsPage extends BasePage {
  readonly heading: Locator;
  readonly revokeAllBtn: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'Active Sessions' });
    this.revokeAllBtn = page.getByRole('button', { name: 'Revoke all other sessions' });
    this.rows = page.locator('table tbody tr');
  }

  async gotoSessions(): Promise<void> {
    await this.goto('/#/sessions');
  }

  rowByDeviceLabel(deviceLabel: string): Locator {
    return this.rows.filter({ hasText: deviceLabel });
  }

  currentRow(): Locator {
    return this.rows.filter({ hasText: 'Current Session' });
  }

  async revokeRow(row: Locator): Promise<void> {
    await row.getByRole('button', { name: 'Revoke' }).click();
  }
}
