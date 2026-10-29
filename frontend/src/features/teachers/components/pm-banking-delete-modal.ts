import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import { setButtonsBusy } from '../../../components/button-states';

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal__header">
        <span class="modal__icon" aria-hidden="true">delete_forever</span>
        <h2 class="modal__title" id="modalTitle">Delete Banking Details</h2>
        <button type="button" class="modal__close" id="closeBtn" aria-label="Close">close</button>
      </div>
      <p class="modal__body">
        This action <strong>cannot be undone</strong>. The banking details <strong>ending <span id="modalLast4"></span></strong> will be permanently removed.
      </p>
      <p class="modal__error" id="error" data-testid="modal-error"></p>
      <div class="modal__actions" data-testid="modal-actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--destructive" id="deleteBtn" type="button">Delete</button>
      </div>
    </div>
  </div>
`;

/**
 * Confirms deleting a teacher's banking details. Names the record by its last
 * four digits — the only part of the number this side of the application ever
 * holds.
 */
export class PmBankingDeleteModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('closeBtn')!.addEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('deleteBtn')!.addEventListener('click', this.handleDelete);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')?.removeEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('closeBtn')?.removeEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('deleteBtn')?.removeEventListener('click', this.handleDelete);
  }

  show(accountNumberLast4: string): void {
    this.shadowRoot!.getElementById('modalLast4')!.textContent = accountNumberLast4;
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
      this.shadowRoot!.getElementById('deleteBtn') as HTMLButtonElement,
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

  private handleDelete = (): void => {
    this.setBusy(true);
    this.dispatchEvent(
      new CustomEvent('teacher-banking-delete-confirmed', {
        bubbles: true,
        composed: true,
      }),
    );
  };
}

customElements.define('pm-banking-delete-modal', PmBankingDeleteModal);
