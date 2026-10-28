import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import { setButtonsBusy } from '../../../components/button-states';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    .modal__email {
      color: var(--pm-text);
      font-weight: 500;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal__header">
        <span class="modal__icon modal__icon--reversible">link_off</span>
        <h2 class="modal__title" id="modalTitle">Unlink this account?</h2>
        <button type="button" class="modal__close" id="closeBtn" aria-label="Close">close</button>
      </div>
      <p class="modal__body">
        Are you sure you want to unlink <span class="modal__email" id="modalEmail"></span>?<br /><br />The teacher record survives
        and the account keeps its Teacher role, but the teacher loses self-service access to this profile and its
        banking details.
      </p>
      <p class="modal__error" id="error" data-testid="modal-error"></p>
      <div class="modal__actions" data-testid="modal-actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--destructive" id="unlinkBtn" type="button">Unlink</button>
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
    this.shadowRoot!.getElementById('closeBtn')!.addEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('unlinkBtn')!.addEventListener('click', this.handleUnlink);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')?.removeEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('closeBtn')?.removeEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('unlinkBtn')?.removeEventListener('click', this.handleUnlink);
  }

  show(accountEmail: string | null): void {
    this.shadowRoot!.getElementById('modalEmail')!.textContent = accountEmail ?? 'this account';
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
      this.shadowRoot!.getElementById('unlinkBtn') as HTMLButtonElement,
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

  private handleCancel = (): void => this.close();

  private handleUnlink = (): void => {
    this.setBusy(true);
    this.dispatchEvent(
      new CustomEvent('teacher-account-unlink-confirmed', {
        bubbles: true,
        composed: true,
      }),
    );
  };
}

customElements.define('pm-unlink-account-modal', PmUnlinkAccountModal);
