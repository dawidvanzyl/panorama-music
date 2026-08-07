import './pm-account-link-picker';
import type { LinkableAccount, TeacherInput } from '../services/teachers';
import type { PmAccountLinkPicker } from './pm-account-link-picker';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
    }
    :host([hidden]) {
      display: none;
    }
    .create-section__card {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 24px;
      margin-top: 24px;
      /* Matches the filter bar's 24px gap to the table below it, so the
         expanded create section sits evenly between header and filter bar. */
      margin-bottom: 24px;
    }
    .create-section__title {
      margin: 0 0 16px;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--pm-text);
    }
    .create-section__grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 16px;
    }
    .create-section__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .create-section__field--full {
      grid-column: 1 / -1;
    }
    label {
      font-size: 13px;
      font-weight: 600;
      color: var(--pm-text);
    }
    input[type='text'] {
      height: 38px;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
    }
    .create-section__error {
      font-size: 12px;
      color: var(--pm-danger, #e05252);
    }
    /* Collapse while empty so the classification box, which has no error line
       of its own, still bottom-aligns with the two inputs beside it. */
    .create-section__error:empty {
      display: none;
    }
    /* Heads the classification column the way the labels head the two input
       columns beside it. */
    .create-section__heading {
      font-size: 13px;
      font-weight: 600;
      color: var(--pm-text);
    }
    .create-section__classification {
      display: flex;
      flex-direction: column;
      gap: 6px;
      align-self: end;
    }
    .create-section__toggle-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      /* Same content height and border as the inputs beside it, so the three
         columns bottom-align exactly. */
      height: 38px;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
    }
    .create-section__toggle-text {
      display: flex;
      align-items: center;
      gap: 6px;
      min-width: 0;
    }
    .create-section__toggle-help {
      font-size: 13px;
      color: var(--pm-text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    /* Sliding switch: the native checkbox stays in the DOM (and keeps its
       label association and keyboard behaviour) but is laid over the track at
       zero opacity, so the track/thumb below are the visible control. */
    .toggle {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }
    .toggle__input {
      position: absolute;
      top: 0;
      left: 0;
      width: 44px;
      height: 24px;
      margin: 0;
      opacity: 0;
      cursor: pointer;
    }
    .toggle__track {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      width: 44px;
      height: 24px;
      padding: 2px;
      box-sizing: border-box;
      border-radius: 9999px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      transition: background 0.15s ease-in-out;
    }
    .toggle__thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
      transition: transform 0.15s ease-in-out;
    }
    .toggle__input:checked ~ .toggle__track {
      background: var(--pm-accent);
      border-color: var(--pm-accent);
    }
    .toggle__input:checked ~ .toggle__track .toggle__thumb {
      transform: translateX(20px);
    }
    .toggle__input:focus-visible ~ .toggle__track {
      outline: 2px solid var(--pm-accent);
      outline-offset: 2px;
    }
    .create-section__actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
    }
    button {
      border-radius: var(--pm-radius);
      font-size: 14px;
      font-weight: 600;
      padding: 8px 20px;
      cursor: pointer;
    }
    .create-section__save {
      border: none;
      background: var(--pm-accent);
      color: #fff;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="create-section__card">
    <h2 class="create-section__title">Create Teacher</h2>
    <div class="create-section__grid">
      <div class="create-section__field">
        <label for="firstName">First name</label>
        <input type="text" id="firstName" />
        <span class="create-section__error" id="firstNameError"></span>
      </div>
      <div class="create-section__field">
        <label for="surname">Surname</label>
        <input type="text" id="surname" />
        <span class="create-section__error" id="surnameError"></span>
      </div>
      <div class="create-section__classification">
        <span class="create-section__heading">Employment classification</span>
        <div class="create-section__toggle-row">
          <div class="create-section__toggle-text">
            <label for="private">Private teacher</label>
            <span aria-hidden="true">-</span>
            <span class="create-section__toggle-help" id="toggleHelp">Paid by the school.</span>
          </div>
          <label class="toggle" for="private">
            <input type="checkbox" id="private" class="toggle__input" />
            <span class="toggle__track"><span class="toggle__thumb"></span></span>
          </label>
        </div>
      </div>
      <pm-account-link-picker class="create-section__field--full" id="accountPicker"></pm-account-link-picker>
    </div>
    <div class="create-section__error" id="formError"></div>
    <div class="create-section__actions">
      <button type="button" class="create-section__save" id="saveBtn">Create Teacher</button>
    </div>
  </div>
`;

export class PmTeacherCreateSection extends HTMLElement {
  private firstNameInput: HTMLInputElement | null = null;
  private surnameInput: HTMLInputElement | null = null;
  private privateCheckbox: HTMLInputElement | null = null;
  private accountPicker: PmAccountLinkPicker | null = null;
  private _linkableAccounts: LinkableAccount[] = [];
  private toggleHelp: HTMLElement | null = null;
  private firstNameError: HTMLElement | null = null;
  private surnameError: HTMLElement | null = null;
  private formError: HTMLElement | null = null;
  private saveBtn: HTMLButtonElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.firstNameInput = this.shadowRoot!.getElementById('firstName') as HTMLInputElement;
    this.surnameInput = this.shadowRoot!.getElementById('surname') as HTMLInputElement;
    this.privateCheckbox = this.shadowRoot!.getElementById('private') as HTMLInputElement;
    this.accountPicker = this.shadowRoot!.getElementById('accountPicker') as unknown as PmAccountLinkPicker;
    this.accountPicker.accounts = this._linkableAccounts;
    this.toggleHelp = this.shadowRoot!.getElementById('toggleHelp') as HTMLElement;
    this.firstNameError = this.shadowRoot!.getElementById('firstNameError') as HTMLElement;
    this.surnameError = this.shadowRoot!.getElementById('surnameError') as HTMLElement;
    this.formError = this.shadowRoot!.getElementById('formError') as HTMLElement;
    this.saveBtn = this.shadowRoot!.getElementById('saveBtn') as HTMLButtonElement;

    this.privateCheckbox.addEventListener('change', this.updateToggleHelp);
    this.saveBtn.addEventListener('click', this.handleSave);
  }

  disconnectedCallback(): void {
    this.privateCheckbox?.removeEventListener('change', this.updateToggleHelp);
    this.saveBtn?.removeEventListener('click', this.handleSave);
  }

  /** The eligible accounts to offer; the page owns fetching them. */
  set linkableAccounts(value: LinkableAccount[]) {
    this._linkableAccounts = value;
    if (this.accountPicker) this.accountPicker.accounts = value;
  }

  get linkableAccounts(): LinkableAccount[] {
    return this._linkableAccounts;
  }

  /**
   * Returns the form to its empty state. The section is always on screen, so
   * this runs after a successful create to ready it for the next teacher.
   */
  reset(): void {
    this.firstNameInput!.value = '';
    this.surnameInput!.value = '';
    this.privateCheckbox!.checked = false;
    this.accountPicker!.reset();
    this.updateToggleHelp();
    this.clearErrors();
  }

  showError(message: string): void {
    this.formError!.textContent = message;
  }

  private updateToggleHelp = (): void => {
    this.toggleHelp!.textContent = this.privateCheckbox!.checked ? 'Paid directly by parents.' : 'Paid by the school.';
  };

  private clearErrors(): void {
    this.firstNameError!.textContent = '';
    this.surnameError!.textContent = '';
    this.formError!.textContent = '';
  }

  private handleSave = (): void => {
    this.clearErrors();

    const firstName = this.firstNameInput!.value.trim();
    const surname = this.surnameInput!.value.trim();
    let valid = true;

    if (!firstName) {
      this.firstNameError!.textContent = 'First name is required';
      valid = false;
    }
    if (!surname) {
      this.surnameError!.textContent = 'Surname is required';
      valid = false;
    }
    if (!valid) return;

    const input: TeacherInput = {
      firstName,
      surname,
      isPrivate: this.privateCheckbox!.checked,
      linkedAccountId: this.accountPicker!.selectedAccountId,
    };

    this.dispatchEvent(
      new CustomEvent<{ input: TeacherInput }>('teacher-create-requested', {
        bubbles: true,
        composed: true,
        detail: { input },
      }),
    );
  };
}

customElements.define('pm-teacher-create-section', PmTeacherCreateSection);
