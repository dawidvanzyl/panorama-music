import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import { addPlaceholderOption, populateSelectOptions } from './student-options';
import {
  INSTRUMENT_TYPES,
  INSTRUMENT_TYPE_LABELS,
  STEP_TYPES,
  STEP_TYPE_LABELS,
  LESSON_TYPE_LABELS,
  DURATION_TYPE_LABELS,
  OCCURRENCE_TYPE_LABELS,
  todayIsoDate,
} from './enrollment-options';
import type { AssignableTeacher } from '../services/enrollments';
import type {
  DurationType,
  InstrumentType,
  LessonStructure,
  LessonType,
  OccurrenceType,
  StepType,
  WaitingListEnrolmentInput,
  WaitingListEntryResult,
} from '../services/waiting-list';

// Derived from the shared label maps rather than listed again here, the same
// way the capture wizard's own Waiting List tab derives them.
const LESSON_TYPES = Object.keys(LESSON_TYPE_LABELS) as LessonType[];
const DURATION_TYPES = Object.keys(DURATION_TYPE_LABELS) as DurationType[];

const styles = new CSSStyleSheet();
styles.replaceSync(`
    .modal__card {
      max-width: 520px;
    }
    .enrol__title {
      font-size: 18px;
      font-weight: 700;
      color: var(--pm-text, #e2e1ed);
      margin: 0 0 4px;
    }
    .enrol__notice {
      font-size: 13px;
      color: var(--pm-text-muted, #9194a6);
      margin: 0 0 20px;
    }
    .enrol__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }
    .enrol__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .enrol__field--wide {
      grid-column: span 2;
    }
    .enrol__field[hidden] {
      display: none;
    }
    .enrol__label {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text, #e2e1ed);
    }
    .enrol__input,
    .enrol__select {
      box-sizing: border-box;
      height: 44px;
      padding: 0 12px;
      background: var(--pm-surface-2, #22263a);
      border: 1px solid var(--pm-border, #2e3250);
      border-radius: var(--pm-radius, 10px);
      color: var(--pm-text, #e2e1ed);
      font-size: 14px;
      font-family: inherit;
    }
    .enrol__fixed {
      box-sizing: border-box;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 12px;
      background: var(--pm-surface-2, #22263a);
      border: 1px solid var(--pm-border, #2e3250);
      border-radius: var(--pm-radius, 10px);
      color: var(--pm-text-muted, #9194a6);
      font-size: 14px;
    }
    .enrol__locked {
      font-size: 11px;
    }
    .enrol__error {
      margin: 16px 0 0;
      font-size: 13px;
      color: var(--pm-danger, #e05252);
      display: none;
    }
    .enrol__error--visible {
      display: block;
    }
    .modal__actions {
      margin-top: 24px;
    }
    .modal__btn--primary {
      background: var(--pm-accent, #6c5ce7);
      border: 1px solid var(--pm-accent, #6c5ce7);
      color: #fff;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card">
      <h2 class="enrol__title">Enrol Student</h2>
      <p class="enrol__notice" id="notice"></p>
      <form id="form">
        <div class="enrol__grid">
          <div class="enrol__field enrol__field--wide">
            <label class="enrol__label">Occurrence Type</label>
            <div class="enrol__fixed" id="occurrenceType">
              <span id="occurrenceTypeValue"></span>
              <span class="enrol__locked">Locked at waitlist</span>
            </div>
          </div>
          <div class="enrol__field">
            <label class="enrol__label" for="lessonType">Lesson Type</label>
            <select class="enrol__select" id="lessonType" required></select>
          </div>
          <div class="enrol__field">
            <label class="enrol__label" for="durationType">Duration Type</label>
            <select class="enrol__select" id="durationType" required></select>
          </div>
          <div class="enrol__field">
            <label class="enrol__label" for="teacher">Teacher</label>
            <select class="enrol__select" id="teacher" required></select>
          </div>
          <div class="enrol__field">
            <label class="enrol__label" for="instrumentType">Instrument Type</label>
            <select class="enrol__select" id="instrumentType"></select>
          </div>
          <div class="enrol__field" id="stepField">
            <label class="enrol__label" for="step">Step</label>
            <select class="enrol__select" id="step" required></select>
          </div>
          <div class="enrol__field">
            <label class="enrol__label" for="enrolledDate">Enrolled Date</label>
            <input class="enrol__input" type="date" id="enrolledDate" required />
          </div>
        </div>
      </form>
      <p class="enrol__error" id="error"></p>
      <div class="modal__actions">
        <button class="modal__btn modal__btn--cancel" id="cancelBtn" type="button">Cancel</button>
        <button class="modal__btn modal__btn--primary" id="confirmBtn" type="button">Enrol</button>
      </div>
    </div>
  </div>
`;

/**
 * Enrolling a student off the waiting list. The entry supplies what the student
 * waited for; everything but the occurrence type is the Coordinator's to settle
 * before confirming, and the consequence — the student leaving the list — is
 * stated above the fields rather than only after the fact.
 *
 * <p>
 * The occurrence type is a value, not a control, because it is the one thing an
 * enrolment off the list cannot change. There is no course control at all: an
 * entry records an intended instrument, and only an instrument course records
 * one, so the course follows from the structure and the server resolves it.
 * Where the school offers none under the structure chosen, the refusal is shown
 * here — never an empty control with nothing to submit.
 * </p>
 */
export class PmEnrolWaitingListStudentModal extends HTMLElement {
  private form: HTMLFormElement | null = null;
  private notice: HTMLElement | null = null;
  private occurrenceTypeValue: HTMLElement | null = null;
  private lessonTypeSelect: HTMLSelectElement | null = null;
  private durationTypeSelect: HTMLSelectElement | null = null;
  private teacherSelect: HTMLSelectElement | null = null;
  private instrumentTypeSelect: HTMLSelectElement | null = null;
  private stepSelect: HTMLSelectElement | null = null;
  private enrolledDateInput: HTMLInputElement | null = null;
  private errorMessage: HTMLElement | null = null;

  private _lessonStructures: LessonStructure[] = [];
  private _teachers: AssignableTeacher[] = [];
  private _studentId = '';
  private _studentName = '';
  private _occurrenceType: OccurrenceType = 'DuringSchool';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.form = this.shadowRoot!.getElementById('form') as HTMLFormElement;
    this.notice = this.shadowRoot!.getElementById('notice') as HTMLElement;
    this.occurrenceTypeValue = this.shadowRoot!.getElementById('occurrenceTypeValue') as HTMLElement;
    this.lessonTypeSelect = this.shadowRoot!.getElementById('lessonType') as HTMLSelectElement;
    this.durationTypeSelect = this.shadowRoot!.getElementById('durationType') as HTMLSelectElement;
    this.teacherSelect = this.shadowRoot!.getElementById('teacher') as HTMLSelectElement;
    this.instrumentTypeSelect = this.shadowRoot!.getElementById('instrumentType') as HTMLSelectElement;
    this.stepSelect = this.shadowRoot!.getElementById('step') as HTMLSelectElement;
    this.enrolledDateInput = this.shadowRoot!.getElementById('enrolledDate') as HTMLInputElement;
    this.errorMessage = this.shadowRoot!.getElementById('error') as HTMLElement;

    populateSelectOptions<LessonType>(this.lessonTypeSelect, LESSON_TYPES, (value) => LESSON_TYPE_LABELS[value]);
    populateSelectOptions<DurationType>(
      this.durationTypeSelect,
      DURATION_TYPES,
      (value) => DURATION_TYPE_LABELS[value],
    );
    populateSelectOptions<InstrumentType>(
      this.instrumentTypeSelect,
      INSTRUMENT_TYPES,
      (value) => INSTRUMENT_TYPE_LABELS[value],
    );
    populateSelectOptions<StepType>(this.stepSelect, STEP_TYPES, (value) => STEP_TYPE_LABELS[value]);
    addPlaceholderOption(this.stepSelect, 'Select step');

    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', this.handleCancel);
    this.shadowRoot!.getElementById('confirmBtn')!.addEventListener('click', this.handleConfirm);
  }

  /**
   * The seeded lesson-structure grid, which the occurrence type and the chosen
   * lesson and duration types resolve against. The grid is a full cross
   * product, so every combination the two selects can produce names one.
   */
  set lessonStructures(value: LessonStructure[]) {
    this._lessonStructures = value;
  }

  set teachers(value: AssignableTeacher[]) {
    this._teachers = value;
    this.renderTeacherOptions();
  }

  /**
   * Opens the modal for one row, pre-filled from its entry. The occurrence type
   * comes from the group the row was rendered under — the entry itself carries
   * none — and the teacher is deliberately left unchosen: it is the one value
   * the entry never implied.
   */
  show(entry: WaitingListEntryResult, occurrenceType: OccurrenceType): void {
    this._studentId = entry.studentId;
    this._studentName = `${entry.firstName} ${entry.lastName}`;
    this._occurrenceType = occurrenceType;

    this.clearError();
    this.notice!.textContent = `${this._studentName} will be removed from the waiting list once enrolled.`;
    this.occurrenceTypeValue!.textContent = OCCURRENCE_TYPE_LABELS[occurrenceType];
    this.lessonTypeSelect!.value = entry.lessonType;
    this.durationTypeSelect!.value = entry.durationType;
    this.instrumentTypeSelect!.value = entry.instrumentType;
    this.enrolledDateInput!.value = todayIsoDate();
    this.renderTeacherOptions();
    this.teacherSelect!.value = '';
    this.stepSelect!.value = '';

    this.setAttribute('open', '');
  }

  close(): void {
    this.removeAttribute('open');
  }

  showError(message: string): void {
    this.errorMessage!.textContent = message;
    this.errorMessage!.classList.add('enrol__error--visible');
  }

  private clearError(): void {
    this.errorMessage!.textContent = '';
    this.errorMessage!.classList.remove('enrol__error--visible');
  }

  /**
   * The structure the enrolment names: the occurrence type the student waited
   * under, together with the lesson and duration types now chosen.
   */
  private selectedLessonStructure(): LessonStructure | undefined {
    return this._lessonStructures.find(
      (structure) =>
        structure.occurrenceType === this._occurrenceType &&
        structure.lessonType === this.lessonTypeSelect!.value &&
        structure.durationType === this.durationTypeSelect!.value,
    );
  }

  private renderTeacherOptions(): void {
    if (!this.teacherSelect) return;

    const previous = this.teacherSelect.value;
    this.teacherSelect.innerHTML = '';
    for (const teacher of this._teachers) {
      const option = document.createElement('option');
      option.value = teacher.teacherId;
      option.textContent = `${teacher.firstName} ${teacher.surname}`;
      this.teacherSelect.appendChild(option);
    }
    addPlaceholderOption(this.teacherSelect, 'Select teacher');
    this.teacherSelect.value = previous;
  }

  private handleCancel = (): void => {
    this.close();
  };

  private handleConfirm = (): void => {
    if (!this.form!.reportValidity()) return;

    const lessonStructure = this.selectedLessonStructure();
    if (lessonStructure === undefined) {
      this.showError('That lesson type and duration are not offered under this occurrence type.');
      return;
    }

    this.clearError();

    const input: WaitingListEnrolmentInput = {
      lessonStructureId: lessonStructure.lessonStructureId,
      teacherId: this.teacherSelect!.value,
      instrumentType: this.instrumentTypeSelect!.value as InstrumentType,
      stepType: this.stepSelect!.value as StepType,
      enrolledDate: this.enrolledDateInput!.value,
    };

    this.dispatchEvent(
      new CustomEvent('waiting-list-enrol-confirmed', {
        bubbles: true,
        composed: true,
        detail: { studentId: this._studentId, name: this._studentName, input },
      }),
    );
  };
}

customElements.define('pm-enrol-waiting-list-student-modal', PmEnrolWaitingListStudentModal);
