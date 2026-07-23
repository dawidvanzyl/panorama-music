import {
  GRADES,
  CLASSES,
  PHASES,
  LANGUAGES,
  populateSelectOptions,
  addPlaceholderOption,
  removePlaceholderOption,
  gradeLabel,
} from './student-options';
import type { StudentInput, StudentResult } from '../services/students';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
    }
    .student-step__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }
    .student-step__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .student-step__label {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text);
    }
    .student-step__input,
    .student-step__select {
      box-sizing: border-box;
      height: 44px;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
    }
    .student-step__message {
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      font-size: 13px;
      display: none;
    }
    .student-step__message--error {
      display: block;
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <form id="form">
    <div class="student-step__grid">
      <div class="student-step__field">
        <label class="student-step__label" for="firstName">First Name</label>
        <input class="student-step__input" type="text" id="firstName" required />
      </div>
      <div class="student-step__field">
        <label class="student-step__label" for="lastName">Last Name</label>
        <input class="student-step__input" type="text" id="lastName" required />
      </div>
      <div class="student-step__field">
        <label class="student-step__label" for="dateOfBirth">Date of Birth</label>
        <input class="student-step__input" type="date" id="dateOfBirth" required />
      </div>
      <div class="student-step__field">
        <label class="student-step__label" for="grade">Grade</label>
        <select class="student-step__select" id="grade" required></select>
      </div>
      <div class="student-step__field">
        <label class="student-step__label" for="class">Class</label>
        <select class="student-step__select" id="class" required></select>
      </div>
      <div class="student-step__field">
        <label class="student-step__label" for="phase">Phase</label>
        <select class="student-step__select" id="phase" required></select>
      </div>
      <div class="student-step__field">
        <label class="student-step__label" for="language">Language</label>
        <select class="student-step__select" id="language" required></select>
      </div>
    </div>
  </form>
  <div class="student-step__message" id="message"></div>
`;

export class PmStudentStep extends HTMLElement {
  private form: HTMLFormElement | null = null;
  private firstNameInput: HTMLInputElement | null = null;
  private lastNameInput: HTMLInputElement | null = null;
  private dateOfBirthInput: HTMLInputElement | null = null;
  private gradeSelect: HTMLSelectElement | null = null;
  private classSelect: HTMLSelectElement | null = null;
  private phaseSelect: HTMLSelectElement | null = null;
  private languageSelect: HTMLSelectElement | null = null;
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
    this.message = this.shadowRoot!.getElementById('message') as HTMLElement;

    populateSelectOptions(this.gradeSelect, GRADES, gradeLabel);
    populateSelectOptions(this.classSelect, CLASSES);
    populateSelectOptions(this.phaseSelect, PHASES);
    populateSelectOptions(this.languageSelect, LANGUAGES);
  }

  reset(): void {
    this.clearError();
    this.form!.reset();
    for (const { select, label } of this.selectFields()) {
      addPlaceholderOption(select, label);
      select.value = '';
    }
  }

  setValues(student: StudentResult): void {
    this.clearError();
    this.firstNameInput!.value = student.firstName;
    this.lastNameInput!.value = student.lastName;
    this.dateOfBirthInput!.value = student.dateOfBirth;
    for (const { select } of this.selectFields()) {
      removePlaceholderOption(select);
    }
    this.gradeSelect!.value = student.grade;
    this.classSelect!.value = student.class;
    this.phaseSelect!.value = student.phase;
    this.languageSelect!.value = student.language;
  }

  private selectFields(): Array<{ select: HTMLSelectElement; label: string }> {
    return [
      { select: this.gradeSelect!, label: 'Grade' },
      { select: this.classSelect!, label: 'Class' },
      { select: this.phaseSelect!, label: 'Phase' },
      { select: this.languageSelect!, label: 'Language' },
    ];
  }

  getValues(): StudentInput {
    return {
      firstName: this.firstNameInput!.value,
      lastName: this.lastNameInput!.value,
      dateOfBirth: this.dateOfBirthInput!.value,
      grade: this.gradeSelect!.value as StudentInput['grade'],
      class: this.classSelect!.value as StudentInput['class'],
      phase: this.phaseSelect!.value as StudentInput['phase'],
      language: this.languageSelect!.value as StudentInput['language'],
    };
  }

  reportValidity(): boolean {
    return this.form!.reportValidity();
  }

  showError(message: string): void {
    this.message!.textContent = message;
    this.message!.classList.add('student-step__message--error');
  }

  clearError(): void {
    this.message!.textContent = '';
    this.message!.className = 'student-step__message';
  }
}

customElements.define('pm-student-step', PmStudentStep);
