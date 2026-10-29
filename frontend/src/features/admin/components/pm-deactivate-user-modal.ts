import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import { setButtonsBusy } from '../../../components/button-states';

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal__header">
        <span class="modal__icon modal__icon--reversible" aria-hidden="true">info</span>
        <h2 class="modal__title" id="modalTitle">Deactivate User</h2>
        <button type="button" class="modal__close" id="closeBtn" aria-label="Close">close</button>
      </div>
      <p class="modal__body">
        The user <strong id="modalEmail"></strong> will be deactivated. They can no longer sign in. You can reactivate
        this user later.
      </p>
      <p class="modal__error" id="error" data-testid="modal-error"></p>
      <div class="modal__actions" data-testid="modal-actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--primary" id="deactivateBtn" type="button">Deactivate</button>
      </div>
    </div>
  </div>
`;

export class PmDeactivateUserModal extends HTMLElement {
  private _userId: string = '';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', () => this.close());
    this.shadowRoot!.getElementById('closeBtn')!.addEventListener('click', () => this.close());
    this.shadowRoot!.getElementById('deactivateBtn')!.addEventListener('click', () => this.handleDeactivate());
  }

  show(userId: string, email: string): void {
    this._userId = userId;
    this.shadowRoot!.getElementById('modalEmail')!.textContent = email;
    this.showError('');
    this.setBusy(false);
    this.setAttribute('open', '');
  }

  close(): void {
    this.removeAttribute('open');
    this.setBusy(false);
  }

  setBusy(busy: boolean): void {
    setButtonsBusy(
      this.shadowRoot!.getElementById('deactivateBtn') as HTMLButtonElement,
      [
        this.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement,
        this.shadowRoot!.getElementById('closeBtn') as HTMLButtonElement,
      ],
      busy,
    );
  }

  showError(message: string): void {
    this.shadowRoot!.getElementById('error')!.textContent = message;
  }

  private handleDeactivate(): void {
    this.setBusy(true);
    this.dispatchEvent(
      new CustomEvent('user-deactivate-confirmed', {
        bubbles: true,
        composed: true,
        detail: { userId: this._userId },
      }),
    );
  }
}

customElements.define('pm-deactivate-user-modal', PmDeactivateUserModal);
