import { addPlaceholderOption } from './student-options';
import type { GuardianInput, GuardianRelationship } from '../services/guardians';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      padding: 0 3px;
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .guardian-form__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }
    .guardian-form__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .guardian-form__label {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text);
    }
    .guardian-form__input,
    .guardian-form__select {
      box-sizing: border-box;
      height: 44px;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
    }
    .guardian-form__checkboxes {
      display: flex;
      gap: 20px;
      margin-top: 16px;
      flex-wrap: wrap;
    }
    .guardian-form__checkbox-field {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .guardian-form__checkbox-label {
      font-size: 13px;
      color: var(--pm-text);
    }
    .guardian-form__message {
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      font-size: 13px;
      display: none;
    }
    .guardian-form__message--error {
      display: block;
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
    }
    .guardian-form__actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
    }
    .guardian-form__btn {
      height: 40px;
      padding: 0 20px;
      border-radius: var(--pm-radius);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .guardian-form__btn--cancel {
      background: transparent;
      border: 1px solid var(--pm-border);
      color: var(--pm-text);
    }
    .guardian-form__btn--primary {
      border: none;
      background: var(--pm-accent);
      color: #fff;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <form id="form">
    <div class="guardian-form__grid">
      <div class="guardian-form__field">
        <label class="guardian-form__label" for="firstName">First Name</label>
        <input class="guardian-form__input" type="text" id="firstName" required />
      </div>
      <div class="guardian-form__field">
        <label class="guardian-form__label" for="surname">Surname</label>
        <input class="guardian-form__input" type="text" id="surname" required />
      </div>
      <div class="guardian-form__field">
        <label class="guardian-form__label" for="relationship">Relationship</label>
        <select class="guardian-form__select" id="relationship" required></select>
      </div>
      <div class="guardian-form__field">
        <label class="guardian-form__label" for="cell">Cell</label>
        <input class="guardian-form__input" type="text" id="cell" />
      </div>
      <div class="guardian-form__field">
        <label class="guardian-form__label" for="email">Email</label>
        <input class="guardian-form__input" type="email" id="email" />
      </div>
    </div>
    <div class="guardian-form__checkboxes">
      <div class="guardian-form__checkbox-field">
        <input type="checkbox" id="receivesCorrespondence" />
        <label class="guardian-form__checkbox-label" for="receivesCorrespondence">Receives Correspondence</label>
      </div>
      <div class="guardian-form__checkbox-field">
        <input type="checkbox" id="responsibleForPayment" />
        <label class="guardian-form__checkbox-label" for="responsibleForPayment">Responsible for Payment</label>
      </div>
      <div class="guardian-form__checkbox-field">
        <input type="checkbox" id="married" />
        <label class="guardian-form__checkbox-label" for="married">Married</label>
      </div>
    </div>
    <div class="guardian-form__message" id="message"></div>
    <div class="guardian-form__actions">
      <button type="button" class="guardian-form__btn guardian-form__btn--cancel" id="cancelBtn">Cancel</button>
      <button type="button" class="guardian-form__btn guardian-form__btn--primary" id="confirmBtn">Add</button>
    </div>
  </form>
`;

export class PmGuardianForm extends HTMLElement {
  private form: HTMLFormElement | null = null;
  private firstNameInput: HTMLInputElement | null = null;
  private surnameInput: HTMLInputElement | null = null;
  private relationshipSelect: HTMLSelectElement | null = null;
  private cellInput: HTMLInputElement | null = null;
  private emailInput: HTMLInputElement | null = null;
  private receivesCorrespondenceInput: HTMLInputElement | null = null;
  private responsibleForPaymentInput: HTMLInputElement | null = null;
  private marriedInput: HTMLInputElement | null = null;
  private message: HTMLElement | null = null;
  private cancelBtn: HTMLButtonElement | null = null;
  private confirmBtn: HTMLButtonElement | null = null;
  private _relationships: GuardianRelationship[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.form = this.shadowRoot!.getElementById('form') as HTMLFormElement;
    this.firstNameInput = this.shadowRoot!.getElementById('firstName') as HTMLInputElement;
    this.surnameInput = this.shadowRoot!.getElementById('surname') as HTMLInputElement;
    this.relationshipSelect = this.shadowRoot!.getElementById('relationship') as HTMLSelectElement;
    this.cellInput = this.shadowRoot!.getElementById('cell') as HTMLInputElement;
    this.emailInput = this.shadowRoot!.getElementById('email') as HTMLInputElement;
    this.receivesCorrespondenceInput = this.shadowRoot!.getElementById('receivesCorrespondence') as HTMLInputElement;
    this.responsibleForPaymentInput = this.shadowRoot!.getElementById('responsibleForPayment') as HTMLInputElement;
    this.marriedInput = this.shadowRoot!.getElementById('married') as HTMLInputElement;
    this.message = this.shadowRoot!.getElementById('message') as HTMLElement;
    this.cancelBtn = this.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement;
    this.confirmBtn = this.shadowRoot!.getElementById('confirmBtn') as HTMLButtonElement;

    this.cancelBtn.addEventListener('click', this.handleCancel);
    this.confirmBtn.addEventListener('click', this.handleConfirm);

    this.renderRelationshipOptions();
  }

  disconnectedCallback(): void {
    this.cancelBtn?.removeEventListener('click', this.handleCancel);
    this.confirmBtn?.removeEventListener('click', this.handleConfirm);
  }

  set relationships(value: GuardianRelationship[]) {
    this._relationships = value;
    this.renderRelationshipOptions();
  }

  /** Resets to a blank Add-Guardian form. */
  resetForAdd(): void {
    this.clearError();
    this.form!.reset();
    addPlaceholderOption(this.relationshipSelect!, 'Select relationship');
    this.relationshipSelect!.value = '';
  }

  showError(message: string): void {
    this.message!.textContent = message;
    this.message!.classList.add('guardian-form__message--error');
  }

  clearError(): void {
    this.message!.textContent = '';
    this.message!.className = 'guardian-form__message';
  }

  private renderRelationshipOptions(): void {
    if (!this.relationshipSelect) return;

    const selected = this.relationshipSelect.value;
    this.relationshipSelect.innerHTML = '';
    for (const relationship of this._relationships) {
      const option = document.createElement('option');
      option.value = relationship.guardianRelationshipId;
      option.textContent = relationship.name;
      this.relationshipSelect.appendChild(option);
    }
    addPlaceholderOption(this.relationshipSelect, 'Select relationship');
    this.relationshipSelect.value = selected;
  }

  private getValues(): GuardianInput {
    return {
      guardianRelationshipId: this.relationshipSelect!.value,
      firstName: this.firstNameInput!.value,
      surname: this.surnameInput!.value,
      cell: this.cellInput!.value || null,
      email: this.emailInput!.value || null,
      receivesCorrespondence: this.receivesCorrespondenceInput!.checked,
      responsibleForPayment: this.responsibleForPaymentInput!.checked,
      married: this.marriedInput!.checked,
    };
  }

  private handleConfirm = (): void => {
    if (!this.form!.reportValidity()) return;

    this.dispatchEvent(
      new CustomEvent('guardian-form-submitted', {
        bubbles: true,
        composed: true,
        detail: { input: this.getValues() },
      }),
    );
  };

  private handleCancel = (): void => {
    this.dispatchEvent(new CustomEvent('guardian-form-cancelled', { bubbles: true, composed: true }));
  };
}

customElements.define('pm-guardian-form', PmGuardianForm);
