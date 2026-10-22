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
    <div class="modal__card">
      <div class="modal__header">
        <span class="modal__icon">delete_forever</span>
        <h2 class="modal__title">Delete Relationship</h2>
      </div>
      <p class="modal__body">
        This action cannot be undone. The relationship type <span class="modal__name" id="modalName"></span> will be permanently removed.
      </p>
      <p class="modal__error" id="error" data-testid="modal-error"></p>
      <div class="modal__actions" data-testid="modal-actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--destructive" id="deleteBtn" type="button">Delete</button>
      </div>
    </div>
  </div>
`;

export class PmDeleteRelationshipModal extends HTMLElement {
  private _guardianRelationshipId: string = '';

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

  show(guardianRelationshipId: string, name: string): void {
    this._guardianRelationshipId = guardianRelationshipId;
    this.shadowRoot!.getElementById('modalName')!.textContent = name;
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
      this.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement,
      busy,
    );
  }

  showError(message: string): void {
    this.shadowRoot!.getElementById('error')!.textContent = message;
  }

  private handleDelete(): void {
    this.setBusy(true);
    this.dispatchEvent(
      new CustomEvent('relationship-delete-confirmed', {
        bubbles: true,
        composed: true,
        detail: { guardianRelationshipId: this._guardianRelationshipId },
      }),
    );
  }
}

customElements.define('pm-delete-relationship-modal', PmDeleteRelationshipModal);
