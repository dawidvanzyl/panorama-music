import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../../BasePage';

export class AdminSessionsPage extends BasePage {
  readonly heading: Locator;
  readonly filterInput: Locator;
  readonly revokeAllBtn: Locator;
  readonly rows: Locator;
  readonly revokeSessionModal: Locator;
  readonly revokeAllModalConfirmInput: Locator;
  readonly revokeAllModalConfirmButton: Locator;

  constructor(page: Page) {
    super(page);
    this.heading = page.getByRole('heading', { name: 'User Sessions' });
    this.filterInput = page.locator('#filterInput');
    this.revokeAllBtn = page.getByRole('button', { name: 'Revoke All', exact: true });
    this.rows = page.locator('table tbody tr');
    this.revokeSessionModal = page.locator('pm-admin-sessions-page #revokeSessionModal');
    this.revokeAllModalConfirmInput = page.locator('#revokeAllModal').locator('#confirmInput');
    this.revokeAllModalConfirmButton = page.locator('#revokeAllModal').locator('#revokeAllBtn');
  }

  /**
   * Opens the page and waits for the session list to arrive. The table fills
   * only after that request, so a row count read earlier sees zero rows.
   */
  async gotoAdminSessions(): Promise<void> {
    const loaded = this.page.waitForResponse(
      (response) =>
        response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/auth/admin/sessions',
    );
    await this.goto('/#/admin/sessions');
    await loaded;
  }

  rowByEmail(email: string): Locator {
    return this.rows.filter({ hasText: email });
  }

  async revokeRow(row: Locator): Promise<void> {
    await row.getByRole('button', { name: 'Revoke' }).click();
  }

  /** Clicks Revoke in the Revoke Session confirmation and waits for it to close. */
  async confirmRevoke(): Promise<void> {
    await this.revokeSessionModal.getByRole('button', { name: 'Revoke', exact: true }).click();
    await this.revokeSessionModal.locator('.modal__card').waitFor({ state: 'hidden' });
  }

  async revokeAllGlobal(): Promise<void> {
    await this.revokeAllBtn.click();
    await this.revokeAllModalConfirmInput.fill('REVOKE ALL');
    await this.revokeAllModalConfirmButton.click();
  }
}
