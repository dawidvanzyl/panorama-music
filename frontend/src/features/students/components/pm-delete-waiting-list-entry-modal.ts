import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import { setButtonsBusy } from '../../../components/button-states';

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal__header">
        <span class="modal__icon" aria-hidden="true">delete_forever</span>
        <h2 class="modal__title" id="modalTitle">Remove Student from Waiting List</h2>
        <button type="button" class="modal__close" id="closeBtn" aria-label="Close">close</button>
      </div>
      <p class="modal__body">
        This action <strong>cannot be undone</strong>. The student <strong id="modalName"></strong> will be removed from the waiting list. The student record will also be permanently removed.
      </p>
      <p class="modal__error" id="error" data-testid="modal-error"></p>
      <div class="modal__actions" data-testid="modal-actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--destructive" id="deleteBtn" type="button">Remove</button>
      </div>
    </div>
  </div>
`;

/**
 * The waiting list's own removal confirmation. It reads differently from the
 * Students screen's delete because the consequence is different: a
 * waiting-list student was never enrolled, so removing them from the queue
 * discards their record entirely rather than ending an enrolment.
 */
export class PmDeleteWaitingListEntryModal extends HTMLElement {
  private _studentId: string = '';
  private _name: string = '';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', () => this.close());
    this.shadowRoot!.getElementById('closeBtn')!.addEventListener('click', () => this.close());
    this.shadowRoot!.getElementById('deleteBtn')!.addEventListener('click', () => this.handleDelete());
  }

  show(studentId: string, name: string): void {
    this._studentId = studentId;
    this._name = name;
    this.shadowRoot!.getElementById('modalName')!.textContent = name;
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

  private handleDelete(): void {
    this.setBusy(true);
    this.dispatchEvent(
      new CustomEvent('waiting-list-student-remove-confirmed', {
        bubbles: true,
        composed: true,
        detail: { studentId: this._studentId, name: this._name },
      }),
    );
  }
}

customElements.define('pm-delete-waiting-list-entry-modal', PmDeleteWaitingListEntryModal);
