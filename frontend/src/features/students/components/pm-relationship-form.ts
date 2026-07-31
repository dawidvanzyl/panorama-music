const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      margin-bottom: 24px;
      padding: 20px;
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      font-family: 'Inter', system-ui, sans-serif;
    }
    :host([hidden]) {
      display: none;
    }
    .relationship-form__title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--pm-text);
      margin: 0 0 16px;
    }
    .relationship-form__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      max-width: 320px;
    }
    .relationship-form__label {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text);
    }
    .relationship-form__input {
      box-sizing: border-box;
      height: 44px;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
      font-family: inherit;
    }
    .relationship-form__actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
    }
    .relationship-form__btn {
      height: 40px;
      padding: 0 20px;
      border-radius: var(--pm-radius);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
    }
    .relationship-form__btn--cancel {
      background: transparent;
      border: 1px solid var(--pm-border);
      color: var(--pm-text);
    }
    .relationship-form__btn--primary {
      border: none;
      background: var(--pm-accent);
      color: #fff;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <h2 class="relationship-form__title">Create Relationship</h2>
  <form id="form">
    <div class="relationship-form__field">
      <label class="relationship-form__label" for="name">Name</label>
      <input class="relationship-form__input" type="text" id="name" required maxlength="50" />
    </div>
    <div class="relationship-form__actions">
      <button type="button" class="relationship-form__btn relationship-form__btn--cancel" id="cancelBtn">Cancel</button>
      <button type="button" class="relationship-form__btn relationship-form__btn--primary" id="saveBtn">Save</button>
    </div>
  </form>
`;

export class PmRelationshipForm extends HTMLElement {
  private form: HTMLFormElement | null = null;
  private nameInput: HTMLInputElement | null = null;
  private cancelBtn: HTMLButtonElement | null = null;
  private saveBtn: HTMLButtonElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.form = this.shadowRoot!.getElementById('form') as HTMLFormElement;
    this.nameInput = this.shadowRoot!.getElementById('name') as HTMLInputElement;
    this.cancelBtn = this.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement;
    this.saveBtn = this.shadowRoot!.getElementById('saveBtn') as HTMLButtonElement;

    this.cancelBtn.addEventListener('click', this.handleCancel);
    this.saveBtn.addEventListener('click', this.handleSave);
  }

  disconnectedCallback(): void {
    this.cancelBtn?.removeEventListener('click', this.handleCancel);
    this.saveBtn?.removeEventListener('click', this.handleSave);
  }

  reset(): void {
    this.form?.reset();
  }

  private handleSave = (): void => {
    if (!this.form!.reportValidity()) return;

    this.dispatchEvent(
      new CustomEvent('relationship-form-submitted', {
        bubbles: true,
        composed: true,
        detail: { name: this.nameInput!.value.trim() },
      }),
    );
  };

  private handleCancel = (): void => {
    this.dispatchEvent(new CustomEvent('relationship-form-cancelled', { bubbles: true, composed: true }));
  };
}

customElements.define('pm-relationship-form', PmRelationshipForm);
