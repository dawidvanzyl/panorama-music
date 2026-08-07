import type { LinkableAccount } from '../services/teachers';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    label {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text-muted);
    }
    select {
      height: 38px;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
    }
    .account-link-picker__hint {
      font-size: 11px;
      line-height: 1.6;
      letter-spacing: 0.02em;
      color: var(--pm-text-muted);
    }
  `);

const DEFAULT_LABEL = 'Link a login account (optional)';
const DEFAULT_HINT =
  'Only accounts holding the Teacher role and not already linked to a teacher are listed. Once linked, the link can only be removed, not changed.';

const template = document.createElement('template');
template.innerHTML = `

  <label for="account" id="label"></label>
  <select id="account">
    <option value="">Select an account…</option>
  </select>
  <span class="account-link-picker__hint" id="hint"></span>
`;

/**
 * The account chooser, used both on the create form and inside the link modal —
 * each host supplies its own label and hint. It only ever renders what it is
 * given: which accounts are eligible is decided on the server, because that is a
 * correctness constraint rather than a display filter.
 */
export class PmAccountLinkPicker extends HTMLElement {
  static get observedAttributes(): string[] {
    return ['label', 'hint'];
  }

  private select: HTMLSelectElement | null = null;
  private labelEl: HTMLElement | null = null;
  private hintEl: HTMLElement | null = null;
  private _accounts: LinkableAccount[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.select = this.shadowRoot!.getElementById('account') as HTMLSelectElement;
    this.labelEl = this.shadowRoot!.getElementById('label') as HTMLElement;
    this.hintEl = this.shadowRoot!.getElementById('hint') as HTMLElement;
    this.render();
  }

  attributeChangedCallback(): void {
    this.renderText();
  }

  set accounts(value: LinkableAccount[]) {
    this._accounts = value;
    this.render();
  }

  get accounts(): LinkableAccount[] {
    return this._accounts;
  }

  /** The chosen account id, or null while the placeholder is selected. */
  get selectedAccountId(): string | null {
    const value = this.select?.value ?? '';
    return value === '' ? null : value;
  }

  reset(): void {
    if (this.select) this.select.value = '';
  }

  private render(): void {
    this.renderText();
    this.renderOptions();
  }

  private renderText(): void {
    if (!this.labelEl || !this.hintEl) return;

    this.labelEl.textContent = this.getAttribute('label') ?? DEFAULT_LABEL;
    this.hintEl.textContent = this.getAttribute('hint') ?? DEFAULT_HINT;
  }

  private renderOptions(): void {
    if (!this.select) return;

    const selected = this.select.value;
    this.select.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select an account…';
    this.select.appendChild(placeholder);

    for (const account of this._accounts) {
      const option = document.createElement('option');
      option.value = account.accountId;
      option.textContent = account.email;
      this.select.appendChild(option);
    }

    this.select.value = selected;
  }
}

customElements.define('pm-account-link-picker', PmAccountLinkPicker);
