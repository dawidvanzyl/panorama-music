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
      padding: 16px;
      border-radius: var(--pm-radius);
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .banner__info {
      display: flex;
      align-items: center;
      gap: 12px;
      min-width: 0;
    }
    .banner__icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 20px;
      color: #8fd44e;
      flex-shrink: 0;
    }
    .banner__text {
      min-width: 0;
    }
    .banner__title {
      font-size: 13px;
      font-weight: 600;
      color: #8fd44e;
      margin: 0 0 2px;
    }
    .banner__url {
      font-size: 12px;
      color: var(--pm-text-muted);
      word-break: break-all;
      margin: 0;
    }
    .banner__copy {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 6px 16px;
      border: none;
      border-radius: var(--pm-radius);
      background: var(--pm-accent);
      color: #fff;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      flex-shrink: 0;
    }
    .banner__copy:hover {
      filter: brightness(1.1);
    }
    .banner__copy:active {
      transform: scale(0.97);
    }
    .banner__copy-icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 16px;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="banner" role="status">
    <div class="banner__info">
      <span class="banner__icon">check_circle</span>
      <div class="banner__text">
        <p class="banner__title">Invite Regenerated Successfully</p>
        <p class="banner__url" id="inviteUrl"></p>
      </div>
    </div>
    <button type="button" class="banner__copy" id="copyBtn">
      <span class="banner__copy-icon">content_copy</span>
      Copy Link
    </button>
  </div>
`;

export class PmReinviteBanner extends HTMLElement {
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

customElements.define('pm-reinvite-banner', PmReinviteBanner);
