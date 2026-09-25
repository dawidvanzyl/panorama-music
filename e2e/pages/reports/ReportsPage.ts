import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/** The Reports list screen (`pm-reports-page`) — the saved-report list and Create report. */
export class ReportsPage extends BasePage {
  readonly host: Locator;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly createButton: Locator;
  readonly emptyState: Locator;
  readonly table: Locator;
  readonly errorBanner: Locator;

  constructor(page: Page) {
    super(page);
    this.host = page.locator('pm-reports-page');
    this.heading = this.host.locator('.reports-page__title');
    this.subtitle = this.host.locator('.reports-page__subtitle');
    this.createButton = this.host.locator('#create');
    this.emptyState = this.host.locator('#empty');
    this.table = this.host.locator('[data-testid="saved-reports-table"]');
    this.errorBanner = this.host.locator('[data-testid="saved-reports-error"]');
  }

  async gotoReports(): Promise<void> {
    await this.goto('/#/reports');
  }

  async createReport(): Promise<void> {
    await this.createButton.click();
  }

  /** Waits until the list has visibly finished loading: the table or the empty state is showing. */
  async waitForLoaded(): Promise<void> {
    await Promise.race([
      this.table.waitFor({ state: 'visible' }),
      this.emptyState.waitFor({ state: 'visible' }),
    ]);
  }

  rows(): Locator {
    return this.host.locator('[data-testid="saved-report-row"]');
  }

  rowById(id: string): Locator {
    return this.host.locator(`[data-testid="saved-report-row"][data-report-id="${id}"]`);
  }

  /**
   * The row(s) whose Created by cell equals this email, exactly. The `has`
   * locator is rooted at `this.page`, not `this.host`: rooting it at the
   * page-level host locator against a row-scoped `filter` returns 0 matches
   * even when the row is present (R19) — rooting at `page` instead resolves
   * it relative to each candidate row, as `filter({ has })` requires.
   */
  rowsByCreatedBy(email: string): Locator {
    return this.rows().filter({
      has: this.page.locator('[data-testid="saved-report-created-by"]', { hasText: email }),
    });
  }

  /** The row whose name cell contains this name (a `uniqueToken()` name is unique on its own). */
  rowByName(name: string): Locator {
    return this.rows().filter({
      has: this.page.locator('[data-testid="saved-report-name"]', { hasText: name }),
    });
  }

  nameCell(row: Locator): Locator {
    return row.locator('[data-testid="saved-report-name"]');
  }

  createdByCell(row: Locator): Locator {
    return row.locator('[data-testid="saved-report-created-by"]');
  }

  lastRunCell(row: Locator): Locator {
    return row.locator('[data-testid="saved-report-last-run"]');
  }

  runButton(row: Locator): Locator {
    return row.getByRole('button', { name: 'Run', exact: true });
  }

  async run(row: Locator): Promise<void> {
    await this.runButton(row).click();
  }

  async reportIdOf(row: Locator): Promise<string> {
    const id = await row.getAttribute('data-report-id');
    if (!id) throw new Error('row has no data-report-id attribute');
    return id;
  }
}
