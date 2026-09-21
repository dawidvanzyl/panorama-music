import '../components/pm-report-filters-panel';
import '../components/pm-report-columns-panel';
import type { PmReportFiltersPanel } from '../components/pm-report-filters-panel';
import type { PmReportColumnsPanel } from '../components/pm-report-columns-panel';
import { getFields, runReport, ReportsError } from '../services/reports';
import {
  createDefinition,
  addFilter,
  removeFilter,
  chooseAttribute,
  replaceFilter,
  changeOperator,
  setValues,
  toggleColumn,
  columnAvailability,
  canRun,
  clear as clearDefinition,
  holdDefinition,
  holdResult,
  takeHeldDefinition,
} from '../state/report-builder-state';
import type { ReportDefinitionModel, ReportFieldsModel } from '../models/report';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      flex: 1;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .builder-page__breadcrumb {
      font-size: 12px;
      color: var(--pm-text-muted);
      margin-bottom: 8px;
    }
    .builder-page__breadcrumb a {
      color: var(--pm-accent);
      text-decoration: none;
      cursor: pointer;
    }
    .builder-page__toolbar {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      margin-bottom: 16px;
    }
    .builder-page__clear,
    .builder-page__run {
      height: 38px;
      padding: 0 16px;
      border-radius: var(--pm-radius);
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
    }
    .builder-page__clear {
      background: transparent;
      border: 1px solid var(--pm-border);
      color: var(--pm-text);
    }
    .builder-page__run {
      background: var(--pm-accent);
      border: none;
      color: white;
    }
    .builder-page__run:disabled {
      opacity: 0.5;
      cursor: default;
    }
    .builder-page__body {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }
    .builder-page__error {
      margin-bottom: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
      font-size: 13px;
    }
    .builder-page__retry {
      margin-left: 12px;
      background: none;
      border: none;
      color: var(--pm-danger);
      text-decoration: underline;
      cursor: pointer;
      font: inherit;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="builder-page__breadcrumb"><a id="backLink">Reports</a> &rsaquo; New report</div>
  <div class="builder-page__toolbar">
    <button type="button" class="builder-page__clear" id="clear">Clear</button>
    <button type="button" class="builder-page__run" id="run">Run report</button>
  </div>
  <div class="builder-page__error" id="error" hidden></div>
  <div class="builder-page__body" id="body" hidden>
    <pm-report-filters-panel id="filtersPanel"></pm-report-filters-panel>
    <pm-report-columns-panel id="columnsPanel"></pm-report-columns-panel>
  </div>
`;

export class PmReportBuilderPage extends HTMLElement {
  private filtersPanel: PmReportFiltersPanel | null = null;
  private columnsPanel: PmReportColumnsPanel | null = null;
  private runButton: HTMLButtonElement | null = null;
  private errorBanner: HTMLElement | null = null;
  private body: HTMLElement | null = null;

  private _fields: ReportFieldsModel | null = null;
  private _definition: ReportDefinitionModel = { filters: [], columns: ['student.name'] };
  private _running = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.filtersPanel = this.shadowRoot!.getElementById('filtersPanel') as unknown as PmReportFiltersPanel;
    this.columnsPanel = this.shadowRoot!.getElementById('columnsPanel') as unknown as PmReportColumnsPanel;
    this.runButton = this.shadowRoot!.getElementById('run') as HTMLButtonElement;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;
    this.body = this.shadowRoot!.getElementById('body') as HTMLElement;

    this.shadowRoot!.getElementById('backLink')!.addEventListener('click', () => {
      window.location.hash = '#/reports';
    });
    this.shadowRoot!.getElementById('clear')!.addEventListener('click', this.handleClear);
    this.runButton.addEventListener('click', this.handleRun);

    this.shadowRoot!.addEventListener('filter-add-requested', this.handleAddFilter);
    this.shadowRoot!.addEventListener('filter-attribute-changed', this.handleAttributeChanged as EventListener);
    this.shadowRoot!.addEventListener('filter-operator-changed', this.handleOperatorChanged as EventListener);
    this.shadowRoot!.addEventListener('filter-values-changed', this.handleValuesChanged as EventListener);
    this.shadowRoot!.addEventListener('filter-remove-requested', this.handleFilterRemove as EventListener);
    this.shadowRoot!.addEventListener('column-toggle-requested', this.handleColumnToggle as EventListener);

    void this.load();
  }

  private async load(): Promise<void> {
    try {
      this._fields = await getFields();
      const held = takeHeldDefinition();
      this._definition = held ?? createDefinition(this._fields);
      this.errorBanner!.hidden = true;
      this.body!.hidden = false;
      this.render();
    } catch {
      this.body!.hidden = true;
      this.showError('Could not load report fields. Try again.', true);
    }
  }

  private showError(message: string, withRetry: boolean): void {
    if (!this.errorBanner) return;
    this.errorBanner.textContent = message;
    if (withRetry) {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'builder-page__retry';
      retry.textContent = 'Retry';
      retry.addEventListener('click', () => void this.load());
      this.errorBanner.appendChild(retry);
    }
    this.errorBanner.hidden = false;
  }

  private render(): void {
    if (!this._fields || !this.filtersPanel || !this.columnsPanel || !this.runButton) return;

    this.filtersPanel.fields = this._fields;
    this.filtersPanel.filters = this._definition.filters;

    const availability = columnAvailability(this._definition.columns);
    this.columnsPanel.fields = this._fields;
    this.columnsPanel.selected = this._definition.columns;
    this.columnsPanel.atLimit = availability.atLimit;

    this.runButton.disabled = this._running || !this._fields || !canRun(this._definition);
  }

  private handleAddFilter = (): void => {
    if (!this._fields || this._fields.filters.length === 0) return;
    const filter = chooseAttribute(this._fields.filters[0]);
    this._definition = addFilter(this._definition, filter);
    this.render();
  };

  private handleAttributeChanged = (event: CustomEvent<{ field: string }>): void => {
    const index = this.rowIndex(event);
    const field = this._fields?.filters.find((f) => f.key === event.detail.field);
    if (index === null || !field) return;
    this._definition = replaceFilter(this._definition, index, chooseAttribute(field));
    this.render();
  };

  private handleOperatorChanged = (event: CustomEvent<{ operator: string }>): void => {
    const index = this.rowIndex(event);
    if (index === null) return;
    const filter = this._definition.filters[index];
    this._definition = replaceFilter(
      this._definition,
      index,
      changeOperator(filter, event.detail.operator as ReturnType<typeof changeOperator>['operator']),
    );
    this.render();
  };

  private handleValuesChanged = (event: CustomEvent<{ values: string[] }>): void => {
    const index = this.rowIndex(event);
    if (index === null) return;
    const filter = this._definition.filters[index];
    this._definition = replaceFilter(this._definition, index, setValues(filter, event.detail.values));
    this.render();
  };

  private handleFilterRemove = (event: Event): void => {
    const index = this.rowIndex(event as CustomEvent);
    if (index === null) return;
    this._definition = removeFilter(this._definition, index);
    this.render();
  };

  private handleColumnToggle = (event: CustomEvent<{ key: string }>): void => {
    if (!this._fields) return;
    this._definition = {
      ...this._definition,
      columns: toggleColumn(this._fields, this._definition.columns, event.detail.key),
    };
    this.render();
  };

  private handleClear = (): void => {
    if (!this._fields) return;
    this._definition = clearDefinition(this._fields);
    this.render();
  };

  private handleRun = (): void => {
    if (this._running || !canRun(this._definition)) return;
    this._running = true;
    this.render();

    runReport(this._definition)
      .then((result) => {
        holdDefinition(this._definition);
        holdResult(result);
        window.location.hash = '#/reports/results';
      })
      .catch((error: unknown) => {
        this._running = false;
        const message =
          error instanceof ReportsError && error.status >= 400 && error.status < 500
            ? error.message
            : 'Could not run the report. Try again.';
        this.showError(message, false);
        this.render();
      });
  };

  private rowIndex(event: CustomEvent | Event): number | null {
    const path = (event as CustomEvent).composedPath?.() ?? [];
    for (const node of path) {
      if (node instanceof HTMLElement && node.dataset.index !== undefined) {
        return Number(node.dataset.index);
      }
    }
    return null;
  }
}

customElements.define('pm-report-builder-page', PmReportBuilderPage);
