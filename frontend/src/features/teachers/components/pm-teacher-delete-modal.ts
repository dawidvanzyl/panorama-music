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
        <span class="modal__icon">delete</span>
        <h2 class="modal__title">Delete Teacher</h2>
      </div>
      <p class="modal__body">
        This action <strong>cannot be undone</strong>. All data for <span class="modal__name" id="modalName"></span> will be permanently removed.
      </p>
      <div class="modal__actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--delete" id="deleteBtn" type="button">Delete</button>
      </div>
    </div>
  </div>
`;

/** Confirms the permanent removal of a teacher record. */
export class PmTeacherDeleteModal extends HTMLElement {
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

  show(teacherName: string): void {
    this.shadowRoot!.getElementById('modalName')!.textContent = teacherName;
    this.setAttribute('open', '');
  }

  close(): void {
    this.removeAttribute('open');
  }

  private handleCancel = (): void => this.close();

  private handleDelete = (): void => {
    this.dispatchEvent(
      new CustomEvent('teacher-delete-confirmed', {
        bubbles: true,
        composed: true,
      }),
    );
    this.close();
  };
}

customElements.define('pm-teacher-delete-modal', PmTeacherDeleteModal);
