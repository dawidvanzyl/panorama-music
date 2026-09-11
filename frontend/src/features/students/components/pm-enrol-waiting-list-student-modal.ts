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

import { offeredLessonTypes, offeredDurationTypes, fillOfferedOptions } from './offered-structures';

/**
 * Shown in place of the form when the school runs no instrument course the
 * student could be moved onto. The occurrence type is fixed at the waiting
 * list, so the set that matters is the one offered under it — and where that is
 * empty there is nothing to pick, which is worth saying rather than leaving two
 * empty pickers and an Enrol button that cannot succeed.
 */
export const NO_OFFERED_STRUCTURES_NOTICE =
  'The school runs no instrument courses yet, so there is nothing to enrol this student into.';

export const NO_OFFERED_STRUCTURES_FOR_OCCURRENCE_NOTICE =
  'The school runs no instrument courses under this occurrence type, so there is nothing to enrol ' +
  'this student into.';

/**
 * Shown above a form that still has choices in it, when the combination the
 * student was actually waiting for is not among them. The pre-fill silently
 * finds no matching option and the picker is left on its placeholder, so
 * without this the Coordinator meets the browser's own validation bubble with
 * no idea why what they expected is missing. They are not stuck — any offered
 * combination enrols the student — which is why this states the reason and
 * blocks nothing.
 */
export const ENTRY_STRUCTURE_NO_LONGER_OFFERED_NOTICE =
  'The lesson type and duration this student waited for are no longer offered, so they are not ' +
  'pre-filled. Choose a combination the school offers to enrol this student.';

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
    .enrol__notice-empty {
      padding: 12px 16px;
      border-radius: var(--pm-radius, 10px);
      background: var(--pm-surface-2, #22263a);
      border: 1px solid var(--pm-border, #2e3250);
      color: var(--pm-text-muted, #9194a6);
      font-size: 13px;
      margin: 0;
    }
    .enrol__notice-empty--above-form {
      margin-bottom: 20px;
    }
    [hidden] {
      display: none !important;
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
      <p class="enrol__notice-empty" id="noOfferedStructures" hidden></p>
      <p class="enrol__notice-empty enrol__notice-empty--above-form" id="entryStructureNotOffered" hidden></p>
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
  private noOfferedStructuresNotice: HTMLElement | null = null;
  private entryStructureNotOfferedNotice: HTMLElement | null = null;
  private confirmButton: HTMLButtonElement | null = null;

  private _lessonStructures: LessonStructure[] = [];
  private _teachers: AssignableTeacher[] = [];
  private _studentId = '';
  private _studentName = '';
  private _occurrenceType: OccurrenceType = 'DuringSchool';
  // What the entry itself waited for, kept so the notice can be re-decided
  // whenever the offered set is rebuilt — not only on the way in.
  private _entryLessonType: LessonType | '' = '';
  private _entryDurationType: DurationType | '' = '';

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
    this.noOfferedStructuresNotice = this.shadowRoot!.getElementById('noOfferedStructures') as HTMLElement;
    this.entryStructureNotOfferedNotice = this.shadowRoot!.getElementById('entryStructureNotOffered') as HTMLElement;

    populateSelectOptions<InstrumentType>(
      this.instrumentTypeSelect,
      INSTRUMENT_TYPES,
      (value) => INSTRUMENT_TYPE_LABELS[value],
    );
    populateSelectOptions<StepType>(this.stepSelect, STEP_TYPES, (value) => STEP_TYPE_LABELS[value]);
    addPlaceholderOption(this.stepSelect, 'Select step');

    this.confirmButton = this.shadowRoot!.getElementById('confirmBtn') as HTMLButtonElement;
    this.shadowRoot!.getElementById('cancelBtn')!.addEventListener('click', this.handleCancel);
    this.confirmButton.addEventListener('click', this.handleConfirm);
    this.lessonTypeSelect.addEventListener('change', this.handleLessonTypeChange);
  }

  disconnectedCallback(): void {
    this.lessonTypeSelect?.removeEventListener('change', this.handleLessonTypeChange);
  }

  /**
   * The combinations the school runs an instrument course under. The two
   * selects are built from these — narrowed to the occurrence type the student
   * waited under — so the Coordinator cannot arrive at a combination the server
   * would then have to refuse for want of a course.
   */
  set lessonStructures(value: LessonStructure[]) {
    this._lessonStructures = value;
    // Only once an entry is on show is there an occurrence type to narrow by;
    // before that, `show` does the first render. Re-rendering here keeps a set
    // assigned after opening from leaving stale options on the controls.
    if (this._occurrenceType) this.renderStructureOptions();
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
    this._entryLessonType = entry.lessonType;
    this._entryDurationType = entry.durationType;

    this.clearError();
    this.notice!.textContent = `${this._studentName} will be removed from the waiting list once enrolled.`;
    this.occurrenceTypeValue!.textContent = OCCURRENCE_TYPE_LABELS[occurrenceType];
    this.renderStructureOptions();
    // The entry's own combination may no longer be offered — a course can be
    // deleted after a student is captured — so each assignment lands only if
    // the value survived the narrowing, leaving the placeholder if it did not.
    this.lessonTypeSelect!.value = entry.lessonType;
    this.renderDurationTypeOptions();
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

  /**
   * Rebuilds the lesson and duration selects from what is offered under the
   * fixed occurrence type. Where nothing is offered under it the form gives way
   * to a notice and Enrol is withdrawn: a dead end stated plainly beats two
   * empty pickers and a button that cannot succeed.
   */
  private renderStructureOptions(): void {
    const offered = offeredLessonTypes(this._lessonStructures, this._occurrenceType);
    const nothingOffered = offered.length === 0;

    this.noOfferedStructuresNotice!.textContent =
      this._lessonStructures.length === 0 ? NO_OFFERED_STRUCTURES_NOTICE : NO_OFFERED_STRUCTURES_FOR_OCCURRENCE_NOTICE;
    this.noOfferedStructuresNotice!.hidden = !nothingOffered;
    this.form!.hidden = nothingOffered;
    this.confirmButton!.hidden = nothingOffered;

    fillOfferedOptions<LessonType>(this.lessonTypeSelect!, offered, LESSON_TYPE_LABELS, 'Select lesson type');
    this.renderDurationTypeOptions();
    this.renderEntryStructureNotice(nothingOffered);
  }

  /**
   * States that what the student waited for is gone, where the form still has
   * something to offer in its place. Suppressed where nothing is offered under
   * the occurrence type at all: the notice standing in for the form already
   * says there is nothing to pick, and saying both would be two ways of
   * reporting one dead end.
   */
  private renderEntryStructureNotice(nothingOffered: boolean): void {
    const entryIsOffered = this._lessonStructures.some(
      (structure) =>
        structure.occurrenceType === this._occurrenceType &&
        structure.lessonType === this._entryLessonType &&
        structure.durationType === this._entryDurationType,
    );

    this.entryStructureNotOfferedNotice!.textContent = ENTRY_STRUCTURE_NO_LONGER_OFFERED_NOTICE;
    this.entryStructureNotOfferedNotice!.hidden = this._entryLessonType === '' || nothingOffered || entryIsOffered;
  }

  private renderDurationTypeOptions(): void {
    fillOfferedOptions<DurationType>(
      this.durationTypeSelect!,
      offeredDurationTypes(this._lessonStructures, this._occurrenceType, this.lessonTypeSelect!.value),
      DURATION_TYPE_LABELS,
      'Select duration type',
    );
  }

  private handleLessonTypeChange = (): void => {
    this.renderDurationTypeOptions();
  };

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
