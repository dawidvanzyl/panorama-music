import { addPlaceholderOption } from './student-options';
import {
  INSTRUMENT_TYPES,
  INSTRUMENT_TYPE_LABELS,
  STEP_TYPES,
  STEP_TYPE_LABELS,
  courseLabel,
  recordsInstrumentType,
  recordsStep,
  todayIsoDate,
} from './enrollment-options';
import type {
  AssignableTeacher,
  EnrollableCourse,
  EnrollmentInput,
  InstrumentType,
  StepType,
} from '../services/enrollments';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      padding: 0 3px;
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .enrollment-form__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }
    .enrollment-form__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .enrollment-form__field--wide {
      grid-column: span 2;
    }
    .enrollment-form__field[hidden] {
      display: none;
    }
    .enrollment-form__label {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text);
    }
    .enrollment-form__input,
    .enrollment-form__select {
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
    .enrollment-form__message {
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      font-size: 13px;
      display: none;
    }
    .enrollment-form__message--error {
      display: block;
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
    }
    .enrollment-form__actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
    }
    .enrollment-form__btn {
      height: 40px;
      padding: 0 20px;
      border-radius: var(--pm-radius);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .enrollment-form__btn--cancel {
      background: transparent;
      border: 1px solid var(--pm-border);
      color: var(--pm-text);
    }
    .enrollment-form__btn--primary {
      border: none;
      background: var(--pm-accent);
      color: #fff;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <form id="form">
    <div class="enrollment-form__grid">
      <div class="enrollment-form__field enrollment-form__field--wide">
        <label class="enrollment-form__label" for="course">Course</label>
        <select class="enrollment-form__select" id="course" required></select>
      </div>
      <div class="enrollment-form__field">
        <label class="enrollment-form__label" for="teacher">Teacher</label>
        <select class="enrollment-form__select" id="teacher" required></select>
      </div>
      <div class="enrollment-form__field" id="instrumentField" hidden>
        <label class="enrollment-form__label" for="instrument">Instrument Type</label>
        <select class="enrollment-form__select" id="instrument"></select>
      </div>
      <div class="enrollment-form__field" id="stepField" hidden>
        <label class="enrollment-form__label" for="step">Step</label>
        <select class="enrollment-form__select" id="step"></select>
      </div>
      <div class="enrollment-form__field">
        <label class="enrollment-form__label" for="enrolledDate">Enrolled Date</label>
        <input class="enrollment-form__input" type="date" id="enrolledDate" required />
      </div>
    </div>
    <div class="enrollment-form__message" id="message"></div>
    <div class="enrollment-form__actions">
      <button type="button" class="enrollment-form__btn enrollment-form__btn--cancel" id="cancelBtn">Cancel</button>
      <button type="button" class="enrollment-form__btn enrollment-form__btn--primary" id="confirmBtn">Enroll</button>
    </div>
  </form>
`;

export class PmEnrollmentForm extends HTMLElement {
  private form: HTMLFormElement | null = null;
  private courseSelect: HTMLSelectElement | null = null;
  private teacherSelect: HTMLSelectElement | null = null;
  private instrumentField: HTMLElement | null = null;
  private instrumentSelect: HTMLSelectElement | null = null;
  private stepField: HTMLElement | null = null;
  private stepSelect: HTMLSelectElement | null = null;
  private enrolledDateInput: HTMLInputElement | null = null;
  private message: HTMLElement | null = null;
  private cancelBtn: HTMLButtonElement | null = null;
  private confirmBtn: HTMLButtonElement | null = null;

  private _courses: EnrollableCourse[] = [];
  private _teachers: AssignableTeacher[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.form = this.shadowRoot!.getElementById('form') as HTMLFormElement;
    this.courseSelect = this.shadowRoot!.getElementById('course') as HTMLSelectElement;
    this.teacherSelect = this.shadowRoot!.getElementById('teacher') as HTMLSelectElement;
    this.instrumentField = this.shadowRoot!.getElementById('instrumentField') as HTMLElement;
    this.instrumentSelect = this.shadowRoot!.getElementById('instrument') as HTMLSelectElement;
    this.stepField = this.shadowRoot!.getElementById('stepField') as HTMLElement;
    this.stepSelect = this.shadowRoot!.getElementById('step') as HTMLSelectElement;
    this.enrolledDateInput = this.shadowRoot!.getElementById('enrolledDate') as HTMLInputElement;
    this.message = this.shadowRoot!.getElementById('message') as HTMLElement;
    this.cancelBtn = this.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement;
    this.confirmBtn = this.shadowRoot!.getElementById('confirmBtn') as HTMLButtonElement;

    this.courseSelect.addEventListener('change', this.handleCourseChanged);
    this.cancelBtn.addEventListener('click', this.handleCancel);
    this.confirmBtn.addEventListener('click', this.handleConfirm);

    this.renderCourseOptions();
    this.renderTeacherOptions();
    this.renderInstrumentOptions();
    this.renderStepOptions();
  }

  disconnectedCallback(): void {
    this.courseSelect?.removeEventListener('change', this.handleCourseChanged);
    this.cancelBtn?.removeEventListener('click', this.handleCancel);
    this.confirmBtn?.removeEventListener('click', this.handleConfirm);
  }

  set courses(value: EnrollableCourse[]) {
    this._courses = value;
    this.renderCourseOptions();
  }

  set teachers(value: AssignableTeacher[]) {
    this._teachers = value;
    this.renderTeacherOptions();
  }

  /**
   * The confirm action is "Enroll" against an existing student and "Add" while
   * a new one is still being staged — nothing is sent in that mode until the
   * wizard is saved, so calling it Enroll would overstate what it does.
   */
  set isPersisted(value: boolean) {
    if (this.confirmBtn) this.confirmBtn.textContent = value ? 'Enroll' : 'Add';
  }

  /** Resets to a blank enroll form with the enrolled date defaulted to today. */
  resetForAdd(): void {
    this.clearError();
    this.form!.reset();
    this.renderCourseOptions();
    this.renderTeacherOptions();
    this.courseSelect!.value = '';
    this.teacherSelect!.value = '';
    this.instrumentSelect!.value = '';
    this.stepSelect!.value = '';
    this.enrolledDateInput!.value = todayIsoDate();
    this.applyCourseTypeRules();
  }

  showError(message: string): void {
    this.message!.textContent = message;
    this.message!.classList.add('enrollment-form__message--error');
  }

  clearError(): void {
    this.message!.textContent = '';
    this.message!.className = 'enrollment-form__message';
  }

  private renderCourseOptions(): void {
    if (!this.courseSelect) return;

    const selected = this.courseSelect.value;
    this.courseSelect.innerHTML = '';
    for (const course of this._courses) {
      const option = document.createElement('option');
      option.value = course.courseId;
      option.textContent = courseLabel(course);
      this.courseSelect.appendChild(option);
    }
    addPlaceholderOption(this.courseSelect, 'Select course');
    this.courseSelect.value = selected;
  }

  private renderTeacherOptions(): void {
    if (!this.teacherSelect) return;

    const selected = this.teacherSelect.value;
    this.teacherSelect.innerHTML = '';
    for (const teacher of this._teachers) {
      const option = document.createElement('option');
      option.value = teacher.teacherId;
      option.textContent = `${teacher.firstName} ${teacher.surname}`;
      this.teacherSelect.appendChild(option);
    }
    addPlaceholderOption(this.teacherSelect, 'Select teacher');
    this.teacherSelect.value = selected;
  }

  private renderInstrumentOptions(): void {
    if (!this.instrumentSelect) return;

    for (const instrument of INSTRUMENT_TYPES) {
      const option = document.createElement('option');
      option.value = instrument;
      option.textContent = INSTRUMENT_TYPE_LABELS[instrument];
      this.instrumentSelect.appendChild(option);
    }
    addPlaceholderOption(this.instrumentSelect, 'Select instrument');
    this.instrumentSelect.value = '';
  }

  private renderStepOptions(): void {
    if (!this.stepSelect) return;

    for (const step of STEP_TYPES) {
      const option = document.createElement('option');
      option.value = step;
      option.textContent = STEP_TYPE_LABELS[step];
      this.stepSelect.appendChild(option);
    }
    addPlaceholderOption(this.stepSelect, 'Select step');
    this.stepSelect.value = '';
  }

  /**
   * The chosen course's type governs the last two selects, so a value carried
   * over from a course type that no longer records it is cleared rather than
   * left to be submitted invisibly.
   */
  private applyCourseTypeRules(): void {
    const course = this._courses.find((c) => c.courseId === this.courseSelect!.value);
    const offersInstrument = course !== undefined && recordsInstrumentType(course.courseType);
    const offersStep = course !== undefined && recordsStep(course.courseType);

    this.instrumentField!.hidden = !offersInstrument;
    this.instrumentSelect!.required = offersInstrument;
    if (!offersInstrument) this.instrumentSelect!.value = '';

    this.stepField!.hidden = !offersStep;
    this.stepSelect!.required = offersStep;
    if (!offersStep) this.stepSelect!.value = '';
  }

  private handleCourseChanged = (): void => {
    this.applyCourseTypeRules();
  };

  private getValues(): EnrollmentInput {
    return {
      courseId: this.courseSelect!.value,
      teacherId: this.teacherSelect!.value,
      instrumentType: this.instrumentField!.hidden ? null : (this.instrumentSelect!.value as InstrumentType),
      stepType: this.stepField!.hidden ? null : (this.stepSelect!.value as StepType),
      enrolledDate: this.enrolledDateInput!.value,
    };
  }

  private handleConfirm = (): void => {
    if (!this.form!.reportValidity()) return;

    this.dispatchEvent(
      new CustomEvent('enrollment-form-submitted', {
        bubbles: true,
        composed: true,
        detail: { input: this.getValues() },
      }),
    );
  };

  private handleCancel = (): void => {
    this.dispatchEvent(new CustomEvent('enrollment-form-cancelled', { bubbles: true, composed: true }));
  };
}

customElements.define('pm-enrollment-form', PmEnrollmentForm);
