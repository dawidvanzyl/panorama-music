import { modalChromeStyles } from '../../../components/modal-chrome-styles';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    .modal__name {
      color: var(--pm-text, #e2e1ed);
      font-weight: 500;
    }
    .modal__btn--deactivate {
      background: var(--pm-danger, #e05252);
      border: 1px solid var(--pm-danger, #e05252);
      color: #fff;
    }
    .modal__btn--deactivate:hover:not(:disabled) {
      opacity: 0.9;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card">
      <div class="modal__header">
        <span class="modal__icon">warning</span>
        <h2 class="modal__title">Deactivate Teacher</h2>
      </div>
      <p class="modal__body">
        Are you sure you want to deactivate <span class="modal__name" id="modalName"></span>?<br /><br /> They will be removed from
        active selection lists and their banking details will be permanently deleted in the same operation. The teacher
        record and its history are preserved.
      </p>
      <div class="modal__actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--deactivate" id="deactivateBtn" type="button">Deactivate</button>
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
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('deactivateBtn')!.addEventListener('click', this.handleDeactivate);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')?.removeEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('deactivateBtn')?.removeEventListener('click', this.handleDeactivate);
  }

  show(teacherName: string): void {
    this.shadowRoot!.getElementById('modalName')!.textContent = teacherName;
    this.setAttribute('open', '');
  }

  close(): void {
    this.removeAttribute('open');
  }

  private handleCancel = (): void => this.close();

  private handleDeactivate = (): void => {
    this.dispatchEvent(
      new CustomEvent('teacher-deactivate-confirmed', {
        bubbles: true,
        composed: true,
      }),
    );
    this.close();
  };
}

customElements.define('pm-teacher-deactivate-modal', PmTeacherDeactivateModal);
