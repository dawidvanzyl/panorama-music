import { modalChromeStyles } from '../../../components/modal-chrome-styles';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    .modal__name {
      color: var(--pm-text, #e2e1ed);
      font-weight: 500;
    }
    .modal__btn--withdraw {
      background: var(--pm-danger, #e05252);
      border: 1px solid var(--pm-danger, #e05252);
      color: #fff;
    }
    .modal__btn--withdraw:hover:not(:disabled) {
      opacity: 0.9;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card">
      <div class="modal__header">
        <span class="modal__icon">warning</span>
        <h2 class="modal__title">Withdraw Enrollment</h2>
      </div>
      <p class="modal__body">
        This action <strong>cannot be undone</strong>. <span class="modal__name" id="studentName"></span> will be withdrawn from <span class="modal__name" id="courseName"></span> permanently.
      </p>
      <div class="modal__actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--withdraw" id="withdrawBtn" type="button">Withdraw</button>
      </div>
    </div>
  </div>
`;

export class PmWithdrawEnrollmentModal extends HTMLElement {
  private _studentId = '';
  private _studentCourseId = '';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', () => this.close());
    this.shadowRoot!.getElementById('withdrawBtn')!.addEventListener('click', () => this.handleWithdraw());
  }

  /** Names both the student and the course, as the copy states them as fact. */
  show(studentId: string, studentCourseId: string, studentName: string, courseName: string): void {
    this._studentId = studentId;
    this._studentCourseId = studentCourseId;
    this.shadowRoot!.getElementById('studentName')!.textContent = studentName;
    this.shadowRoot!.getElementById('courseName')!.textContent = courseName;

    this.setAttribute('open', '');
  }

  private close(): void {
    this.removeAttribute('open');
  }

  private handleWithdraw(): void {
    this.dispatchEvent(
      new CustomEvent('enrollment-withdraw-confirmed', {
        bubbles: true,
        composed: true,
        detail: { studentId: this._studentId, studentCourseId: this._studentCourseId },
      }),
    );
    this.close();
  }
}

customElements.define('pm-withdraw-enrollment-modal', PmWithdrawEnrollmentModal);
