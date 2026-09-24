import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/** The report results screen (`pm-report-results-page`), including its results table. */
export class ReportResultsPage extends BasePage {
  readonly host: Locator;
  readonly breadcrumb: Locator;
  readonly title: Locator;
  readonly subline: Locator;
  readonly caption: Locator;
  readonly editButton: Locator;
  readonly runAgainButton: Locator;
  readonly printButton: Locator;
  readonly actionsContainer: Locator;
  readonly errorBanner: Locator;
  readonly emptyMessage: Locator;
  readonly table: Locator;
  readonly headerRow: Locator;
  readonly tableCard: Locator;
  readonly printHeader: Locator;
  readonly printTitle: Locator;
  readonly printRunLine: Locator;
  readonly printFilters: Locator;

  constructor(page: Page) {
    super(page);
    this.host = page.locator('pm-report-results-page');
    this.breadcrumb = this.host.locator('.results-page__breadcrumb');
    this.title = this.host.locator('.results-page__title');
    this.subline = this.host.locator('#subline');
    this.caption = this.host.locator('.results-page__caption');
    this.editButton = this.host.locator('#edit');
    this.runAgainButton = this.host.locator('#runAgain');
    this.printButton = this.host.locator('#print');
    this.actionsContainer = this.host.locator('.results-page__actions');
    this.errorBanner = this.host.locator('#error');
    this.emptyMessage = this.host.locator('pm-report-results-table #empty');
    this.table = this.host.locator('pm-report-results-table #table');
    this.headerRow = this.host.locator('pm-report-results-table #headerRow');
    this.tableCard = this.host.locator('pm-report-results-table .results-table__card');
    this.printHeader = this.host.locator('#printHeader');
    this.printTitle = this.host.locator('#printTitle');
    this.printRunLine = this.host.locator('#printRunLine');
    this.printFilters = this.host.locator('#printFilters');
  }

  async editReport(): Promise<void> {
    await this.editButton.click();
  }

  async runAgain(): Promise<void> {
    await this.runAgainButton.click();
  }

  async print(): Promise<void> {
    await this.printButton.click();
  }

  /** The offered actions' accessible names, in document order, e.g. `['Edit report', 'Run again', 'Print']`. */
  async actionLabels(): Promise<string[]> {
    const texts = await this.actionsContainer.locator('button').allTextContents();
    return texts.map((text) => text.trim());
  }

  async followReportsBreadcrumb(): Promise<void> {
    await this.breadcrumb.locator('#backLink').click();
  }

  headers(): Locator {
    return this.headerRow.locator('th');
  }

  allSections(): Locator {
    return this.host.locator('pm-report-results-table tbody.results-table__section');
  }

  /** Every row across every section — for a match on more than one column's value at once. */
  rows(): Locator {
    return this.host.locator('pm-report-results-table tbody tr');
  }

  /** The `tbody` holding this student's own rows, matched on their name appearing anywhere in it. */
  sectionFor(name: string): Locator {
    return this.allSections().filter({ hasText: name });
  }

  sectionRows(name: string): Locator {
    return this.sectionFor(name).locator('tr');
  }

  cells(row: Locator): Locator {
    return row.locator('td');
  }
}
