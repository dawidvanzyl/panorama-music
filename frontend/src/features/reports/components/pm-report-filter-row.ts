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

  /**
   * The field key the value control currently mounted in `valueSlot` was
   * built for. A reuse path (checklist/text/select — see
   * `renderValueControl`) must only fire when this matches the field being
   * rendered now: switching attribute between two List fields both left on
   * `equals`, for example, produces the same control shape (a `<select>`)
   * but a completely different option set, and reusing the old element
   * would leave it showing the wrong field's options.
   */
  private _valueControlFieldKey: string | null = null;

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
    if (!field) {
      this.valueSlot.textContent = '';
      this._valueControlFieldKey = null;
      return;
    }

    // Reusing a mounted control (rather than tearing it down and rebuilding
    // it) is only ever correct for the SAME field: two List fields both left
    // on `equals`, for example, produce the same control shape (a
    // `<select>`) but a completely different option set. The field key only
    // changes via chooseAttribute() (an attribute or operator switch), which
    // always rebuilds fresh, so this guard only blocks reuse where it would
    // actually be wrong.
    const sameField = this._valueControlFieldKey === field.key;

    // R3: a tick inside the `in` checklist re-renders this row like any
    // other state change. Reusing the existing dropdown element — rather
    // than tearing it down and appending a fresh, closed one — is what lets
    // its open/closed state survive that re-render.
    if (field.dataType === 'List' && this._filter.operator === 'in') {
      const existing = this.valueSlot.firstElementChild;
      if (sameField && this.valueSlot.children.length === 1 && existing?.tagName === 'PM-REPORT-CHECKLIST-DROPDOWN') {
        const dropdown = existing as PmReportChecklistDropdown;
        dropdown.options = field.options;
        dropdown.values = this._filter.values;
        return;
      }

      this.valueSlot.textContent = '';
      const dropdown = document.createElement('pm-report-checklist-dropdown') as PmReportChecklistDropdown;
      dropdown.className = 'filter-row__value';
      dropdown.options = field.options;
      dropdown.values = this._filter.values;
      dropdown.addEventListener('checklist-changed', (event) => {
        this.emitValues((event as CustomEvent<{ values: string[] }>).detail.values);
      });
      this.valueSlot.appendChild(dropdown);
      this._valueControlFieldKey = field.key;
      return;
    }

    if (field.dataType === 'Boolean') {
      this.valueSlot.textContent = '';
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
      this._valueControlFieldKey = field.key;
      return;
    }

    // review-1 Blocker 3: a values-only re-render (every keystroke, since
    // an `input` event bubbles up and rebuilds the whole tree the same way
    // a tick does — R3's bug class) used to tear down and recreate this
    // control, so a text input lost focus after its very first character.
    // Reused in place here, exactly like the checklist dropdown above.
    if (field.dataType === 'Text') {
      const existing = this.valueSlot.firstElementChild;
      const value = this._filter.values[0] ?? '';
      if (sameField && this.valueSlot.children.length === 1 && existing instanceof HTMLInputElement) {
        if (existing.value !== value) existing.value = value;
        return;
      }

      this.valueSlot.textContent = '';
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'filter-row__input filter-row__value';
      input.placeholder = 'Type to filter…';
      input.value = value;
      input.addEventListener('input', () => this.emitValues([input.value]));
      this.valueSlot.appendChild(input);
      this._valueControlFieldKey = field.key;
      return;
    }

    // List `equals` is the only case left here — `in` is handled above.
    const value = this._filter.values[0] ?? '';
    const existing = this.valueSlot.firstElementChild;
    if (sameField && this.valueSlot.children.length === 1 && existing instanceof HTMLSelectElement) {
      if (existing.value !== value) existing.value = value;
      return;
    }

    this.valueSlot.textContent = '';
    const select = document.createElement('select');
    select.className = 'filter-row__select filter-row__value';
    for (const option of field.options) {
      const el = document.createElement('option');
      el.value = option.value;
      el.textContent = option.label;
      select.appendChild(el);
    }
    select.value = value;
    select.addEventListener('change', () => this.emitValues([select.value]));
    this.valueSlot.appendChild(select);
    this._valueControlFieldKey = field.key;
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
