import { GRADES, CLASSES, PHASES, LANGUAGES, populateSelectOptions } from './student-options';
import type { StudentInput } from '../services/students';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: none;
      font-family: 'Inter', system-ui, sans-serif;
    }
    :host([open]) {
      display: block;
    }
    .create-student__card {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 24px;
      margin-bottom: 24px;
    }
    .create-student__title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--pm-text);
      margin-bottom: 16px;
    }
    .create-student__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }
    .create-student__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .create-student__label {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text);
    }
    .create-student__input,
    .create-student__select {
      box-sizing: border-box;
      height: 44px;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
    }
    .create-student__actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }
    .create-student__submit {
      height: 44px;
      padding: 0 24px;
      border: none;
      border-radius: var(--pm-radius);
      background: var(--pm-accent);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .create-student__submit:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .create-student__cancel {
      height: 44px;
      padding: 0 24px;
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      background: transparent;
      color: var(--pm-text);
      font-size: 14px;
      cursor: pointer;
    }
    .create-student__message {
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      font-size: 13px;
      display: none;
    }
    .create-student__message--error {
      display: block;
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="create-student__card">
    <h2 class="create-student__title">Create Student</h2>
    <form id="form">
      <div class="create-student__grid">
        <div class="create-student__field">
          <label class="create-student__label" for="firstName">First Name</label>
          <input class="create-student__input" type="text" id="firstName" required />
        </div>
        <div class="create-student__field">
          <label class="create-student__label" for="lastName">Last Name</label>
          <input class="create-student__input" type="text" id="lastName" required />
        </div>
        <div class="create-student__field">
          <label class="create-student__label" for="dateOfBirth">Date of Birth</label>
          <input class="create-student__input" type="date" id="dateOfBirth" required />
        </div>
        <div class="create-student__field">
          <label class="create-student__label" for="grade">Grade</label>
          <select class="create-student__select" id="grade" required></select>
        </div>
        <div class="create-student__field">
          <label class="create-student__label" for="class">Class</label>
          <select class="create-student__select" id="class" required></select>
        </div>
        <div class="create-student__field">
          <label class="create-student__label" for="phase">Phase</label>
          <select class="create-student__select" id="phase" required></select>
        </div>
        <div class="create-student__field">
          <label class="create-student__label" for="language">Language</label>
          <select class="create-student__select" id="language" required></select>
        </div>
      </div>
      <div class="create-student__actions">
        <button type="button" class="create-student__cancel" id="cancelBtn">Cancel</button>
        <button type="submit" class="create-student__submit" id="submitBtn">Create Student</button>
      </div>
    </form>
    <div class="create-student__message" id="message"></div>
  </div>
`;

export class PmCreateStudentForm extends HTMLElement {
  private form: HTMLFormElement | null = null;
  private firstNameInput: HTMLInputElement | null = null;
  private lastNameInput: HTMLInputElement | null = null;
  private dateOfBirthInput: HTMLInputElement | null = null;
  private gradeSelect: HTMLSelectElement | null = null;
  private classSelect: HTMLSelectElement | null = null;
  private phaseSelect: HTMLSelectElement | null = null;
  private languageSelect: HTMLSelectElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private message: HTMLElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.form = this.shadowRoot!.getElementById('form') as HTMLFormElement;
    this.firstNameInput = this.shadowRoot!.getElementById('firstName') as HTMLInputElement;
    this.lastNameInput = this.shadowRoot!.getElementById('lastName') as HTMLInputElement;
    this.dateOfBirthInput = this.shadowRoot!.getElementById('dateOfBirth') as HTMLInputElement;
    this.gradeSelect = this.shadowRoot!.getElementById('grade') as HTMLSelectElement;
    this.classSelect = this.shadowRoot!.getElementById('class') as HTMLSelectElement;
    this.phaseSelect = this.shadowRoot!.getElementById('phase') as HTMLSelectElement;
    this.languageSelect = this.shadowRoot!.getElementById('language') as HTMLSelectElement;
    this.submitBtn = this.shadowRoot!.getElementById('submitBtn') as HTMLButtonElement;
    this.message = this.shadowRoot!.getElementById('message') as HTMLElement;

    populateSelectOptions(this.gradeSelect, GRADES);
    populateSelectOptions(this.classSelect, CLASSES);
    populateSelectOptions(this.phaseSelect, PHASES);
    populateSelectOptions(this.languageSelect, LANGUAGES);

    this.form.addEventListener('submit', this.handleSubmit);
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', () => this.close());
  }

  open(): void {
    this.clearMessage();
    this.form!.reset();
    this.submitBtn!.disabled = false;
    this.setAttribute('open', '');
  }

  close(): void {
    this.removeAttribute('open');
  }

  showError(message: string): void {
    this.message!.textContent = message;
    this.message!.classList.add('create-student__message--error');
    this.submitBtn!.disabled = false;
  }

  private clearMessage(): void {
    this.message!.textContent = '';
    this.message!.className = 'create-student__message';
  }

  private handleSubmit = (e: Event): void => {
    e.preventDefault();
    this.clearMessage();
    this.submitBtn!.disabled = true;

    const input: StudentInput = {
      firstName: this.firstNameInput!.value,
      lastName: this.lastNameInput!.value,
      dateOfBirth: this.dateOfBirthInput!.value,
      grade: this.gradeSelect!.value as StudentInput['grade'],
      class: this.classSelect!.value as StudentInput['class'],
      phase: this.phaseSelect!.value as StudentInput['phase'],
      language: this.languageSelect!.value as StudentInput['language'],
    };

    this.dispatchEvent(
      new CustomEvent('student-create-requested', {
        bubbles: true,
        composed: true,
        detail: { input },
      }),
    );
  };
}

customElements.define('pm-create-student-form', PmCreateStudentForm);
