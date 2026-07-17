import { deactivateUser, AdminError } from '../services/admin';
import { modalChromeStyles } from '../../../components/pm-modal-chrome-styles';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    .modal__body {
      margin-bottom: 32px;
    }
    .modal__btn--deactivate {
      background: var(--pm-danger, #e05252);
      border: 1px solid var(--pm-danger, #e05252);
      color: #fff;
    }
    .modal__btn--deactivate:hover:not(:disabled) {
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
        <span class="modal__icon">warning</span>
        <h2 class="modal__title">Deactivate User</h2>
      </div>
      <p class="modal__body">
        Are you sure you want to deactivate the user <span class="modal__email" id="modalEmail"></span>? They will no longer be able to log in.
      </p>
      <p class="modal__error" id="modalError"></p>
      <div class="modal__actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--deactivate" id="deactivateBtn" type="button">Deactivate</button>
      </div>
    </div>
  </div>
`;

export class PmDeactivateUserModal extends HTMLElement {
  private _userId: string = '';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', () => this.close());
    this.shadowRoot!.getElementById('deactivateBtn')!.addEventListener('click', () => this.handleDeactivate());
  }

  show(userId: string, email: string): void {
    this._userId = userId;
    this.shadowRoot!.getElementById('modalEmail')!.textContent = email;
    (this.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement).disabled = false;
    (this.shadowRoot!.getElementById('deactivateBtn') as HTMLButtonElement).disabled = false;
    this.clearError();
    this.setAttribute('open', '');
  }

  private close(): void {
    this.removeAttribute('open');
  }

  private clearError(): void {
    const error = this.shadowRoot!.getElementById('modalError')!;
    error.textContent = '';
    error.classList.remove('modal__error--visible');
  }

  private handleDeactivate = async (): Promise<void> => {
    const cancelBtn = this.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement;
    const deactivateBtn = this.shadowRoot!.getElementById('deactivateBtn') as HTMLButtonElement;

    cancelBtn.disabled = true;
    deactivateBtn.disabled = true;
    this.clearError();

    try {
      await deactivateUser(this._userId);
      this.dispatchEvent(new CustomEvent('user-deactivated', {
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
      deactivateBtn.disabled = false;
    }
  };
}

customElements.define('pm-deactivate-user-modal', PmDeactivateUserModal);
