import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import { setButtonsBusy } from '../../../components/button-states';

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal__header">
        <span class="modal__icon modal__icon--reversible" aria-hidden="true">info</span>
        <h2 class="modal__title" id="modalTitle">Unlink Activity</h2>
        <button type="button" class="modal__close" id="closeBtn" aria-label="Close">close</button>
      </div>
      <p class="modal__body">
        The activity <strong id="activityName"></strong> will be unlinked from the student <strong id="studentName"></strong>. The student no longer takes part in this activity. The activity record stays. You can link the activity again later.
      </p>
      <p class="modal__error" id="error" data-testid="modal-error"></p>
      <div class="modal__actions" data-testid="modal-actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--primary" id="unlinkBtn" type="button">Unlink</button>
      </div>
    </div>
  </div>
`;

/** Confirms unlinking an activity from a student before anything is sent. */
export class PmUnlinkActivityModal extends HTMLElement {
  private studentId = '';
  private extraCurricularId = '';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('closeBtn')!.addEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('unlinkBtn')!.addEventListener('click', this.handleUnlink);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')?.removeEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('closeBtn')?.removeEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('unlinkBtn')?.removeEventListener('click', this.handleUnlink);
  }

  show(studentId: string, extraCurricularId: string, activityName: string, studentName: string): void {
    this.studentId = studentId;
    this.extraCurricularId = extraCurricularId;
    this.shadowRoot!.getElementById('activityName')!.textContent = activityName;
    this.shadowRoot!.getElementById('studentName')!.textContent = studentName;
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
      this.shadowRoot!.getElementById('unlinkBtn') as HTMLButtonElement,
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

  private handleUnlink = (): void => {
    this.setBusy(true);
    this.dispatchEvent(
      new CustomEvent('extra-curricular-remove-requested', {
        bubbles: true,
        composed: true,
        detail: { studentId: this.studentId, extraCurricularId: this.extraCurricularId },
      }),
    );
  };
}

customElements.define('pm-unlink-activity-modal', PmUnlinkActivityModal);
