import './pm-report-checklist-dropdown';
import type { PmReportChecklistDropdown } from './pm-report-checklist-dropdown';
import type { ReportField, ReportFieldsModel, ReportFilterModel } from '../models/report';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
    }
    .filter-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
    }
    .filter-row__badge {
      flex: 0 0 auto;
      font-size: 11px;
      font-weight: 700;
      color: var(--pm-accent);
      background: rgba(79, 124, 255, 0.15);
      border-radius: 4px;
      padding: 2px 6px;
    }
    .filter-row__select,
    .filter-row__input {
      box-sizing: border-box;
      height: 36px;
      padding: 0 10px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 13px;
      font-family: inherit;
    }
    .filter-row__attribute {
      min-width: 140px;
    }
    .filter-row__operator {
      min-width: 110px;
    }
    .filter-row__value {
      flex: 1 1 auto;
      min-width: 140px;
    }
    .filter-row__toggle {
      display: flex;
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      overflow: hidden;
    }
    .filter-row__toggle-option {
      flex: 1;
      height: 36px;
      padding: 0 14px;
      background: var(--pm-surface-2);
      color: var(--pm-text);
      border: none;
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
    }
    .filter-row__toggle-option--active {
      background: var(--pm-accent);
      color: white;
    }
    .filter-row__remove {
      flex: 0 0 auto;
      width: 28px;
      height: 28px;
      border: none;
      background: transparent;
      color: var(--pm-text-muted);
      font-size: 16px;
      cursor: pointer;
      line-height: 1;
    }
    .filter-row__remove:hover {
      color: var(--pm-danger);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="filter-row">
    <span class="filter-row__badge">STU</span>
    <select class="filter-row__select filter-row__attribute" id="attribute"></select>
    <select class="filter-row__select filter-row__operator" id="operator"></select>
    <span id="valueSlot"></span>
    <button type="button" class="filter-row__remove" id="remove" aria-label="Remove filter">×</button>
  </div>
`;

const _operatorLabels: Record<string, string> = { equals: 'is', contains: 'contains', in: 'is any of' };

export class PmReportFilterRow extends HTMLElement {
  private attributeSelect: HTMLSelectElement | null = null;
  private operatorSelect: HTMLSelectElement | null = null;
  private valueSlot: HTMLElement | null = null;
  private removeButton: HTMLButtonElement | null = null;

  private _fields: ReportFieldsModel | null = null;
  private _filter: ReportFilterModel | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.attributeSelect = this.shadowRoot!.getElementById('attribute') as HTMLSelectElement;
    this.operatorSelect = this.shadowRoot!.getElementById('operator') as HTMLSelectElement;
    this.valueSlot = this.shadowRoot!.getElementById('valueSlot') as HTMLElement;
    this.removeButton = this.shadowRoot!.getElementById('remove') as HTMLButtonElement;

    this.attributeSelect.addEventListener('change', this.handleAttributeChange);
    this.operatorSelect.addEventListener('change', this.handleOperatorChange);
    this.removeButton.addEventListener('click', this.handleRemoveClick);

    this.renderAll();
  }

  set fields(fields: ReportFieldsModel) {
    this._fields = fields;
    this.renderAll();
  }

  set filter(filter: ReportFilterModel) {
    this._filter = filter;
    this.renderAll();
  }

  private currentField(): ReportField | undefined {
    return this._fields?.filters.find((field) => field.key === this._filter?.field);
  }

  private renderAll(): void {
    if (!this.attributeSelect || !this._fields || !this._filter) return;

    this.attributeSelect.textContent = '';
    for (const field of this._fields.filters) {
      const option = document.createElement('option');
      option.value = field.key;
      option.textContent = `${field.collection} · ${field.label}`;
      this.attributeSelect.appendChild(option);
    }
    this.attributeSelect.value = this._filter.field;

    this.renderOperator();
    this.renderValueControl();
  }

  private renderOperator(): void {
    if (!this.operatorSelect || !this._filter) return;

    const field = this.currentField();
    if (!field || field.dataType === 'Boolean') {
      this.operatorSelect.hidden = true;
      return;
    }

    this.operatorSelect.hidden = false;
    this.operatorSelect.textContent = '';
    for (const op of field.operators) {
      const option = document.createElement('option');
      option.value = op;
      option.textContent = _operatorLabels[op] ?? op;
      this.operatorSelect.appendChild(option);
    }
    this.operatorSelect.value = this._filter.operator;
  }

  private renderValueControl(): void {
    if (!this.valueSlot || !this._filter) return;

    const field = this.currentField();
    this.valueSlot.textContent = '';
    if (!field) return;

    if (field.dataType === 'Boolean') {
      const toggle = document.createElement('div');
      toggle.className = 'filter-row__toggle';
      for (const option of field.options) {
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = option.label;
        button.className = 'filter-row__toggle-option';
        if (this._filter.values.includes(option.value)) button.classList.add('filter-row__toggle-option--active');
        button.addEventListener('click', () => this.emitValues([option.value]));
        toggle.appendChild(button);
      }
      this.valueSlot.appendChild(toggle);
      return;
    }

    if (field.dataType === 'Text') {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'filter-row__value';
      input.placeholder = 'Type to filter…';
      input.value = this._filter.values[0] ?? '';
      input.addEventListener('input', () => this.emitValues([input.value]));
      this.valueSlot.appendChild(input);
      return;
    }

    // List: `equals` is a single select; `in` is the checklist dropdown.
    if (this._filter.operator === 'in') {
      const dropdown = document.createElement('pm-report-checklist-dropdown') as PmReportChecklistDropdown;
      dropdown.className = 'filter-row__value';
      dropdown.options = field.options;
      dropdown.values = this._filter.values;
      dropdown.addEventListener('checklist-changed', (event) => {
        this.emitValues((event as CustomEvent<{ values: string[] }>).detail.values);
      });
      this.valueSlot.appendChild(dropdown);
      return;
    }

    const select = document.createElement('select');
    select.className = 'filter-row__select filter-row__value';
    for (const option of field.options) {
      const el = document.createElement('option');
      el.value = option.value;
      el.textContent = option.label;
      select.appendChild(el);
    }
    select.value = this._filter.values[0] ?? '';
    select.addEventListener('change', () => this.emitValues([select.value]));
    this.valueSlot.appendChild(select);
  }

  private emitValues(values: string[]): void {
    this.dispatchEvent(new CustomEvent('filter-values-changed', { bubbles: true, composed: true, detail: { values } }));
  }

  private handleAttributeChange = (): void => {
    if (!this.attributeSelect) return;
    this.dispatchEvent(
      new CustomEvent('filter-attribute-changed', {
        bubbles: true,
        composed: true,
        detail: { field: this.attributeSelect.value },
      }),
    );
  };

  private handleOperatorChange = (): void => {
    if (!this.operatorSelect) return;
    this.dispatchEvent(
      new CustomEvent('filter-operator-changed', {
        bubbles: true,
        composed: true,
        detail: { operator: this.operatorSelect.value },
      }),
    );
  };

  private handleRemoveClick = (): void => {
    this.dispatchEvent(new CustomEvent('filter-remove-requested', { bubbles: true, composed: true }));
  };
}

customElements.define('pm-report-filter-row', PmReportFilterRow);
