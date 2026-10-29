import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import { setButtonsBusy } from '../../../components/button-states';

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal__header">
        <span class="modal__icon" aria-hidden="true">delete_forever</span>
        <h2 class="modal__title" id="modalTitle">Deactivate Teacher</h2>
        <button type="button" class="modal__close" id="closeBtn" aria-label="Close">close</button>
      </div>
      <p class="modal__body">
        This action <strong>cannot be undone</strong>. The teacher <strong id="modalName"></strong> will be deactivated
        and removed from active selection lists. Their banking details will be permanently removed. The teacher record
        and its history are kept.
      </p>
      <p class="modal__error" id="error" data-testid="modal-error"></p>
      <div class="modal__actions" data-testid="modal-actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--destructive" id="deactivateBtn" type="button">Deactivate</button>
      </div>
    </div>
  </div>
`;

/**
 * Confirms taking a teacher out of active service. The warning about the
 * banking details is the point of the step: they are deleted with the same
 * click and are not recoverable afterwards.
 */
export class PmTeacherDeactivateModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('closeBtn')!.addEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('deactivateBtn')!.addEventListener('click', this.handleDeactivate);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')?.removeEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('closeBtn')?.removeEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('deactivateBtn')?.removeEventListener('click', this.handleDeactivate);
  }

  show(teacherName: string): void {
    this.shadowRoot!.getElementById('modalName')!.textContent = teacherName;
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

  private handleCancel = (): void => this.close();

  private handleDeactivate = (): void => {
    this.setBusy(true);
    this.dispatchEvent(
      new CustomEvent('teacher-deactivate-confirmed', {
        bubbles: true,
        composed: true,
      }),
    );
  };
}

customElements.define('pm-teacher-deactivate-modal', PmTeacherDeactivateModal);
