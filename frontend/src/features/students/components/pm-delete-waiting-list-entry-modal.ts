import { modalChromeStyles } from '../../../components/modal-chrome-styles';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    .modal__name {
      color: var(--pm-text, #e2e1ed);
      font-weight: 500;
    }
    .modal__btn--delete {
      background: var(--pm-danger, #e05252);
      border: 1px solid var(--pm-danger, #e05252);
      color: #fff;
    }
    .modal__btn--delete:hover:not(:disabled) {
      opacity: 0.9;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card">
      <div class="modal__header">
        <span class="modal__icon">warning</span>
        <h2 class="modal__title">Remove from Waiting List</h2>
      </div>
      <p class="modal__body">
        Are you sure you want to remove <span class="modal__name" id="modalName"></span> from the waiting list? This will delete their student record and <strong>cannot be undone</strong>.
      </p>
      <div class="modal__actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--delete" id="deleteBtn" type="button">Delete</button>
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
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', () => this.close());
    this.shadowRoot!.getElementById('deleteBtn')!.addEventListener('click', () => this.handleDelete());
  }

  show(studentId: string, name: string): void {
    this._studentId = studentId;
    this._name = name;
    this.shadowRoot!.getElementById('modalName')!.textContent = name;
    this.setAttribute('open', '');
  }

  private close(): void {
    this.removeAttribute('open');
  }

  private handleDelete(): void {
    this.dispatchEvent(
      new CustomEvent('waiting-list-student-remove-confirmed', {
        bubbles: true,
        composed: true,
        detail: { studentId: this._studentId, name: this._name },
      }),
    );
    this.close();
  }
}

customElements.define('pm-delete-waiting-list-entry-modal', PmDeleteWaitingListEntryModal);
