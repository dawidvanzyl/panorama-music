import { setButtonsBusy } from '../../../components/button-states';
import { formButtonStyles } from '../../../components/form-button-styles';
import type { TeacherProfileInput, TeacherResult } from '../services/teachers';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .profile-form__grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .profile-form__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
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
    .profile-form__error {
      font-size: 12px;
      color: var(--pm-danger);
    }
    /* Collapse while empty so the inputs sit directly above the actions —
       reserving a blank error line would open a gap the design does not have. */
    .profile-form__error:empty {
      display: none;
    }
    .form-actions {
      /* The error line above collapses when empty, so without this the buttons
         sit flush against the inputs. */
      margin-top: 24px;
    }
  `);

// Names only — the employment classification is maintained outside this
// edit/cancel/save flow and persists immediately on its own endpoint.
const template = document.createElement('template');
template.innerHTML = `

  <div class="profile-form__grid">
    <div class="profile-form__field">
      <label for="firstName">First name</label>
      <input type="text" id="firstName" />
      <span class="profile-form__error" id="firstNameError"></span>
    </div>
    <div class="profile-form__field">
      <label for="surname">Surname</label>
      <input type="text" id="surname" />
      <span class="profile-form__error" id="surnameError"></span>
    </div>
  </div>
  <div class="profile-form__error" id="formError"></div>
  <div class="form-actions" data-testid="form-actions">
    <button type="button" class="form-btn form-btn--secondary form-btn--warning" id="cancelBtn">Cancel</button>
    <button type="button" class="form-btn form-btn--primary" id="saveBtn">Save</button>
  </div>
`;

export class PmTeacherProfileForm extends HTMLElement {
  private firstNameInput: HTMLInputElement | null = null;
  private surnameInput: HTMLInputElement | null = null;
  private firstNameError: HTMLElement | null = null;
  private surnameError: HTMLElement | null = null;
  private formError: HTMLElement | null = null;
  private cancelBtn: HTMLButtonElement | null = null;
  private saveBtn: HTMLButtonElement | null = null;
  private _teacherId: string | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [formButtonStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.firstNameInput = this.shadowRoot!.getElementById('firstName') as HTMLInputElement;
    this.surnameInput = this.shadowRoot!.getElementById('surname') as HTMLInputElement;
    this.firstNameError = this.shadowRoot!.getElementById('firstNameError') as HTMLElement;
    this.surnameError = this.shadowRoot!.getElementById('surnameError') as HTMLElement;
    this.formError = this.shadowRoot!.getElementById('formError') as HTMLElement;
    this.cancelBtn = this.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement;
    this.saveBtn = this.shadowRoot!.getElementById('saveBtn') as HTMLButtonElement;

    this.cancelBtn.addEventListener('click', this.handleCancel);
    this.saveBtn.addEventListener('click', this.handleSave);
  }

  disconnectedCallback(): void {
    this.cancelBtn?.removeEventListener('click', this.handleCancel);
    this.saveBtn?.removeEventListener('click', this.handleSave);
  }

  populate(teacher: TeacherResult): void {
    this._teacherId = teacher.teacherId;
    this.firstNameInput!.value = teacher.firstName;
    this.surnameInput!.value = teacher.surname;
    this.clearErrors();
    this.setBusy(false);
  }

  showError(message: string): void {
    this.formError!.textContent = message;
    this.setBusy(false);
  }

  setBusy(busy: boolean): void {
    setButtonsBusy(this.saveBtn!, this.cancelBtn!, busy);
  }

  private clearErrors(): void {
    this.firstNameError!.textContent = '';
    this.surnameError!.textContent = '';
    this.formError!.textContent = '';
  }

  private handleCancel = (): void => {
    this.dispatchEvent(new CustomEvent('teacher-edit-cancelled', { bubbles: true, composed: true }));
  };

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
    if (!valid || !this._teacherId) return;

    const input: TeacherProfileInput = { firstName, surname };
    this.setBusy(true);

    this.dispatchEvent(
      new CustomEvent<{ teacherId: string; input: TeacherProfileInput }>('teacher-profile-update-requested', {
        bubbles: true,
        composed: true,
        detail: { teacherId: this._teacherId, input },
      }),
    );
  };
}

customElements.define('pm-teacher-profile-form', PmTeacherProfileForm);
