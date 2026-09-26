import { modalChromeStyles } from '../../../components/modal-chrome-styles';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host([open]) {
      position: fixed;
      inset: 0;
    }
    .modal__card {
      max-width: 440px;
      padding: 32px;
      border-radius: 12px;
    }
    .modal__header {
      gap: 14px;
    }
    .modal__icon-circle {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: color-mix(in srgb, var(--pm-danger, #e05252) 15%, transparent);
      flex-shrink: 0;
    }
    .modal__icon {
      color: var(--pm-danger, #e05252);
    }
    .modal__title {
      color: var(--pm-text);
    }
    .modal__body {
      color: var(--pm-text);
    }
    .modal__btn--cancel {
      color: var(--pm-text);
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
        <span class="modal__icon-circle"><span class="modal__icon">warning</span></span>
        <h2 class="modal__title" data-testid="delete-report-title">Delete report</h2>
      </div>
      <div class="modal__body">
        <p data-testid="delete-report-text">
          Are you sure you want to delete the report <strong id="reportName" data-testid="delete-report-name"></strong>? This cannot be undone.
        </p>
        <p class="modal__error" id="error" data-testid="delete-report-error"></p>
      </div>
      <div class="modal__actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--delete" id="deleteBtn" type="button">Delete</button>
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

    this.cancelButton.addEventListener('click', this.handleCancel);
    this.deleteButton.addEventListener('click', this.handleDelete);
  }

  disconnectedCallback(): void {
    this.cancelButton?.removeEventListener('click', this.handleCancel);
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
  }

  showError(message: string): void {
    this.errorEl!.textContent = message;
  }

  setBusy(busy: boolean): void {
    this.deleteButton!.disabled = busy;
    this.cancelButton!.disabled = busy;
  }

  private handleCancel = (): void => this.close();

  private handleDelete = (): void => {
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
