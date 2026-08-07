const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: inline-flex;
    }
    .linked-account-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      /* Matches the status and type chips beside it, so the row reads as one
         set rather than one oversized pill among smaller ones. */
      padding: 2px 10px;
      border-radius: 9999px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      color: var(--pm-text);
      font-size: 12px;
      font-weight: 600;
    }
    .linked-account-badge--none {
      padding: 0;
      border: none;
      background: none;
      color: var(--pm-text-muted);
      font-weight: 500;
    }
    .linked-account-badge__icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      /* line-height 1 keeps the glyph from adding its own leading and pushing
         the pill taller than its 2px padding implies. */
      font-size: 16px;
      line-height: 1;
      color: var(--pm-accent);
    }
    .linked-account-badge--none .linked-account-badge__icon {
      color: inherit;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <span class="linked-account-badge" id="badge">
    <span class="linked-account-badge__icon" id="icon" aria-hidden="true"></span>
    <span id="label"></span>
  </span>
`;

/** Names the login account a teacher is linked to, or says there isn't one. */
export class PmLinkedAccountBadge extends HTMLElement {
  private badge: HTMLElement | null = null;
  private icon: HTMLElement | null = null;
  private label: HTMLElement | null = null;
  private _email: string | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.badge = this.shadowRoot!.getElementById('badge') as HTMLElement;
    this.icon = this.shadowRoot!.getElementById('icon') as HTMLElement;
    this.label = this.shadowRoot!.getElementById('label') as HTMLElement;
    this.render();
  }

  set email(value: string | null) {
    this._email = value;
    this.render();
  }

  get email(): string | null {
    return this._email;
  }

  private render(): void {
    if (!this.badge || !this.icon || !this.label) return;

    const linked = this._email !== null;
    this.badge.className = linked ? 'linked-account-badge' : 'linked-account-badge linked-account-badge--none';
    this.icon.textContent = linked ? 'account_circle' : 'no_accounts';
    this.label.textContent = linked ? this._email! : 'No login account';
  }
}

customElements.define('pm-linked-account-badge', PmLinkedAccountBadge);
