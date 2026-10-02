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
  readonly saveButton: Locator;
  readonly breadcrumbName: Locator;

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
    this.saveButton = this.host.getByRole('button', { name: 'Save', exact: true });
    this.breadcrumbName = this.breadcrumb.locator('[data-testid="builder-breadcrumb-name"]');
  }

  async gotoNewReport(): Promise<void> {
    await this.goto('/#/reports/new');
  }

  async gotoEditReport(id: string): Promise<void> {
    await this.goto(`/#/reports/${id}/edit`);
  }

  async followReportsBreadcrumb(): Promise<void> {
    await this.breadcrumb.locator('#backLink').click();
  }

  async save(): Promise<void> {
    await this.saveButton.click();
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

  /** The attribute `<select>`'s `<optgroup>` elements, in document order. */
  attributeGroups(index: number): Locator {
    return this.filterRow(index).locator('#attribute optgroup');
  }

  /** The `n`th optgroup's accessible name (`label` attribute), e.g. "Guardian". */
  attributeGroupLabel(index: number, groupIndex: number): Locator {
    return this.attributeGroups(index).nth(groupIndex);
  }

  /** The labels of every optgroup in the attribute dropdown, in document order. */
  async attributeGroupLabels(index: number): Promise<string[]> {
    return this.attributeGroups(index).evaluateAll((groups) =>
      groups.map((g) => g.getAttribute('label') ?? '')
    );
  }

  /** The option labels within the named optgroup, e.g. "Guardian" -> ["Guardian · Name", ...]. */
  async attributeGroupOptions(index: number, groupLabel: string): Promise<string[]> {
    return this.attributeGroups(index).evaluateAll((groups, groupLabel) => {
      const group = groups.find((g) => g.getAttribute('label') === groupLabel);
      if (!group) return [];
      return Array.from(group.querySelectorAll('option')).map(
        (o) => (o as { textContent: string | null }).textContent ?? ''
      );
    }, groupLabel);
  }

  /** The collection badge (STU/GRD/CRS/ECA) rendered in a filter row. */
  filterRowBadge(index: number): Locator {
    return this.filterRow(index).locator('[data-testid="filter-row-badge"]');
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

  /** The `is` value select's own option labels, e.g. to inspect a Datasource's live options. */
  async filterValueOptions(index: number): Promise<string[]> {
    return this.filterRow(index).locator('select.filter-row__value option').allTextContents();
  }

  /** The attribute select's currently chosen option's own text, e.g. "Student · Grade". */
  async selectedAttributeLabel(index: number): Promise<string> {
    return this.filterRow(index)
      .locator('#attribute')
      .evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() ?? '');
  }

  /** The operator select's currently chosen option's own text, e.g. "is". */
  async selectedOperatorLabel(index: number): Promise<string> {
    return this.operatorControl(index).evaluate(
      (el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() ?? ''
    );
  }

  /** The `is`-style value select's currently chosen option's own text, e.g. "Grade 4". */
  async selectedValueLabel(index: number): Promise<string> {
    return this.filterRow(index)
      .locator('select.filter-row__value')
      .evaluate((el) => (el as HTMLSelectElement).selectedOptions[0]?.textContent?.trim() ?? '');
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

  /**
   * The columns panel's group for one collection (`Student`, `Guardian`,
   * `Course` or `ExtraCurricular`).
   */
  columnGroup(collection: string): Locator {
    return this.host.locator(`pm-report-columns-panel [data-testid="column-group-${collection}"]`);
  }

  /** The group's own heading (STUDENT, GUARDIAN, COURSE, EXTRA-CURRICULAR). */
  columnGroupLabel(collection: string): Locator {
    return this.columnGroup(collection).locator('[data-testid="column-group-label"]');
  }

  /**
   * A column item by its visible header text, scoped to one collection's
   * group so an ambiguous header (e.g. "Phase", which appears under both
   * Student and Extra-Curricular) resolves to the one the caller means.
   */
  columnItem(header: string, collection = 'Student'): Locator {
    return this.columnGroup(collection).locator('.columns-panel__item').filter({ hasText: header });
  }

  /** A column item by its registry key, e.g. `guardian.cell`. */
  columnByKey(key: string): Locator {
    return this.host.locator(`pm-report-columns-panel [data-testid="column-item-${key}"]`);
  }

  columnItems(): Locator {
    return this.host.locator('pm-report-columns-panel .columns-panel__item');
  }

  async tickColumn(header: string, collection = 'Student'): Promise<void> {
    await this.columnItem(header, collection).click();
  }

  async tickColumnByKey(key: string): Promise<void> {
    await this.columnByKey(key).click();
  }

  columnCheck(header: string, collection = 'Student'): Locator {
    return this.columnItem(header, collection).locator('.columns-panel__check');
  }

  columnRequiredLabel(header: string, collection = 'Student'): Locator {
    return this.columnItem(header, collection)
      .locator('.columns-panel__lock')
      .filter({ hasText: 'required' });
  }

  async isColumnTicked(key: string): Promise<boolean> {
    return (await this.columnByKey(key).getAttribute('data-checked')) === 'true';
  }

  async isColumnUnavailable(key: string): Promise<boolean> {
    return (await this.columnByKey(key).getAttribute('data-unavailable')) === 'true';
  }

  // --- Actions ---

  async clear(): Promise<void> {
    await this.clearButton.click();
  }

  async runReport(): Promise<void> {
    await this.runButton.click();
  }
}
