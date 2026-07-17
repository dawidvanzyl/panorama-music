import { modalChromeStyles } from '../../../components/modal-chrome-styles';

const CONFIRM_PHRASE = 'REVOKE ALL';

const styles = new CSSStyleSheet();
styles.replaceSync(`
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

  <div class="modal__backdrop" id="backdrop">
    <div class="modal__card" role="alertdialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal__header">
        <span class="modal__icon">warning</span>
        <h2 class="modal__title" id="modalTitle">Revoke All Sessions</h2>
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
  private lastFocusedElement: Element | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', () => this.close());
    this.shadowRoot!.getElementById('revokeAllBtn')!.addEventListener('click', () => this.handleConfirm());
    this.shadowRoot!.getElementById('confirmInput')!.addEventListener('input', () => this.checkConfirmation());
    this.shadowRoot!.getElementById('backdrop')!.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) this.close();
    });
    this.addEventListener('keydown', this.handleKeydown);
  }

  disconnectedCallback(): void {
    this.removeEventListener('keydown', this.handleKeydown);
  }

  show(): void {
    this.lastFocusedElement = document.activeElement;
    (this.shadowRoot!.getElementById('confirmInput') as HTMLInputElement).value = '';
    (this.shadowRoot!.getElementById('revokeAllBtn') as HTMLButtonElement).disabled = true;
    this.setAttribute('open', '');
    (this.shadowRoot!.getElementById('confirmInput') as HTMLInputElement).focus();
  }

  private close(): void {
    this.removeAttribute('open');
    (this.lastFocusedElement as HTMLElement | null)?.focus();
  }

  private handleKeydown = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' && this.hasAttribute('open')) {
      this.close();
    }
  };

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
