import { setButtonsBusy } from '../../../components/button-states';
import { formButtonStyles } from '../../../components/form-button-styles';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      margin-bottom: 24px;
      padding: 24px;
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      font-family: 'Inter', system-ui, sans-serif;
    }
    .relationship-form__row {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      align-items: flex-end;
    }
    .relationship-form__field {
      flex: 1;
      min-width: 200px;
    }
    .relationship-form__label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text);
      margin-bottom: 6px;
    }
    .relationship-form__input {
      box-sizing: border-box;
      width: 100%;
      height: 44px;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
      font-family: inherit;
      outline: none;
    }
    .relationship-form__input:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px var(--pm-accent);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <form id="form">
    <div class="relationship-form__row">
      <div class="relationship-form__field">
        <label class="relationship-form__label" for="name">Name</label>
        <input class="relationship-form__input" type="text" id="name" required maxlength="50" />
      </div>
      <button type="button" class="form-btn form-btn--primary" id="saveBtn">Create Relationship</button>
    </div>
  </form>
`;

export class PmRelationshipForm extends HTMLElement {
  private form: HTMLFormElement | null = null;
  private nameInput: HTMLInputElement | null = null;
  private saveBtn: HTMLButtonElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [formButtonStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.form = this.shadowRoot!.getElementById('form') as HTMLFormElement;
    this.nameInput = this.shadowRoot!.getElementById('name') as HTMLInputElement;
    this.saveBtn = this.shadowRoot!.getElementById('saveBtn') as HTMLButtonElement;

    this.saveBtn.addEventListener('click', this.handleSave);
  }

  disconnectedCallback(): void {
    this.saveBtn?.removeEventListener('click', this.handleSave);
  }

  reset(): void {
    this.form?.reset();
    if (this.saveBtn) this.setBusy(false);
  }

  setBusy(busy: boolean): void {
    setButtonsBusy(this.saveBtn!, null, busy);
  }

  private handleSave = (): void => {
    if (!this.form!.reportValidity()) return;

    this.setBusy(true);

    this.dispatchEvent(
      new CustomEvent('relationship-form-submitted', {
        bubbles: true,
        composed: true,
        detail: { name: this.nameInput!.value.trim() },
      }),
    );
  };
}

customElements.define('pm-relationship-form', PmRelationshipForm);
