import './pm-report-filter-row';
import type { PmReportFilterRow } from './pm-report-filter-row';
import type { ReportFieldsModel, ReportFilterModel } from '../models/report';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
      flex: 1;
    }
    .filters-panel__card {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 16px 20px;
    }
    .filters-panel__header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
      font-weight: 700;
      color: var(--pm-text);
      margin-bottom: 8px;
    }
    .filters-panel__count {
      font-size: 11px;
      font-weight: 700;
      color: var(--pm-accent);
      background: rgba(79, 124, 255, 0.15);
      border-radius: 999px;
      padding: 1px 8px;
    }
    .filters-panel__empty {
      color: var(--pm-text-muted);
      font-size: 13px;
      padding: 8px 0;
    }
    .filters-panel__add {
      margin-top: 8px;
      height: 36px;
      padding: 0 14px;
      background: transparent;
      border: 1px dashed var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text-muted);
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
    }
    .filters-panel__add:hover {
      color: var(--pm-text);
      border-color: var(--pm-accent);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="filters-panel__card">
    <div class="filters-panel__header">
      <span>Filters</span>
      <span class="filters-panel__count" id="count" hidden></span>
    </div>
    <div class="filters-panel__empty" id="empty">No filters applied — all students will appear.</div>
    <div id="rows"></div>
    <button type="button" class="filters-panel__add" id="add">+ Add filter</button>
  </div>
`;

export class PmReportFiltersPanel extends HTMLElement {
  private countBadge: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private rowsContainer: HTMLElement | null = null;
  private addButton: HTMLButtonElement | null = null;

  private _fields: ReportFieldsModel | null = null;
  private _filters: ReportFilterModel[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.countBadge = this.shadowRoot!.getElementById('count') as HTMLElement;
    this.emptyMessage = this.shadowRoot!.getElementById('empty') as HTMLElement;
    this.rowsContainer = this.shadowRoot!.getElementById('rows') as HTMLElement;
    this.addButton = this.shadowRoot!.getElementById('add') as HTMLButtonElement;

    this.addButton.addEventListener('click', () => {
      this.dispatchEvent(new CustomEvent('filter-add-requested', { bubbles: true, composed: true }));
    });

    this.render();
  }

  set fields(fields: ReportFieldsModel) {
    this._fields = fields;
    this.render();
  }

  set filters(filters: ReportFilterModel[]) {
    this._filters = filters;
    this.render();
  }

  private render(): void {
    if (!this.rowsContainer || !this.countBadge || !this.emptyMessage || !this._fields) return;

    this.countBadge.hidden = this._filters.length === 0;
    this.countBadge.textContent = String(this._filters.length);
    this.emptyMessage.hidden = this._filters.length > 0;

    // Rows are reused by index rather than torn down and rebuilt on every
    // render: a row's own value control — the in-operator checklist in
    // particular — carries open/closed DOM state that a fresh element would
    // lose, and a tick re-renders this panel like any other state change.
    this._filters.forEach((filter, index) => {
      let row = this.rowsContainer!.children[index] as PmReportFilterRow | undefined;
      if (!row) {
        row = document.createElement('pm-report-filter-row') as PmReportFilterRow;
        this.rowsContainer!.appendChild(row);
      }
      row.fields = this._fields!;
      row.filter = filter;
      row.dataset.index = String(index);
    });

    while (this.rowsContainer.children.length > this._filters.length) {
      this.rowsContainer.lastElementChild?.remove();
    }
  }
}

customElements.define('pm-report-filters-panel', PmReportFiltersPanel);
