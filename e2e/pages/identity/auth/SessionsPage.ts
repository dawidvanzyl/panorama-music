import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../../BasePage';

/**
 * The caller's own active sessions, reached from the account chip in the header.
 * It is a dialog rather than a route: signing out and reviewing your own
 * sessions are account actions, and the account menu is where those live.
 */
export class SessionsPage extends BasePage {
  readonly accountChip: Locator;
  readonly accountMenu: Locator;
  readonly sessionsItem: Locator;
  readonly modal: Locator;
  readonly heading: Locator;
  readonly closeButton: Locator;
  readonly revokeAllBtn: Locator;
  readonly rows: Locator;

  constructor(page: Page) {
    super(page);
    this.accountChip = page.locator('pm-nav-bar #accountChip');
    this.accountMenu = page.locator('pm-nav-bar #accountMenu');
    this.sessionsItem = page.locator('pm-own-sessions-menu #openBtn');
    this.modal = page.locator('pm-own-sessions-modal');
    this.heading = this.modal.getByRole('heading', { name: 'Active Sessions' });
    this.closeButton = this.modal.locator('#closeBtn');
    this.revokeAllBtn = this.modal.locator('#revokeAllBtn');
    this.rows = this.modal.locator('table tbody tr');
  }

  /** Opens the dialog from the account menu, whatever page the user is on. */
  async openSessions(): Promise<void> {
    await this.accountChip.click();
    await this.sessionsItem.click();
    // The host element wraps a fixed-position backdrop and so has no geometry
    // of its own; the card inside it is what actually becomes visible.
    await this.modal.locator('.modal__card').waitFor({ state: 'visible' });
  }

  async close(): Promise<void> {
    await this.closeButton.click();
    await this.modal.locator('.modal__card').waitFor({ state: 'hidden' });
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
