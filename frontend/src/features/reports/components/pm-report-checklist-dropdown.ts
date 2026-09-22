import type { ReportFieldOption } from '../models/report';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
      position: relative;
    }
    .checklist__toggle {
      box-sizing: border-box;
      width: 100%;
      min-width: 160px;
      height: 36px;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 13px;
      font-family: inherit;
      text-align: left;
      cursor: pointer;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .checklist__panel {
      display: none;
      position: absolute;
      z-index: 20;
      margin-top: 4px;
      min-width: 200px;
      max-height: 220px;
      overflow-y: auto;
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      box-shadow: var(--pm-shadow);
      padding: 6px 0;
    }
    .checklist__panel--open {
      display: block;
    }
    .checklist__option {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      font-size: 13px;
      color: var(--pm-text);
      cursor: pointer;
    }
    .checklist__option:hover {
      background: var(--pm-surface-2);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <button type="button" class="checklist__toggle" id="toggle">Select…</button>
  <div class="checklist__panel" id="panel"></div>
`;

/**
 * A dropdown checklist for an `in` filter's values. Opens and closes on
 * click, and closes on an outside click — no keyboard interaction, per the
 * app's mouse-only design.
 */
export class PmReportChecklistDropdown extends HTMLElement {
  private toggle: HTMLButtonElement | null = null;
  private panel: HTMLElement | null = null;
  private _options: ReportFieldOption[] = [];
  private _values: string[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.toggle = this.shadowRoot!.getElementById('toggle') as HTMLButtonElement;
    this.panel = this.shadowRoot!.getElementById('panel') as HTMLElement;

    this.toggle.addEventListener('click', this.handleToggleClick);
    document.addEventListener('click', this.handleOutsideClick);

    // `options`/`values` are normally set before this element is appended
    // (the caller builds it, assigns its properties, then appends it), so
    // those setters' render() calls run while `this.panel`/`this.toggle`
    // are still null and no-op. Render once more here, now that both are
    // wired up, or the panel stays permanently empty (#324).
    this.render();
  }

  disconnectedCallback(): void {
    document.removeEventListener('click', this.handleOutsideClick);
  }

  set options(options: ReportFieldOption[]) {
    this._options = options;
    this.render();
  }

  set values(values: string[]) {
    this._values = values;
    this.render();
  }

  get values(): string[] {
    return this._values;
  }

  private render(): void {
    if (!this.panel || !this.toggle) return;

    this.panel.textContent = '';
    for (const option of this._options) {
      const row = document.createElement('label');
      row.className = 'checklist__option';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = this._values.includes(option.value);
      checkbox.addEventListener('change', () => this.handleCheckChange(option.value, checkbox.checked));

      const label = document.createElement('span');
      label.textContent = option.label;

      row.appendChild(checkbox);
      row.appendChild(label);
      this.panel.appendChild(row);
    }

    const chosenLabels = this._options
      .filter((option) => this._values.includes(option.value))
      .map((option) => option.label);
    this.toggle.textContent = chosenLabels.length > 0 ? chosenLabels.join(' · ') : 'Select…';
  }

  private handleCheckChange(value: string, checked: boolean): void {
    const next = checked ? [...this._values, value] : this._values.filter((v) => v !== value);
    this._values = next;
    this.render();
    this.dispatchEvent(
      new CustomEvent('checklist-changed', { bubbles: true, composed: true, detail: { values: next } }),
    );
  }

  private handleToggleClick = (event: MouseEvent): void => {
    event.stopPropagation();
    this.panel?.classList.toggle('checklist__panel--open');
  };

  private handleOutsideClick = (event: MouseEvent): void => {
    // event.target is retargeted at each shadow boundary it crosses — a
    // listener on document (outside every nested shadow root this component
    // sits under) sees it collapsed all the way to the outermost shadow
    // host, never to this element or any of its own descendants (#326).
    // composedPath() is the actual, un-retargeted node sequence the event
    // passed through, so it is what correctly answers "did this click
    // originate inside this component".
    if (!event.composedPath().includes(this)) {
      this.panel?.classList.remove('checklist__panel--open');
    }
  };
}

customElements.define('pm-report-checklist-dropdown', PmReportChecklistDropdown);
