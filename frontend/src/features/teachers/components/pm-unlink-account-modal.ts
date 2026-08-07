import { modalChromeStyles } from '../../../components/modal-chrome-styles';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    .modal__email {
      color: var(--pm-text, #e2e1ed);
      font-weight: 500;
    }
    .modal__btn--unlink {
      background: var(--pm-danger, #e05252);
      border: 1px solid var(--pm-danger, #e05252);
      color: #fff;
    }
    .modal__btn--unlink:hover:not(:disabled) {
      opacity: 0.9;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card">
      <div class="modal__header">
        <span class="modal__icon">link_off</span>
        <h2 class="modal__title">Unlink this account?</h2>
      </div>
      <p class="modal__body">
        Are you sure you want to unlink <span class="modal__email" id="modalEmail"></span>? The teacher record survives
        and the account keeps its Teacher role, but the teacher loses self-service access to this profile and its
        banking details.
      </p>
      <div class="modal__actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--unlink" id="unlinkBtn" type="button">Unlink</button>
      </div>
    </div>
  </div>
`;

/** Confirms removing a teacher's account link before anything is sent. */
export class PmUnlinkAccountModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('unlinkBtn')!.addEventListener('click', this.handleUnlink);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')?.removeEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('unlinkBtn')?.removeEventListener('click', this.handleUnlink);
  }

  show(accountEmail: string | null): void {
    this.shadowRoot!.getElementById('modalEmail')!.textContent = accountEmail ?? 'this account';
    this.setAttribute('open', '');
  }

  close(): void {
    this.removeAttribute('open');
  }

  private handleCancel = (): void => this.close();

  private handleUnlink = (): void => {
    this.dispatchEvent(
      new CustomEvent('teacher-account-unlink-confirmed', {
        bubbles: true,
        composed: true,
      }),
    );
    this.close();
  };
}

customElements.define('pm-unlink-account-modal', PmUnlinkAccountModal);
