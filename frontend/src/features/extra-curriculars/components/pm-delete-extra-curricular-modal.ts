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
        <span class="modal__icon">delete_forever</span>
        <h2 class="modal__title">Delete Activity</h2>
      </div>
      <p class="modal__body">
        This action cannot be undone. The activity <span class="modal__name" id="modalName"></span> and its <span id="modalCount"></span> practice time(s) will be permanently removed.
      </p>
      <div class="modal__actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--delete" id="deleteBtn" type="button">Delete</button>
      </div>
    </div>
  </div>
`;

export class PmDeleteExtraCurricularModal extends HTMLElement {
  private _extraCurricularId: string = '';

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

  /**
   * `description` names the activity; `practiceTimeCount` is how many slots go
   * with it, which is the part of the deletion a person cannot see from the row
   * alone once the confirmation covers the table.
   */
  show(extraCurricularId: string, description: string, practiceTimeCount: number): void {
    this._extraCurricularId = extraCurricularId;
    this.shadowRoot!.getElementById('modalName')!.textContent = description;
    this.shadowRoot!.getElementById('modalCount')!.textContent = String(practiceTimeCount);
    this.setAttribute('open', '');
  }

  private close(): void {
    this.removeAttribute('open');
  }

  private handleDelete(): void {
    this.dispatchEvent(
      new CustomEvent('extra-curricular-delete-confirmed', {
        bubbles: true,
        composed: true,
        detail: { extraCurricularId: this._extraCurricularId },
      }),
    );
    this.close();
  }
}

customElements.define('pm-delete-extra-curricular-modal', PmDeleteExtraCurricularModal);
