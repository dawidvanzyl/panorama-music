import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import { canSaveName } from '../state/report-builder-state';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    /* The shared chrome's backdrop is position: fixed, which drops out of
       normal flow and leaves this host with no box of its own to size
       against — sizing the host to the viewport itself keeps it a genuine,
       measurable element while open. */
    :host([open]) {
      position: fixed;
      inset: 0;
    }
    .modal__card {
      max-width: 440px;
    }
    .modal__icon,
    .modal__title {
      color: var(--pm-accent);
    }
    .modal__label {
      display: block;
      font-size: 13px;
      font-weight: 600;
      color: var(--pm-text);
      margin-bottom: 6px;
    }
    .modal__input {
      width: 100%;
      height: 38px;
      padding: 0 12px;
      border-radius: var(--pm-radius);
      border: 1px solid var(--pm-border);
      background: var(--pm-surface-2);
      color: var(--pm-text);
      font-size: 13px;
      font-family: inherit;
      box-sizing: border-box;
    }
    .modal__btn--save {
      background: var(--pm-accent);
      border: 1px solid var(--pm-accent);
      color: #fff;
    }
    .modal__btn--save:hover:not(:disabled) {
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
        <span class="modal__icon">save</span>
        <h2 class="modal__title" data-testid="save-report-title">Save report</h2>
      </div>
      <div class="modal__body">
        <p data-testid="save-report-text">Save this report to access it from the Reports list.</p>
        <label class="modal__label" for="nameInput">Report name</label>
        <input class="modal__input" id="nameInput" type="text" maxlength="100" placeholder="e.g. Grade 4 Contacts" />
        <p class="modal__error" id="error" data-testid="save-report-error"></p>
      </div>
      <div class="modal__actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--save" id="saveBtn" type="button">Save report</button>
      </div>
    </div>
  </div>
`;

/** Collects a name for a report the builder or the results screen has not yet saved. Confirming emits the name; the page saves it. */
export class PmSaveReportModal extends HTMLElement {
  private nameInput: HTMLInputElement | null = null;
  private errorEl: HTMLElement | null = null;
  private saveButton: HTMLButtonElement | null = null;
  private cancelButton: HTMLButtonElement | null = null;
  private _busy = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.nameInput = this.shadowRoot!.getElementById('nameInput') as HTMLInputElement;
    this.errorEl = this.shadowRoot!.getElementById('error') as HTMLElement;
    this.saveButton = this.shadowRoot!.getElementById('saveBtn') as HTMLButtonElement;
    this.cancelButton = this.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement;

    this.nameInput.addEventListener('input', this.handleInput);
    this.cancelButton.addEventListener('click', this.handleCancel);
    this.saveButton.addEventListener('click', this.handleSave);
  }

  disconnectedCallback(): void {
    this.nameInput?.removeEventListener('input', this.handleInput);
    this.cancelButton?.removeEventListener('click', this.handleCancel);
    this.saveButton?.removeEventListener('click', this.handleSave);
  }

  show(initialName = ''): void {
    this.nameInput!.value = initialName;
    this.errorEl!.textContent = '';
    this._busy = false;
    this.updateSaveButton();
    this.setAttribute('open', '');
  }

  close(): void {
    this.removeAttribute('open');
  }

  showError(message: string): void {
    this.errorEl!.textContent = message;
  }

  setBusy(busy: boolean): void {
    this._busy = busy;
    this.nameInput!.disabled = busy;
    this.cancelButton!.disabled = busy;
    this.updateSaveButton();
  }

  private updateSaveButton(): void {
    this.saveButton!.disabled = this._busy || !canSaveName(this.nameInput!.value);
  }

  private handleInput = (): void => this.updateSaveButton();

  private handleCancel = (): void => this.close();

  private handleSave = (): void => {
    if (!canSaveName(this.nameInput!.value)) return;

    this.dispatchEvent(
      new CustomEvent('save-report-confirmed', {
        bubbles: true,
        composed: true,
        detail: { name: this.nameInput!.value.trim() },
      }),
    );
  };
}

customElements.define('pm-save-report-modal', PmSaveReportModal);
