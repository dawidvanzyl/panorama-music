import type { ReportFieldsModel } from '../models/report';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
      flex: 0 0 300px;
    }
    .columns-panel__card {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 16px 20px;
    }
    .columns-panel__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 14px;
      font-weight: 700;
      color: var(--pm-text);
      margin-bottom: 8px;
    }
    .columns-panel__counter {
      font-size: 12px;
      font-weight: 600;
      color: var(--pm-text-muted);
    }
    .columns-panel__group-label {
      font-size: 11px;
      font-weight: 700;
      letter-spacing: 0.04em;
      color: var(--pm-text-muted);
      margin: 8px 0 4px;
    }
    .columns-panel__item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 0;
      font-size: 13px;
      color: var(--pm-text);
      cursor: pointer;
    }
    .columns-panel__item--disabled {
      opacity: 0.45;
      cursor: default;
    }
    .columns-panel__check {
      width: 16px;
      height: 16px;
      border-radius: 4px;
      border: 1px solid var(--pm-border);
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      color: white;
    }
    .columns-panel__check--checked {
      background: var(--pm-accent);
      border-color: var(--pm-accent);
    }
    .columns-panel__lock {
      color: var(--pm-text-muted);
      font-size: 10px;
      margin-left: auto;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="columns-panel__card">
    <div class="columns-panel__header">
      <span>Columns</span>
      <span class="columns-panel__counter" id="counter">1 / 10</span>
    </div>
    <div class="columns-panel__group-label">STUDENT</div>
    <div id="items"></div>
  </div>
`;

export class PmReportColumnsPanel extends HTMLElement {
  private counter: HTMLElement | null = null;
  private itemsContainer: HTMLElement | null = null;

  private _fields: ReportFieldsModel | null = null;
  private _selected: string[] = [];
  private _atLimit = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.counter = this.shadowRoot!.getElementById('counter') as HTMLElement;
    this.itemsContainer = this.shadowRoot!.getElementById('items') as HTMLElement;
    this.render();
  }

  set fields(fields: ReportFieldsModel) {
    this._fields = fields;
    this.render();
  }

  set selected(selected: string[]) {
    this._selected = selected;
    this.render();
  }

  set atLimit(atLimit: boolean) {
    this._atLimit = atLimit;
    this.render();
  }

  private render(): void {
    if (!this.itemsContainer || !this.counter || !this._fields) return;

    this.counter.textContent = `${this._selected.length} / 10`;

    this.itemsContainer.textContent = '';
    const columns = [...this._fields.columns].sort((a, b) => a.displayOrder - b.displayOrder);
    for (const column of columns) {
      const isChecked = this._selected.includes(column.key);
      const isDisabled = !isChecked && this._atLimit && !column.locked;

      const row = document.createElement('div');
      row.className = 'columns-panel__item' + (isDisabled ? ' columns-panel__item--disabled' : '');

      const check = document.createElement('span');
      check.className = 'columns-panel__check' + (isChecked ? ' columns-panel__check--checked' : '');
      check.textContent = isChecked ? '✓' : '';

      const label = document.createElement('span');
      label.textContent = column.header;

      row.appendChild(check);
      row.appendChild(label);

      if (column.locked) {
        const lock = document.createElement('span');
        lock.className = 'columns-panel__lock';
        lock.textContent = 'required';
        row.appendChild(lock);
      } else if (!isDisabled) {
        row.addEventListener('click', () => {
          this.dispatchEvent(new CustomEvent('column-toggle-requested', { bubbles: true, composed: true, detail: { key: column.key } }));
        });
      }

      this.itemsContainer.appendChild(row);
    }
  }
}

customElements.define('pm-report-columns-panel', PmReportColumnsPanel);
