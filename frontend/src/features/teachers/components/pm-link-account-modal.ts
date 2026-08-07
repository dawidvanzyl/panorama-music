import './pm-account-link-picker';
import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import type { LinkableAccount } from '../services/teachers';
import type { PmAccountLinkPicker } from './pm-account-link-picker';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    /* Neutral tone: linking is a routine action, not a destructive one, so the
       header carries the accent rather than the danger colour the shared chrome
       defaults to. */
    .modal__icon,
    .modal__title {
      color: var(--pm-accent);
    }
    .modal__btn--link {
      background: var(--pm-accent);
      border: 1px solid var(--pm-accent);
      color: #fff;
    }
    .modal__btn--link:hover:not(:disabled) {
      opacity: 0.9;
    }
    .modal__error {
      margin-top: 12px;
      font-size: 13px;
      color: var(--pm-danger, #e05252);
    }
    .modal__error:empty {
      display: none;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card">
      <div class="modal__header">
        <span class="modal__icon">link</span>
        <h2 class="modal__title">Link a login account</h2>
      </div>
      <div class="modal__body">
        <pm-account-link-picker
          id="picker"
          label="Accounts with the Teacher role and no teacher link"
          hint="Only accounts that already hold the Teacher role can be linked, and an account can be linked to one teacher only. Once linked, the link can only be removed, not changed."
        ></pm-account-link-picker>
        <p class="modal__error" id="error"></p>
      </div>
      <div class="modal__actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--link" id="linkBtn" type="button">Link account</button>
      </div>
    </div>
  </div>
`;

/** Chooses the account to link. Confirming emits the choice; the page saves it. */
export class PmLinkAccountModal extends HTMLElement {
  private picker: PmAccountLinkPicker | null = null;
  private errorEl: HTMLElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.picker = this.shadowRoot!.getElementById('picker') as unknown as PmAccountLinkPicker;
    this.errorEl = this.shadowRoot!.getElementById('error') as HTMLElement;
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('linkBtn')!.addEventListener('click', this.handleLink);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')?.removeEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('linkBtn')?.removeEventListener('click', this.handleLink);
  }

  show(accounts: LinkableAccount[]): void {
    this.picker!.accounts = accounts;
    this.picker!.reset();
    this.errorEl!.textContent = '';
    this.setAttribute('open', '');
  }

  close(): void {
    this.removeAttribute('open');
  }

  /** Keeps the modal open so the account can be re-chosen after a rejection. */
  showError(message: string): void {
    this.errorEl!.textContent = message;
  }

  private handleCancel = (): void => this.close();

  private handleLink = (): void => {
    const accountId = this.picker!.selectedAccountId;
    if (accountId === null) {
      this.showError('Select an account to link.');
      return;
    }

    this.errorEl!.textContent = '';
    this.dispatchEvent(
      new CustomEvent('teacher-account-link-confirmed', {
        bubbles: true,
        composed: true,
        detail: { accountId },
      }),
    );
  };
}

customElements.define('pm-link-account-modal', PmLinkAccountModal);
