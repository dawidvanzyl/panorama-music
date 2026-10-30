import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import { setButtonsBusy } from '../../../components/button-states';

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
        <h2 class="modal__title" id="modalTitle">Delete User</h2>
        <button type="button" class="modal__close" id="closeBtn" aria-label="Close">close</button>
      </div>
      <p class="modal__body">
        This action <strong>cannot be undone</strong>. The user <strong id="modalEmail"></strong> will be permanently removed.
      </p>
      <label class="modal__confirm-label" id="confirmLabel" for="confirmInput"></label>
      <input class="modal__confirm-input" id="confirmInput" type="text" autocomplete="off" />
      <p class="modal__error" id="error" data-testid="modal-error"></p>
      <div class="modal__actions" data-testid="modal-actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--destructive" id="deleteBtn" type="button" disabled>Delete</button>
      </div>
    </div>
  </div>
`;

export class PmDeleteUserModal extends HTMLElement {
  private _userId: string = '';
  private _email: string = '';
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
    this.shadowRoot!.getElementById('deleteBtn')!.addEventListener('click', () => this.handleDelete());
    this.shadowRoot!.getElementById('confirmInput')!.addEventListener('input', () => this.checkConfirmation());
  }

  show(userId: string, email: string): void {
    this._userId = userId;
    this._email = email;
    this.shadowRoot!.getElementById('modalEmail')!.textContent = email;
    this.shadowRoot!.getElementById('confirmLabel')!.textContent = `Type "${email}" to confirm`;
    (this.shadowRoot!.getElementById('confirmInput') as HTMLInputElement).value = '';
    this.showError('');
    this.setBusy(false);
    this.setAttribute('open', '');
  }

  close(): void {
    this.removeAttribute('open');
    this.setBusy(false);
  }

  setBusy(busy: boolean): void {
    this.busy = busy;
    setButtonsBusy(
      this.shadowRoot!.getElementById('deleteBtn') as HTMLButtonElement,
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
    const deleteBtn = this.shadowRoot!.getElementById('deleteBtn') as HTMLButtonElement;
    deleteBtn.disabled = this.busy || input.value !== this._email;
  }

  private handleDelete(): void {
    this.setBusy(true);
    this.dispatchEvent(
      new CustomEvent('user-delete-confirmed', {
        bubbles: true,
        composed: true,
        detail: { userId: this._userId },
      }),
    );
  }
}

customElements.define('pm-delete-user-modal', PmDeleteUserModal);
