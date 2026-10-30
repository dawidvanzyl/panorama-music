import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import { setButtonsBusy } from '../../../components/button-states';

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal__header">
        <span class="modal__icon" aria-hidden="true">delete_forever</span>
        <h2 class="modal__title" id="modalTitle">Remove Practice Time from Activity</h2>
        <button type="button" class="modal__close" id="closeBtn" aria-label="Close">close</button>
      </div>
      <p class="modal__body">
        This action <strong>cannot be undone</strong>. The practice time <strong id="practiceTime"></strong> will be removed from the activity <strong id="activityName"></strong>.
      </p>
      <p class="modal__error" id="error" data-testid="modal-error"></p>
      <div class="modal__actions" data-testid="modal-actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--destructive" id="removeBtn" type="button">Remove</button>
      </div>
    </div>
  </div>
`;

/** Confirms removing one practice time from an activity before anything is sent. */
export class PmRemovePracticeTimeModal extends HTMLElement {
  private extraCurricularId = '';
  private practiceTimeId = '';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('closeBtn')!.addEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('removeBtn')!.addEventListener('click', this.handleRemove);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.getElementById('cancelBtn')?.removeEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('closeBtn')?.removeEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('removeBtn')?.removeEventListener('click', this.handleRemove);
  }

  show(extraCurricularId: string, practiceTimeId: string, practiceTimeLabel: string, activityName: string): void {
    this.extraCurricularId = extraCurricularId;
    this.practiceTimeId = practiceTimeId;
    this.shadowRoot!.getElementById('practiceTime')!.textContent = practiceTimeLabel;
    this.shadowRoot!.getElementById('activityName')!.textContent = activityName;
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
      this.shadowRoot!.getElementById('removeBtn') as HTMLButtonElement,
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

  private handleRemove = (): void => {
    this.setBusy(true);
    this.dispatchEvent(
      new CustomEvent('extra-curricular-practice-time-remove-requested', {
        bubbles: true,
        composed: true,
        detail: { extraCurricularId: this.extraCurricularId, practiceTimeId: this.practiceTimeId },
      }),
    );
  };
}

customElements.define('pm-remove-practice-time-modal', PmRemovePracticeTimeModal);
