import { groupColumns } from '../state/report-collections';
import type { ReportFieldsModel } from '../models/report';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
      flex: 0 0 300px;
    }
    .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
      font-family: 'Material Symbols Outlined', system-ui, sans-serif;
      font-size: 14px;
      line-height: 1;
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
      color: var(--collection-colour, var(--pm-text-muted));
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
      background: var(--collection-colour, var(--pm-accent));
      border-color: var(--collection-colour, var(--pm-accent));
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
    <div id="groups"></div>
  </div>
`;

export class PmReportColumnsPanel extends HTMLElement {
  private counter: HTMLElement | null = null;
  private groupsContainer: HTMLElement | null = null;

  private _fields: ReportFieldsModel | null = null;
  private _selected: string[] = [];
  private _disabledKeys: ReadonlySet<string> = new Set();

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.counter = this.shadowRoot!.getElementById('counter') as HTMLElement;
    this.groupsContainer = this.shadowRoot!.getElementById('groups') as HTMLElement;
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

  set disabledKeys(disabledKeys: ReadonlySet<string>) {
    this._disabledKeys = disabledKeys;
    this.render();
  }

  private render(): void {
    if (!this.groupsContainer || !this.counter || !this._fields) return;

    this.counter.textContent = `${this._selected.length} / 10`;

    this.groupsContainer.textContent = '';
    for (const group of groupColumns(this._fields)) {
      const groupEl = document.createElement('div');
      groupEl.dataset.testid = `column-group-${group.collection.key}`;
      groupEl.style.setProperty('--collection-colour', group.collection.colour);

      const label = document.createElement('div');
      label.className = 'columns-panel__group-label';
      label.dataset.testid = 'column-group-label';
      label.textContent = group.collection.heading;
      groupEl.appendChild(label);

      for (const column of group.columns) {
        const isChecked = this._selected.includes(column.key);
        const isUnavailable = !isChecked && this._disabledKeys.has(column.key);

        const row = document.createElement('div');
        row.className = 'columns-panel__item' + (isUnavailable ? ' columns-panel__item--disabled' : '');
        row.dataset.testid = `column-item-${column.key}`;
        row.dataset.checked = String(isChecked);
        row.dataset.unavailable = String(isUnavailable);

        const check = document.createElement('span');
        check.className = 'columns-panel__check' + (isChecked ? ' columns-panel__check--checked' : '');
        check.textContent = isChecked ? '✓' : '';

        const label2 = document.createElement('span');
        label2.textContent = column.header;

        row.appendChild(check);
        row.appendChild(label2);

        if (column.locked) {
          const lockIcon = document.createElement('span');
          lockIcon.className = 'material-symbols-outlined columns-panel__lock';
          lockIcon.textContent = 'lock';

          const lockLabel = document.createElement('span');
          lockLabel.className = 'columns-panel__lock';
          lockLabel.textContent = 'required';

          row.appendChild(lockIcon);
          row.appendChild(lockLabel);
        } else if (!isUnavailable) {
          row.addEventListener('click', () => {
            this.dispatchEvent(
              new CustomEvent('column-toggle-requested', {
                bubbles: true,
                composed: true,
                detail: { key: column.key },
              }),
            );
          });
        }

        groupEl.appendChild(row);
      }

      this.groupsContainer.appendChild(groupEl);
    }
  }
}

customElements.define('pm-report-columns-panel', PmReportColumnsPanel);
