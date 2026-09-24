import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../BasePage';

/**
 * The report builder (`pm-report-builder-page`), wrapping the Filters and
 * Columns panels. Every method exposes behaviour a Teacher can perform —
 * "add a filter on {attribute}", "tick column {header}" — never a selector,
 * per the plan's page-object convention.
 */
export class ReportBuilderPage extends BasePage {
  readonly host: Locator;
  readonly breadcrumb: Locator;
  readonly clearButton: Locator;
  readonly runButton: Locator;
  readonly errorBanner: Locator;
  readonly retryButton: Locator;
  readonly filtersEmptyMessage: Locator;
  readonly filtersCountBadge: Locator;
  readonly addFilterButton: Locator;
  readonly columnsCounter: Locator;

  constructor(page: Page) {
    super(page);
    this.host = page.locator('pm-report-builder-page');
    this.breadcrumb = this.host.locator('.builder-page__breadcrumb');
    this.clearButton = this.host.locator('#clear');
    this.runButton = this.host.locator('#run');
    this.errorBanner = this.host.locator('#error');
    this.retryButton = this.errorBanner.locator('.builder-page__retry');
    this.filtersEmptyMessage = this.host.locator('pm-report-filters-panel #empty');
    this.filtersCountBadge = this.host.locator('pm-report-filters-panel #count');
    this.addFilterButton = this.host.locator('pm-report-filters-panel #add');
    this.columnsCounter = this.host.locator('pm-report-columns-panel #counter');
  }

  async gotoNewReport(): Promise<void> {
    await this.goto('/#/reports/new');
  }

  async followReportsBreadcrumb(): Promise<void> {
    await this.breadcrumb.locator('#backLink').click();
  }

  // --- Filters ---

  filterRow(index: number): Locator {
    return this.host.locator(`pm-report-filter-row[data-index="${index}"]`);
  }

  filterRows(): Locator {
    return this.host.locator('pm-report-filter-row');
  }

  async addFilter(): Promise<void> {
    await this.addFilterButton.click();
  }

  /** `attributeLabel` is the option's own text, e.g. "Student · Grade". */
  async chooseAttribute(index: number, attributeLabel: string): Promise<void> {
    await this.filterRow(index).locator('#attribute').selectOption({ label: attributeLabel });
  }

  attributeDropdownOptions(index: number): Locator {
    return this.filterRow(index).locator('#attribute option');
  }

  operatorControl(index: number): Locator {
    return this.filterRow(index).locator('#operator');
  }

  /** `operatorLabel` is one of "is", "contains", "is any of". */
  async chooseOperator(index: number, operatorLabel: string): Promise<void> {
    await this.operatorControl(index).selectOption({ label: operatorLabel });
  }

  async typeTextValue(index: number, text: string): Promise<void> {
    await this.filterRow(index).locator('.filter-row__value[type="text"]').fill(text);
  }

  async selectListValue(index: number, optionLabel: string): Promise<void> {
    await this.filterRow(index)
      .locator('select.filter-row__value')
      .selectOption({ label: optionLabel });
  }

  checklistToggle(index: number): Locator {
    return this.filterRow(index).locator('pm-report-checklist-dropdown #toggle');
  }

  async openChecklist(index: number): Promise<void> {
    await this.checklistToggle(index).click();
  }

  checklistOption(index: number, optionLabel: string): Locator {
    return this.filterRow(index)
      .locator('pm-report-checklist-dropdown .checklist__option')
      .filter({ hasText: optionLabel });
  }

  /** Opens the `in` checklist and ticks each named option, leaving it open. */
  async tickChecklistOptions(index: number, optionLabels: string[]): Promise<void> {
    await this.openChecklist(index);
    for (const label of optionLabels) {
      await this.checklistOption(index, label).locator('input[type="checkbox"]').click();
    }
  }

  /** Closes any open checklist dropdown via an outside click, per the component's own behaviour. */
  async closeChecklist(): Promise<void> {
    await this.host.locator('pm-report-filters-panel .filters-panel__header').click();
  }

  booleanToggleButton(index: number, optionLabel: 'Yes' | 'No'): Locator {
    return this.filterRow(index)
      .locator('.filter-row__toggle-option')
      .filter({ hasText: optionLabel });
  }

  async clickBooleanToggle(index: number, optionLabel: 'Yes' | 'No'): Promise<void> {
    await this.booleanToggleButton(index, optionLabel).click();
  }

  async removeFilter(index: number): Promise<void> {
    await this.filterRow(index).locator('#remove').click();
  }

  // --- Columns ---

  columnItem(header: string): Locator {
    return this.host
      .locator('pm-report-columns-panel .columns-panel__item')
      .filter({ hasText: header });
  }

  columnItems(): Locator {
    return this.host.locator('pm-report-columns-panel .columns-panel__item');
  }

  async tickColumn(header: string): Promise<void> {
    await this.columnItem(header).click();
  }

  columnCheck(header: string): Locator {
    return this.columnItem(header).locator('.columns-panel__check');
  }

  columnRequiredLabel(header: string): Locator {
    return this.columnItem(header).locator('.columns-panel__lock').filter({ hasText: 'required' });
  }

  // --- Actions ---

  async clear(): Promise<void> {
    await this.clearButton.click();
  }

  async runReport(): Promise<void> {
    await this.runButton.click();
  }
}
