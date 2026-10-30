import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import { setButtonsBusy } from '../../../components/button-states';

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal__header">
        <span class="modal__icon" aria-hidden="true">delete_forever</span>
        <h2 class="modal__title" id="modalTitle">Delete Activity</h2>
        <button type="button" class="modal__close" id="closeBtn" aria-label="Close">close</button>
      </div>
      <p class="modal__body">
        This action <strong>cannot be undone</strong>. The activity <strong id="modalName"></strong> will be permanently removed. Its <span id="modalCount"></span> <span id="modalCountNoun"></span> will also be permanently removed.
      </p>
      <p class="modal__error" id="error" data-testid="modal-error"></p>
      <div class="modal__actions" data-testid="modal-actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--destructive" id="deleteBtn" type="button">Delete</button>
      </div>
    </div>
  </div>
`;

export class PmDeleteExtraCurricularModal extends HTMLElement {
  private _extraCurricularId: string = '';

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

  /**
   * `description` names the activity; `practiceTimeCount` is how many slots go
   * with it, which is the part of the deletion a person cannot see from the row
   * alone once the confirmation covers the table.
   */
  show(extraCurricularId: string, description: string, practiceTimeCount: number): void {
    this._extraCurricularId = extraCurricularId;
    this.shadowRoot!.getElementById('modalName')!.textContent = description;
    this.shadowRoot!.getElementById('modalCount')!.textContent = String(practiceTimeCount);
    this.shadowRoot!.getElementById('modalCountNoun')!.textContent =
      practiceTimeCount === 1 ? 'practice time' : 'practice times';
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
      new CustomEvent('extra-curricular-delete-confirmed', {
        bubbles: true,
        composed: true,
        detail: { extraCurricularId: this._extraCurricularId },
      }),
    );
  }
}

customElements.define('pm-delete-extra-curricular-modal', PmDeleteExtraCurricularModal);
