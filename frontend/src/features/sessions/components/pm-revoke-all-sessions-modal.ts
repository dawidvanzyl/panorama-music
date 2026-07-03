const CONFIRM_PHRASE = 'REVOKE ALL';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: none;
    }
    :host([open]) {
      display: block;
    }
    .modal__backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.6);
      backdrop-filter: blur(2px);
      z-index: 100;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .modal__card {
      background: #1a1d27;
      border: 1px solid #2e3250;
      border-radius: 10px;
      padding: 24px;
      max-width: 420px;
      width: calc(100% - 32px);
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    }
    .modal__header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 16px;
    }
    .modal__icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      color: var(--pm-danger, #e05252);
      font-size: 24px;
    }
    .modal__title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--pm-danger, #e05252);
    }
    .modal__body {
      font-size: 14px;
      line-height: 1.6;
      color: var(--pm-text-muted, #9194a6);
      margin-bottom: 16px;
    }
    .modal__confirm-label {
      font-size: 13px;
      color: var(--pm-text-muted, #9194a6);
      margin-bottom: 6px;
      display: block;
    }
    .modal__confirm-input {
      width: 100%;
      box-sizing: border-box;
      padding: 8px 12px;
      border-radius: var(--pm-radius, 6px);
      border: 1px solid var(--pm-border, #2e3250);
      background: var(--pm-surface-2, #22263a);
      color: var(--pm-text, #e2e1ed);
      font-size: 13px;
      margin-bottom: 24px;
      outline: none;
    }
    .modal__confirm-input:focus {
      border-color: var(--pm-danger, #e05252);
    }
    .modal__actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .modal__btn {
      padding: 10px 24px;
      border-radius: 9999px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .modal__btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .modal__btn--cancel {
      background: transparent;
      border: 1px solid var(--pm-border, #2e3250);
      color: var(--pm-text-muted, #9194a6);
    }
    .modal__btn--cancel:hover:not(:disabled) {
      background: var(--pm-surface-2, #22263a);
    }
    .modal__btn--revoke-all {
      background: var(--pm-danger, #e05252);
      border: 1px solid var(--pm-danger, #e05252);
      color: #fff;
    }
    .modal__btn--revoke-all:hover:not(:disabled) {
      opacity: 0.9;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card">
      <div class="modal__header">
        <span class="modal__icon">warning</span>
        <h2 class="modal__title">Revoke All Sessions</h2>
      </div>
      <p class="modal__body">
        This will immediately terminate every other active session across the entire system. Type <strong>${CONFIRM_PHRASE}</strong> to confirm.
      </p>
      <label class="modal__confirm-label" for="confirmInput">Type "${CONFIRM_PHRASE}" to confirm</label>
      <input class="modal__confirm-input" id="confirmInput" type="text" autocomplete="off" />
      <div class="modal__actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--revoke-all" id="revokeAllBtn" type="button" disabled>Revoke All</button>
      </div>
    </div>
  </div>
`;

export class PmRevokeAllSessionsModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', () => this.close());
    this.shadowRoot!.getElementById('revokeAllBtn')!.addEventListener('click', () => this.handleConfirm());
    this.shadowRoot!.getElementById('confirmInput')!.addEventListener('input', () => this.checkConfirmation());
  }

  show(): void {
    (this.shadowRoot!.getElementById('confirmInput') as HTMLInputElement).value = '';
    (this.shadowRoot!.getElementById('revokeAllBtn') as HTMLButtonElement).disabled = true;
    this.setAttribute('open', '');
  }

  private close(): void {
    this.removeAttribute('open');
  }

  private checkConfirmation(): void {
    const input = this.shadowRoot!.getElementById('confirmInput') as HTMLInputElement;
    const revokeAllBtn = this.shadowRoot!.getElementById('revokeAllBtn') as HTMLButtonElement;
    revokeAllBtn.disabled = input.value !== CONFIRM_PHRASE;
  }

  private handleConfirm(): void {
    this.dispatchEvent(new CustomEvent('revoke-all-sessions-confirmed', {
      bubbles: true,
      composed: true,
    }));
    this.close();
  }
}

customElements.define('pm-revoke-all-sessions-modal', PmRevokeAllSessionsModal);
