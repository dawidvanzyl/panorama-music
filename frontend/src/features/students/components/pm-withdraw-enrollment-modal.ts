import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import { setButtonsBusy } from '../../../components/button-states';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    .modal__name {
      color: var(--pm-text);
      font-weight: 500;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal__header">
        <span class="modal__icon">warning</span>
        <h2 class="modal__title" id="modalTitle">Withdraw Enrollment</h2>
        <button type="button" class="modal__close" id="closeBtn" aria-label="Close">close</button>
      </div>
      <p class="modal__body">
        This action <strong>cannot be undone</strong>. <span class="modal__name" id="studentName"></span> will be withdrawn from <span class="modal__name" id="courseName"></span> permanently.
      </p>
      <p class="modal__error" id="error" data-testid="modal-error"></p>
      <div class="modal__actions" data-testid="modal-actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--destructive" id="withdrawBtn" type="button">Withdraw</button>
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
    this.shadowRoot!.getElementById('closeBtn')!.addEventListener('click', () => this.close());
    this.shadowRoot!.getElementById('withdrawBtn')!.addEventListener('click', () => this.handleWithdraw());
  }

  /** Names both the student and the course, as the copy states them as fact. */
  show(studentId: string, studentCourseId: string, studentName: string, courseName: string): void {
    this._studentId = studentId;
    this._studentCourseId = studentCourseId;
    this.shadowRoot!.getElementById('studentName')!.textContent = studentName;
    this.shadowRoot!.getElementById('courseName')!.textContent = courseName;

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
      this.shadowRoot!.getElementById('withdrawBtn') as HTMLButtonElement,
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

  private handleWithdraw(): void {
    this.setBusy(true);
    this.dispatchEvent(
      new CustomEvent('enrollment-withdraw-confirmed', {
        bubbles: true,
        composed: true,
        detail: { studentId: this._studentId, studentCourseId: this._studentCourseId },
      }),
    );
  }
}

customElements.define('pm-withdraw-enrollment-modal', PmWithdrawEnrollmentModal);
