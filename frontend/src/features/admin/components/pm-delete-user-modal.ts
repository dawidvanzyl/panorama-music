import { deleteUser, AdminError } from '../services/admin';

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
    .modal__email {
      color: var(--pm-text, #e2e1ed);
      font-weight: 500;
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
    .modal__btn--delete {
      background: var(--pm-danger, #e05252);
      border: 1px solid var(--pm-danger, #e05252);
      color: #fff;
    }
    .modal__btn--delete:hover:not(:disabled) {
      opacity: 0.9;
    }
    .modal__error {
      font-size: 12px;
      color: var(--pm-danger, #e05252);
      margin-bottom: 12px;
      display: none;
    }
    .modal__error--visible {
      display: block;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card">
      <div class="modal__header">
        <span class="modal__icon">delete_forever</span>
        <h2 class="modal__title">Permanently Delete User</h2>
      </div>
      <p class="modal__body">
        This action <strong>cannot be undone</strong>. All data for <span class="modal__email" id="modalEmail"></span> will be permanently removed.
      </p>
      <label class="modal__confirm-label" for="confirmInput">Type the user's email to confirm</label>
      <input class="modal__confirm-input" id="confirmInput" type="text" autocomplete="off" />
      <p class="modal__error" id="modalError"></p>
      <div class="modal__actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--delete" id="deleteBtn" type="button" disabled>Delete</button>
      </div>
    </div>
  </div>
`;

export class PmDeleteUserModal extends HTMLElement {
  private _userId: string = '';
  private _email: string = '';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', () => this.close());
    this.shadowRoot!.getElementById('deleteBtn')!.addEventListener('click', () => this.handleDelete());
    this.shadowRoot!.getElementById('confirmInput')!.addEventListener('input', () => this.checkConfirmation());
  }

  show(userId: string, email: string): void {
    this._userId = userId;
    this._email = email;
    this.shadowRoot!.getElementById('modalEmail')!.textContent = email;
    (this.shadowRoot!.getElementById('confirmInput') as HTMLInputElement).value = '';
    (this.shadowRoot!.getElementById('deleteBtn') as HTMLButtonElement).disabled = true;
    this.clearError();
    this.setAttribute('open', '');
  }

  private close(): void {
    this.removeAttribute('open');
  }

  private checkConfirmation(): void {
    const input = this.shadowRoot!.getElementById('confirmInput') as HTMLInputElement;
    const deleteBtn = this.shadowRoot!.getElementById('deleteBtn') as HTMLButtonElement;
    deleteBtn.disabled = input.value !== this._email;
  }

  private clearError(): void {
    const error = this.shadowRoot!.getElementById('modalError')!;
    error.textContent = '';
    error.classList.remove('modal__error--visible');
  }

  private handleDelete = async (): Promise<void> => {
    const cancelBtn = this.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement;
    const deleteBtn = this.shadowRoot!.getElementById('deleteBtn') as HTMLButtonElement;

    cancelBtn.disabled = true;
    deleteBtn.disabled = true;
    this.clearError();

    try {
      await deleteUser(this._userId);
      this.dispatchEvent(new CustomEvent('user-deleted', {
        bubbles: true,
        composed: true,
        detail: { userId: this._userId },
      }));
      this.close();
    } catch (err) {
      const error = this.shadowRoot!.getElementById('modalError')!;
      error.textContent = err instanceof AdminError ? err.message : 'An unexpected error occurred';
      error.classList.add('modal__error--visible');
      cancelBtn.disabled = false;
      deleteBtn.disabled = false;
    }
  };
}

customElements.define('pm-delete-user-modal', PmDeleteUserModal);
