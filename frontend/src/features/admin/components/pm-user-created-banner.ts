const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: none;
      font-family: 'Inter', system-ui, sans-serif;
    }
    :host([visible]) {
      display: block;
    }
    .banner {
      margin-top: 16px;
      padding: 24px;
      border-radius: var(--pm-radius);
      background: var(--pm-surface);
      border: 1px solid #8fd44e;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .banner__header {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .banner__icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: rgba(143, 212, 78, 0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .banner__icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 24px;
      color: #8fd44e;
    }
    .banner__title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--pm-text);
      margin: 0;
    }
    .banner__subtitle {
      font-size: 14px;
      color: var(--pm-text-muted);
      margin: 4px 0 0;
    }
    .banner__link-row {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .banner__link-box {
      flex: 1;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 10px 16px;
      font-size: 14px;
      color: var(--pm-text);
      word-break: break-all;
    }
    .banner__copy {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 24px;
      border: none;
      border-radius: var(--pm-radius);
      background: var(--pm-accent);
      color: #fff;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
    }
    .banner__copy:hover {
      filter: brightness(1.1);
    }
    .banner__copy:active {
      transform: scale(0.97);
    }
    .banner__copy-icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 18px;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="banner" role="status">
    <div class="banner__header">
      <div class="banner__icon-wrap">
        <span class="banner__icon">check_circle</span>
      </div>
      <div>
        <h2 class="banner__title">User created successfully</h2>
        <p class="banner__subtitle">Share this unique invitation link with the new user. It will expire in 24 hours.</p>
      </div>
    </div>
    <div class="banner__link-row">
      <div class="banner__link-box" id="inviteUrl"></div>
      <button type="button" class="banner__copy" id="copyBtn">
        <span class="banner__copy-icon">content_copy</span>
        Copy Link
      </button>
    </div>
  </div>
`;

export class PmUserCreatedBanner extends HTMLElement {
  private inviteUrlEl: HTMLElement | null = null;
  private copyBtn: HTMLButtonElement | null = null;
  private _inviteUrl = '';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.inviteUrlEl = this.shadowRoot!.getElementById('inviteUrl') as HTMLElement;
    this.copyBtn = this.shadowRoot!.getElementById('copyBtn') as HTMLButtonElement;
    this.copyBtn.addEventListener('click', this.handleCopy);
  }

  disconnectedCallback(): void {
    this.copyBtn?.removeEventListener('click', this.handleCopy);
  }

  show(inviteUrl: string): void {
    this._inviteUrl = inviteUrl;
    if (this.inviteUrlEl) this.inviteUrlEl.textContent = inviteUrl;
    this.setAttribute('visible', '');
  }

  hide(): void {
    this._inviteUrl = '';
    this.removeAttribute('visible');
  }

  private handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(this._inviteUrl);
  };
}

customElements.define('pm-user-created-banner', PmUserCreatedBanner);
