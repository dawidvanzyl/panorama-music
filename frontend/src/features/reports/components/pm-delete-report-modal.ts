import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import { setButtonsBusy } from '../../../components/button-states';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host([open]) {
      position: fixed;
      inset: 0;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="modal__backdrop">
    <div class="modal__card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal__header">
        <span class="modal__icon" aria-hidden="true">delete_forever</span>
        <h2 class="modal__title" id="modalTitle" data-testid="delete-report-title">Delete Report</h2>
        <button type="button" class="modal__close" id="closeBtn" aria-label="Close">close</button>
      </div>
      <p class="modal__body" data-testid="delete-report-text">
        This action <strong>cannot be undone</strong>. The report <strong id="reportName" data-testid="delete-report-name"></strong> will be permanently removed.
      </p>
      <p class="modal__error" id="error" data-testid="delete-report-error"></p>
      <div class="modal__actions" data-testid="modal-actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--destructive" id="deleteBtn" type="button">Delete</button>
      </div>
    </div>
  </div>
`;

/** Confirms deleting a saved report by name. Confirming emits the id; the page performs the delete and closes this modal on success. */
export class PmDeleteReportModal extends HTMLElement {
  private nameEl: HTMLElement | null = null;
  private errorEl: HTMLElement | null = null;
  private deleteButton: HTMLButtonElement | null = null;
  private cancelButton: HTMLButtonElement | null = null;
  private closeButton: HTMLButtonElement | null = null;
  private _id = '';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.nameEl = this.shadowRoot!.getElementById('reportName') as HTMLElement;
    this.errorEl = this.shadowRoot!.getElementById('error') as HTMLElement;
    this.deleteButton = this.shadowRoot!.getElementById('deleteBtn') as HTMLButtonElement;
    this.cancelButton = this.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement;
    this.closeButton = this.shadowRoot!.getElementById('closeBtn') as HTMLButtonElement;

    this.cancelButton.addEventListener('click', this.handleCancel);
    this.closeButton.addEventListener('click', this.handleCancel);
    this.deleteButton.addEventListener('click', this.handleDelete);
  }

  disconnectedCallback(): void {
    this.cancelButton?.removeEventListener('click', this.handleCancel);
    this.closeButton?.removeEventListener('click', this.handleCancel);
    this.deleteButton?.removeEventListener('click', this.handleDelete);
  }

  show(id: string, name: string): void {
    this._id = id;
    this.nameEl!.textContent = name;
    this.errorEl!.textContent = '';
    this.setBusy(false);
    this.setAttribute('open', '');
  }

  close(): void {
    this.removeAttribute('open');
    this.setBusy(false);
  }

  showError(message: string): void {
    this.errorEl!.textContent = message;
  }

  setBusy(busy: boolean): void {
    setButtonsBusy(this.deleteButton!, [this.cancelButton!, this.closeButton!], busy);
  }

  private handleCancel = (): void => this.close();

  private handleDelete = (): void => {
    this.setBusy(true);
    this.dispatchEvent(
      new CustomEvent('delete-report-confirmed', {
        bubbles: true,
        composed: true,
        detail: { id: this._id },
      }),
    );
  };
}

customElements.define('pm-delete-report-modal', PmDeleteReportModal);
