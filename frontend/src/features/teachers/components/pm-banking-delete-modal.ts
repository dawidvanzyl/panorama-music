import { modalChromeStyles } from '../../../components/modal-chrome-styles';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    .modal__last4 {
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
        <span class="modal__icon">delete</span>
        <h2 class="modal__title">Delete these banking details?</h2>
      </div>
      <p class="modal__body">
        This action <strong>cannot be undone</strong>. The banking details ending <span class="modal__last4" id="modalLast4"></span> will be permanently removed.
      </p>
      <div class="modal__actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--delete" id="deleteBtn" type="button">Delete</button>
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
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('deleteBtn')!.addEventListener('click', this.handleDelete);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')?.removeEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('deleteBtn')?.removeEventListener('click', this.handleDelete);
  }

  show(accountNumberLast4: string): void {
    this.shadowRoot!.getElementById('modalLast4')!.textContent = accountNumberLast4;
    this.setAttribute('open', '');
  }

  close(): void {
    this.removeAttribute('open');
  }

  private handleCancel = (): void => this.close();

  private handleDelete = (): void => {
    this.dispatchEvent(
      new CustomEvent('teacher-banking-delete-confirmed', {
        bubbles: true,
        composed: true,
      }),
    );
    this.close();
  };
}

customElements.define('pm-banking-delete-modal', PmBankingDeleteModal);
