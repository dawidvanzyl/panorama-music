import { modalChromeStyles } from '../../../components/modal-chrome-styles';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      --pm-modal-body-gap: 32px;
    }
    .modal__email {
      color: var(--pm-text, #e2e1ed);
      font-weight: 500;
    }
    .modal__btn--deactivate {
      background: var(--pm-danger, #e05252);
      border: 1px solid var(--pm-danger, #e05252);
      color: #fff;
    }
    .modal__btn--deactivate:hover:not(:disabled) {
      opacity: 0.9;
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
    this.setAttribute('open', '');
  }

  private close(): void {
    this.removeAttribute('open');
  }

  private handleDeactivate(): void {
    this.dispatchEvent(
      new CustomEvent('user-deactivate-confirmed', {
        bubbles: true,
        composed: true,
        detail: { userId: this._userId },
      }),
    );
    this.close();
  }
}

customElements.define('pm-deactivate-user-modal', PmDeactivateUserModal);
