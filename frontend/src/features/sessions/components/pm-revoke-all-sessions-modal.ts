import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import { setButtonsBusy } from '../../../components/button-states';

const CONFIRM_PHRASE = 'REVOKE ALL';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    .modal__confirm-label {
      font-size: 13px;
      color: var(--pm-text-muted);
      margin-bottom: 6px;
      display: block;
    }
    .modal__confirm-input {
      width: 100%;
      box-sizing: border-box;
      height: 40px;
      padding: 0 12px;
      border-radius: var(--pm-radius);
      border: 1px solid var(--pm-border);
      background: var(--pm-surface-2);
      color: var(--pm-text);
      font-size: 13px;
      margin-bottom: 24px;
      outline: none;
    }
    .modal__confirm-input:focus {
      border-color: var(--pm-danger);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card" role="alertdialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal__header">
        <span class="modal__icon" aria-hidden="true">delete_forever</span>
        <h2 class="modal__title" id="modalTitle">Revoke All Sessions</h2>
        <button type="button" class="modal__close" id="closeBtn" aria-label="Close">close</button>
      </div>
      <p class="modal__body">
        This action <strong>cannot be undone</strong>. Every other session of every user will be ended. Those users must sign in again.
      </p>
      <label class="modal__confirm-label" id="confirmLabel" for="confirmInput">Type "${CONFIRM_PHRASE}" to confirm</label>
      <input class="modal__confirm-input" id="confirmInput" type="text" autocomplete="off" />
      <p class="modal__error" id="error" data-testid="modal-error"></p>
      <div class="modal__actions" data-testid="modal-actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--destructive" id="revokeAllBtn" type="button" disabled>Revoke All</button>
      </div>
    </div>
  </div>
`;

export class PmRevokeAllSessionsModal extends HTMLElement {
  private lastFocusedElement: Element | null = null;
  private busy = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', () => this.close());
    this.shadowRoot!.getElementById('closeBtn')!.addEventListener('click', () => this.close());
    this.shadowRoot!.getElementById('revokeAllBtn')!.addEventListener('click', () => this.handleConfirm());
    this.shadowRoot!.getElementById('confirmInput')!.addEventListener('input', () => this.checkConfirmation());
  }

  show(): void {
    this.lastFocusedElement = document.activeElement;
    (this.shadowRoot!.getElementById('confirmInput') as HTMLInputElement).value = '';
    this.showError('');
    this.setBusy(false);
    this.setAttribute('open', '');
    (this.shadowRoot!.getElementById('confirmInput') as HTMLInputElement).focus();
  }

  close(): void {
    this.removeAttribute('open');
    this.setBusy(false);
    (this.lastFocusedElement as HTMLElement | null)?.focus();
  }

  setBusy(busy: boolean): void {
    this.busy = busy;
    setButtonsBusy(
      this.shadowRoot!.getElementById('revokeAllBtn') as HTMLButtonElement,
      [
        this.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement,
        this.shadowRoot!.getElementById('closeBtn') as HTMLButtonElement,
      ],
      busy,
    );
    this.checkConfirmation();
  }

  showError(message: string): void {
    this.shadowRoot!.getElementById('error')!.textContent = message;
  }

  private checkConfirmation(): void {
    const input = this.shadowRoot!.getElementById('confirmInput') as HTMLInputElement;
    const revokeAllBtn = this.shadowRoot!.getElementById('revokeAllBtn') as HTMLButtonElement;
    revokeAllBtn.disabled = this.busy || input.value !== CONFIRM_PHRASE;
  }

  private handleConfirm(): void {
    this.setBusy(true);
    this.dispatchEvent(
      new CustomEvent('revoke-all-sessions-confirmed', {
        bubbles: true,
        composed: true,
      }),
    );
  }
}

customElements.define('pm-revoke-all-sessions-modal', PmRevokeAllSessionsModal);
