import './pm-student-step';
import './pm-siblings-step';
import './pm-guardians-step';
import './pm-courses-step';
import './pm-extra-curriculars-step';
import './pm-waiting-list-step';
import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import { COURSE_OR_EXTRA_CURRICULAR_TO_SAVE } from './course-or-extra-curricular';
import { phaseConflictMessage } from './phase-agreement';
import type { SiblingStudentResult, StudentResult } from '../services/students';
import type { GuardianRelationship, GuardianResult } from '../services/guardians';
import type { AssignableTeacher, EnrollableCourse, EnrollmentResult } from '../services/enrollments';
import type { PhaseType, StudentExtraCurricular } from '../services/student-extra-curriculars';
import type { LessonStructure } from '../services/waiting-list';
import type { PmStudentStep } from './pm-student-step';
import type { PmSiblingsStep } from './pm-siblings-step';
import type { PmGuardiansStep } from './pm-guardians-step';
import type { PmCoursesStep } from './pm-courses-step';
import type { PmExtraCurricularsStep } from './pm-extra-curriculars-step';
import type { PmWaitingListStep, WaitingListStepValues } from './pm-waiting-list-step';

/** The entry an edit-mode open is opened against: its own identifier and its current values. */
export interface WaitingListEditTarget extends WaitingListStepValues {
  waitingListEntryId: string;
}

type Mode = 'create' | 'edit';
type Step = 'student' | 'siblings' | 'guardians' | 'courses' | 'extraCurriculars' | 'waitingList';
/**
 * Which tabs the wizard presents. 'enrolled' is the Students screen's own
 * modal, unchanged — Courses and Extra-Curriculars, with the "at least one
 * course or extra-curricular" rule intact. 'waitingList' is the Waiting List
 * page's capture mode — Waiting List in their place, and no such rule at all (a
 * waiting-list student holds neither).
 */
type WizardMode = 'enrolled' | 'waitingList';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    .modal__card {
      box-sizing: border-box;
      max-width: none;
      width: calc(100% - var(--pm-sidebar-width, 240px) - (2 * var(--pm-content-padding, 1cm)));
      height: 600px;
      display: flex;
      flex-direction: column;
    }
    .modal__header {
      flex-shrink: 0;
    }
    .wizard__tabs {
      display: flex;
      flex-shrink: 0;
      gap: 4px;
      border-bottom: 1px solid var(--pm-border, #2e3250);
      margin-bottom: 20px;
    }
    .wizard__tab {
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      padding: 10px 16px;
      font-size: 14px;
      font-weight: 600;
      color: var(--pm-text-muted, #9194a6);
      cursor: pointer;
    }
    .wizard__tab--active {
      color: var(--pm-accent);
      border-bottom-color: var(--pm-accent);
    }
    .wizard__tab:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .wizard__step {
      display: none;
    }
    .wizard__step--visible {
      display: flex;
      flex: 1;
      flex-direction: column;
      min-height: 0;
    }
    .wizard__step--visible > * {
      flex: 1;
      min-height: 0;
    }
    .wizard__actions {
      display: flex;
      flex-shrink: 0;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }
    .wizard__step-actions {
      flex: 0 0 auto;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 24px;
    }
    .wizard__step-actions[hidden] {
      display: none;
    }
    .wizard__btn {
      height: 44px;
      padding: 0 24px;
      border-radius: var(--pm-radius);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .wizard__btn--cancel {
      background: transparent;
      border: 1px solid var(--pm-border);
      color: var(--pm-text);
    }
    .wizard__btn--secondary {
      background: transparent;
      border: 1px solid var(--pm-border);
      color: var(--pm-text);
    }
    .wizard__btn--primary {
      border: none;
      background: var(--pm-accent);
      color: #fff;
    }
    .wizard__btn[hidden] {
      display: none;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card">
      <div class="modal__header">
        <h2 class="modal__title" id="title">Create Student</h2>
      </div>
      <div class="wizard__tabs" role="tablist">
        <button type="button" class="wizard__tab wizard__tab--active" id="tabStudent" role="tab" aria-selected="true" aria-controls="stepStudent">Student</button>
        <button type="button" class="wizard__tab" id="tabSiblings" role="tab" aria-selected="false" aria-controls="stepSiblings">Siblings</button>
        <button type="button" class="wizard__tab" id="tabGuardians" role="tab" aria-selected="false" aria-controls="stepGuardians">Guardians</button>
        <button type="button" class="wizard__tab" id="tabCourses" role="tab" aria-selected="false" aria-controls="stepCourses">Courses</button>
        <button type="button" class="wizard__tab" id="tabExtraCurriculars" role="tab" aria-selected="false" aria-controls="stepExtraCurriculars">Extra-Curriculars</button>
        <button type="button" class="wizard__tab" id="tabWaitingList" role="tab" aria-selected="false" aria-controls="stepWaitingList" hidden>Waiting List</button>
      </div>
      <div class="wizard__step wizard__step--visible" id="stepStudent" role="tabpanel" aria-labelledby="tabStudent">
        <pm-student-step id="studentStep"></pm-student-step>
        <div class="wizard__step-actions" id="studentStepActions" hidden>
          <button type="button" class="wizard__btn wizard__btn--cancel" id="studentCancelBtn">Cancel</button>
          <button type="button" class="wizard__btn wizard__btn--primary" id="studentSaveBtn">Save</button>
        </div>
      </div>
      <div class="wizard__step" id="stepSiblings" role="tabpanel" aria-labelledby="tabSiblings">
        <pm-siblings-step id="siblingsStep"></pm-siblings-step>
      </div>
      <div class="wizard__step" id="stepGuardians" role="tabpanel" aria-labelledby="tabGuardians">
        <pm-guardians-step id="guardiansStep"></pm-guardians-step>
      </div>
      <div class="wizard__step" id="stepCourses" role="tabpanel" aria-labelledby="tabCourses">
        <pm-courses-step id="coursesStep"></pm-courses-step>
      </div>
      <div class="wizard__step" id="stepExtraCurriculars" role="tabpanel" aria-labelledby="tabExtraCurriculars">
        <pm-extra-curriculars-step id="extraCurricularsStep"></pm-extra-curriculars-step>
      </div>
      <div class="wizard__step" id="stepWaitingList" role="tabpanel" aria-labelledby="tabWaitingList">
        <pm-waiting-list-step id="waitingListStep"></pm-waiting-list-step>
        <div class="wizard__step-actions" id="waitingListStepActions" hidden>
          <button type="button" class="wizard__btn wizard__btn--cancel" id="waitingListCloseBtn">Close</button>
          <button type="button" class="wizard__btn wizard__btn--primary" id="waitingListSaveBtn">Save</button>
        </div>
      </div>
      <div class="wizard__actions">
        <button type="button" class="wizard__btn wizard__btn--cancel" id="cancelBtn">Cancel</button>
        <button type="button" class="wizard__btn wizard__btn--secondary" id="previousBtn" hidden>Previous</button>
        <button type="button" class="wizard__btn wizard__btn--primary" id="nextBtn" hidden>Next</button>
        <button type="button" class="wizard__btn wizard__btn--primary" id="saveBtn" hidden>Save</button>
      </div>
    </div>
  </div>
`;

export class PmStudentWizardModal extends HTMLElement {
  private titleEl: HTMLElement | null = null;
  private tabStudent: HTMLButtonElement | null = null;
  private tabSiblings: HTMLButtonElement | null = null;
  private tabGuardians: HTMLButtonElement | null = null;
  private tabCourses: HTMLButtonElement | null = null;
  private tabExtraCurriculars: HTMLButtonElement | null = null;
  private tabWaitingList: HTMLButtonElement | null = null;
  private stepExtraCurricularsEl: HTMLElement | null = null;
  private extraCurricularsStep: PmExtraCurricularsStep | null = null;
  private stepStudentEl: HTMLElement | null = null;
  private stepSiblingsEl: HTMLElement | null = null;
  private stepGuardiansEl: HTMLElement | null = null;
  private stepCoursesEl: HTMLElement | null = null;
  private stepWaitingListEl: HTMLElement | null = null;
  private studentStep: PmStudentStep | null = null;
  private siblingsStep: PmSiblingsStep | null = null;
  private guardiansStep: PmGuardiansStep | null = null;
  private coursesStep: PmCoursesStep | null = null;
  private waitingListStep: PmWaitingListStep | null = null;
  private cancelBtn: HTMLButtonElement | null = null;
  private previousBtn: HTMLButtonElement | null = null;
  private nextBtn: HTMLButtonElement | null = null;
  private saveBtn: HTMLButtonElement | null = null;
  private studentStepActions: HTMLElement | null = null;
  private studentCancelBtn: HTMLButtonElement | null = null;
  private studentSaveBtn: HTMLButtonElement | null = null;
  private waitingListStepActions: HTMLElement | null = null;
  private waitingListCloseBtn: HTMLButtonElement | null = null;
  private waitingListSaveBtn: HTMLButtonElement | null = null;

  private _mode: Mode = 'create';
  private _wizardMode: WizardMode = 'enrolled';
  private _activeStep: Step = 'student';
  private _studentId: string | null = null;
  /** The entry being corrected, in waiting-list edit mode only. */
  private _waitingListEntryId: string | null = null;
  /** The student's own phase, which is what limits the activities the picker offers. */
  private _phase: PhaseType | null = null;
  /** Whether the form's grade is Private, whose student has no phase and is offered every phase. */
  private _privateGrade = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.titleEl = this.shadowRoot!.getElementById('title') as HTMLElement;
    this.tabStudent = this.shadowRoot!.getElementById('tabStudent') as HTMLButtonElement;
    this.tabSiblings = this.shadowRoot!.getElementById('tabSiblings') as HTMLButtonElement;
    this.tabGuardians = this.shadowRoot!.getElementById('tabGuardians') as HTMLButtonElement;
    this.stepStudentEl = this.shadowRoot!.getElementById('stepStudent') as HTMLElement;
    this.stepSiblingsEl = this.shadowRoot!.getElementById('stepSiblings') as HTMLElement;
    this.tabCourses = this.shadowRoot!.getElementById('tabCourses') as HTMLButtonElement;
    this.stepGuardiansEl = this.shadowRoot!.getElementById('stepGuardians') as HTMLElement;
    this.stepCoursesEl = this.shadowRoot!.getElementById('stepCourses') as HTMLElement;
    this.coursesStep = this.shadowRoot!.getElementById('coursesStep') as unknown as PmCoursesStep;
    this.tabExtraCurriculars = this.shadowRoot!.getElementById('tabExtraCurriculars') as HTMLButtonElement;
    this.stepExtraCurricularsEl = this.shadowRoot!.getElementById('stepExtraCurriculars') as HTMLElement;
    this.extraCurricularsStep = this.shadowRoot!.getElementById(
      'extraCurricularsStep',
    ) as unknown as PmExtraCurricularsStep;
    this.tabWaitingList = this.shadowRoot!.getElementById('tabWaitingList') as HTMLButtonElement;
    this.stepWaitingListEl = this.shadowRoot!.getElementById('stepWaitingList') as HTMLElement;
    this.waitingListStep = this.shadowRoot!.getElementById('waitingListStep') as unknown as PmWaitingListStep;
    this.studentStep = this.shadowRoot!.getElementById('studentStep') as unknown as PmStudentStep;
    this.siblingsStep = this.shadowRoot!.getElementById('siblingsStep') as unknown as PmSiblingsStep;
    this.guardiansStep = this.shadowRoot!.getElementById('guardiansStep') as unknown as PmGuardiansStep;
    this.cancelBtn = this.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement;
    this.previousBtn = this.shadowRoot!.getElementById('previousBtn') as HTMLButtonElement;
    this.nextBtn = this.shadowRoot!.getElementById('nextBtn') as HTMLButtonElement;
    this.saveBtn = this.shadowRoot!.getElementById('saveBtn') as HTMLButtonElement;
    this.studentStepActions = this.shadowRoot!.getElementById('studentStepActions') as HTMLElement;
    this.studentCancelBtn = this.shadowRoot!.getElementById('studentCancelBtn') as HTMLButtonElement;
    this.studentSaveBtn = this.shadowRoot!.getElementById('studentSaveBtn') as HTMLButtonElement;
    this.waitingListStepActions = this.shadowRoot!.getElementById('waitingListStepActions') as HTMLElement;
    this.waitingListCloseBtn = this.shadowRoot!.getElementById('waitingListCloseBtn') as HTMLButtonElement;
    this.waitingListSaveBtn = this.shadowRoot!.getElementById('waitingListSaveBtn') as HTMLButtonElement;

    this.waitingListCloseBtn.addEventListener('click', () => this.close());
    this.waitingListSaveBtn.addEventListener('click', () => this.handleWaitingListEntrySave());

    this.tabStudent.addEventListener('click', () => this.goToStep('student'));
    this.tabSiblings.addEventListener('click', () => this.handleSiblingsTabClick());
    this.tabGuardians.addEventListener('click', () => this.handleGuardiansTabClick());
    this.tabCourses.addEventListener('click', () => this.handleCoursesTabClick());
    this.tabExtraCurriculars.addEventListener('click', () => this.handleExtraCurricularsTabClick());
    this.tabWaitingList.addEventListener('click', () => this.handleWaitingListTabClick());
    this.shadowRoot!.addEventListener('student-phase-changed', this.handlePhaseChanged);
    this.cancelBtn.addEventListener('click', () => this.close());
    this.previousBtn.addEventListener('click', () => this.handlePrevious());
    this.nextBtn.addEventListener('click', () => this.handleNext());
    this.saveBtn.addEventListener('click', () => this.handleSave());
    this.studentCancelBtn.addEventListener('click', () => this.close());
    this.studentSaveBtn.addEventListener('click', () => this.handleSave());
  }

  /**
   * `wizardMode` decides which tabs this open presents: 'enrolled' (the
   * Students screen's own modal, default) keeps Courses and
   * Extra-Curriculars; 'waitingList' (the Waiting List page's capture)
   * presents Waiting List in their place — no course-or-extra-curricular rule,
   * since a waiting-list student holds neither.
   */
  openForCreate(candidates: SiblingStudentResult[], wizardMode: WizardMode = 'enrolled'): void {
    this.enrollments = [];
    this.extraCurriculars = [];
    this._mode = 'create';
    this._wizardMode = wizardMode;
    this._studentId = null;
    this.titleEl!.textContent = wizardMode === 'waitingList' ? 'Capture Waiting List Student' : 'Create Student';
    // No phase and no grade until they are chosen on the Student step, which
    // announces them. The reset below fires that announcement, so this is the
    // starting point rather than the last student's phase carrying over.
    this.applyPhase(null, false);
    this.studentStep!.reset();
    this.siblingsStep!.activateForCreate(candidates);
    this.guardiansStep!.activateForCreate();
    if (wizardMode === 'waitingList') {
      this.waitingListStep!.reset();
    } else {
      this.coursesStep!.activateForCreate();
      this.extraCurricularsStep!.activateForCreate(this._phase);
    }
    this.applyWizardModeTabs();
    this.saveBtn!.disabled = false;
    this.studentSaveBtn!.disabled = false;
    this.goToStep('student');
    this.setAttribute('open', '');
  }

  openForEdit(student: StudentResult): void {
    this.enrollments = [];
    this.extraCurriculars = [];
    this._mode = 'edit';
    this._wizardMode = 'enrolled';
    this._waitingListEntryId = null;
    this._studentId = student.studentId;
    this.titleEl!.textContent = `Edit Student: ${student.firstName} ${student.lastName}`;
    // Seeded from the stored student so the tab is already right for this one
    // rather than inheriting whichever was last opened. From here on the form's
    // own field is what governs — setValues below announces it, and every later
    // edit of it does too.
    this.applyPhase((student.phase as PhaseType | null) ?? null, student.grade === 'Private');
    this.studentStep!.setValues(student);
    this.applyWizardModeTabs();
    this.saveBtn!.disabled = false;
    this.studentSaveBtn!.disabled = false;
    this.goToStep('student');
    this.setAttribute('open', '');
  }

  /**
   * Opens the wizard on an existing waiting-list student. Every tab is
   * directly selectable and each saves on its own terms, so there is no
   * Previous/Next sequence to walk and no single overall Save — correcting a
   * name is not a reason to revisit the entry's own fields.
   */
  openForWaitingListEdit(student: StudentResult, entry: WaitingListEditTarget): void {
    this._mode = 'edit';
    this._wizardMode = 'waitingList';
    this._studentId = student.studentId;
    this._waitingListEntryId = entry.waitingListEntryId;
    this.titleEl!.textContent = `Edit Waiting List Student: ${student.firstName} ${student.lastName}`;
    this.applyPhase((student.phase as PhaseType | null) ?? null, student.grade === 'Private');
    this.studentStep!.setValues(student);
    this.waitingListStep!.setValues(entry);
    this.applyWizardModeTabs();
    this.saveBtn!.disabled = false;
    this.studentSaveBtn!.disabled = false;
    this.waitingListSaveBtn!.disabled = false;
    this.goToStep('student');
    this.setAttribute('open', '');
  }

  /** The Waiting List tab's lesson-structure lookup, its picker resolved against on save. */
  set lessonStructures(value: LessonStructure[]) {
    this.waitingListStep!.lessonStructures = value;
  }

  /**
   * Which tabs are present at all — as opposed to `updateFooter`'s
   * enabled/disabled, which governs whether a present tab is clickable during
   * create. Waiting List mode never offers Courses or Extra-Curriculars, and
   * every other mode never offers Waiting List — this is proven directly by
   * `293UC12`/`293UC13`.
   */
  private applyWizardModeTabs(): void {
    const isWaitingList = this._wizardMode === 'waitingList';
    this.tabCourses!.hidden = isWaitingList;
    this.tabExtraCurriculars!.hidden = isWaitingList || !this.offersExtraCurriculars;
    this.tabWaitingList!.hidden = !isWaitingList;
  }

  close(): void {
    this.removeAttribute('open');
  }

  get studentId(): string | null {
    return this._studentId;
  }

  showStudentError(message: string): void {
    this.studentStep!.showError(message);
    this.saveBtn!.disabled = false;
    this.studentSaveBtn!.disabled = false;
  }

  showSiblingsError(message: string): void {
    this.siblingsStep!.showError(message);
  }

  showGuardiansError(message: string): void {
    this.guardiansStep!.showError(message);
  }

  showCoursesError(message: string): void {
    this.coursesStep!.showError(message);
  }

  /**
   * Capture is one atomic request, so a failure there is the whole save
   * failing — the same reasoning `showStudentError` re-enables Save for the
   * enrolled-mode student-tab error. In edit mode the failed save is the
   * tab's own, so its Save is the one that has to come back.
   */
  showWaitingListError(message: string): void {
    this.waitingListStep!.showError(message);
    this.saveBtn!.disabled = false;
    this.studentSaveBtn!.disabled = false;
    this.waitingListSaveBtn!.disabled = false;
  }

  /** Collapses the Guardians step's Add/Edit form panel (if open) and returns to the list view. */
  closeGuardianForm(): void {
    this.guardiansStep!.closeForm();
  }

  /** Collapses the Courses step's enroll form panel (if open) and returns to the list view. */
  closeEnrollmentForm(): void {
    this.coursesStep!.closeForm();
  }

  set siblings(value: SiblingStudentResult[]) {
    this.siblingsStep!.siblings = value;
  }

  set candidates(value: SiblingStudentResult[]) {
    this.siblingsStep!.candidates = value;
  }

  set guardians(value: GuardianResult[]) {
    this.guardiansStep!.guardians = value;
  }

  set guardianRelationships(value: GuardianRelationship[]) {
    this.guardiansStep!.relationships = value;
  }

  set hasMissingSiblingGuardians(value: boolean) {
    this.guardiansStep!.hasMissingSiblingGuardians = value;
  }

  set enrollments(value: EnrollmentResult[]) {
    this.coursesStep!.enrollments = value;
    this.extraCurricularsStep!.holdsCourse = value.length > 0;
  }

  set enrollableCourses(value: EnrollableCourse[]) {
    this.coursesStep!.courses = value;
  }

  set assignableTeachers(value: AssignableTeacher[]) {
    this.coursesStep!.teachers = value;
  }

  /** The activities the student takes part in (edit mode). */
  set extraCurriculars(value: StudentExtraCurricular[]) {
    this.extraCurricularsStep!.assigned = value;
    this.coursesStep!.holdsExtraCurricular = value.length > 0;
  }

  /** The Add Activity picker's options, fetched when the panel is opened. */
  set assignableExtraCurriculars(value: StudentExtraCurricular[]) {
    this.extraCurricularsStep!.assignable = value;
  }

  showExtraCurricularsError(message: string): void {
    this.extraCurricularsStep!.showError(message);
  }

  /** Collapses the Extra-Curriculars tab's Add Activity panel (if open). */
  closeExtraCurricularPanel(): void {
    this.extraCurricularsStep!.closePanel();
  }

  /** Activities staged during create mode, to be assigned once the student is saved. */
  get pendingExtraCurricularIds(): string[] {
    return this.extraCurricularsStep!.pendingExtraCurricularIds;
  }

  /** Enrollments staged during create mode, to be created once the student is saved. */
  get pendingEnrollments() {
    return this.coursesStep!.pendingEnrollments;
  }

  /** Read-only preview of the currently-staged siblings' guardians (create mode only). */
  setInheritedGuardiansForCreate(guardians: GuardianResult[]): void {
    this.guardiansStep!.setInheritedGuardians(guardians);
  }

  /** Guardians staged during create mode, to be created and linked once the student is saved. */
  get pendingGuardians() {
    return this.guardiansStep!.pendingGuardians;
  }

  private handleSiblingsTabClick(): void {
    if (this._mode === 'create') return;
    this.goToStep('siblings');
  }

  private handleGuardiansTabClick(): void {
    if (this._mode === 'create') return;
    this.goToStep('guardians');
  }

  private handleCoursesTabClick(): void {
    if (this._mode === 'create') return;
    this.goToStep('courses');
  }

  private handleWaitingListTabClick(): void {
    if (this._mode === 'create') return;
    this.goToStep('waitingList');
  }

  private handleExtraCurricularsTabClick(): void {
    if (this._mode === 'create' || !this.offersExtraCurriculars) return;
    this.goToStep('extraCurriculars');
  }

  /**
   * Whether the Extra-Curriculars step exists for the form as it stands: a
   * Private-grade student takes part in activities of any phase, and a graded
   * student only once their phase is chosen.
   */
  private get offersExtraCurriculars(): boolean {
    return this._privateGrade || this._phase !== null;
  }

  /**
   * The Student step's grade and phase fields decide whether this wizard has an
   * Extra-Curriculars step at all, and they are followed live: the form's current
   * values, not the saved student's. Editing a graded student into a Private-grade
   * one keeps the step, and clearing a graded student's phase removes it, before
   * anything is saved, which reading the stored row could never do.
   */
  private handlePhaseChanged = (event: Event): void => {
    const { phase, privateGrade } = (event as CustomEvent<{ phase: PhaseType | null; privateGrade: boolean }>).detail;
    if (phase === this._phase && privateGrade === this._privateGrade) return;

    this.applyPhase(phase, privateGrade);
  };

  /**
   * Sets the phase and grade the wizard is shaped around. A student with neither a
   * phase nor the Private grade has no step. Nothing staged or stored is touched
   * by a change here: staged activities survive any change in create mode, and in
   * edit mode the student's stored assignments are never deleted by the form.
   * <para>
   * Whether the tab is offered is `updateFooter`'s to apply, and every path out of
   * here reaches it — directly, or through the `goToStep` below, which ends in it.
   * </para>
   */
  private applyPhase(phase: PhaseType | null, privateGrade: boolean): void {
    this._phase = phase;
    this._privateGrade = privateGrade;
    // Pushed down so the picker's read and the phase note follow the form rather
    // than the stored student.
    this.extraCurricularsStep!.phase = phase;

    // Never leave the wizard showing a step it no longer offers.
    if (!this.offersExtraCurriculars && this._activeStep === 'extraCurriculars') {
      this.goToStep('courses');
      return;
    }

    this.updateFooter();
  }

  /**
   * The last step of the create wizard, which is the one that carries Save. In
   * waiting-list mode that is always Waiting List — there is no holdings rule
   * to route around. In enrolled mode a student offered no Extra-Curriculars step
   * (a graded student with no phase chosen yet) has Courses as theirs.
   */
  private get finalStep(): Step {
    if (this._wizardMode === 'waitingList') return 'waitingList';
    return this.offersExtraCurriculars ? 'extraCurriculars' : 'courses';
  }

  private goToStep(step: Step): void {
    this._activeStep = step;

    this.stepStudentEl!.classList.toggle('wizard__step--visible', step === 'student');
    this.stepSiblingsEl!.classList.toggle('wizard__step--visible', step === 'siblings');
    this.stepGuardiansEl!.classList.toggle('wizard__step--visible', step === 'guardians');
    this.stepCoursesEl!.classList.toggle('wizard__step--visible', step === 'courses');
    this.stepExtraCurricularsEl!.classList.toggle('wizard__step--visible', step === 'extraCurriculars');
    this.stepWaitingListEl!.classList.toggle('wizard__step--visible', step === 'waitingList');
    this.tabStudent!.classList.toggle('wizard__tab--active', step === 'student');
    this.tabSiblings!.classList.toggle('wizard__tab--active', step === 'siblings');
    this.tabGuardians!.classList.toggle('wizard__tab--active', step === 'guardians');
    this.tabCourses!.classList.toggle('wizard__tab--active', step === 'courses');
    this.tabExtraCurriculars!.classList.toggle('wizard__tab--active', step === 'extraCurriculars');
    this.tabWaitingList!.classList.toggle('wizard__tab--active', step === 'waitingList');
    this.tabStudent!.setAttribute('aria-selected', String(step === 'student'));
    this.tabSiblings!.setAttribute('aria-selected', String(step === 'siblings'));
    this.tabGuardians!.setAttribute('aria-selected', String(step === 'guardians'));
    this.tabCourses!.setAttribute('aria-selected', String(step === 'courses'));
    this.tabExtraCurriculars!.setAttribute('aria-selected', String(step === 'extraCurriculars'));
    this.tabWaitingList!.setAttribute('aria-selected', String(step === 'waitingList'));

    if (step === 'siblings' && this._mode === 'edit' && this._studentId) {
      this.siblingsStep!.activate(this._studentId);
      this.dispatchEvent(
        new CustomEvent('siblings-tab-activated', {
          bubbles: true,
          composed: true,
          detail: { studentId: this._studentId },
        }),
      );
    }

    if (step === 'guardians' && this._mode === 'edit' && this._studentId) {
      this.guardiansStep!.activate(this._studentId);
      this.dispatchEvent(
        new CustomEvent('guardians-tab-activated', {
          bubbles: true,
          composed: true,
          detail: { studentId: this._studentId },
        }),
      );
    }

    if (step === 'courses' && this._mode === 'edit' && this._studentId) {
      this.coursesStep!.activate(this._studentId);
      this.dispatchEvent(
        new CustomEvent('courses-tab-activated', {
          bubbles: true,
          composed: true,
          detail: { studentId: this._studentId },
        }),
      );
    }

    if (step === 'extraCurriculars' && this._mode === 'edit' && this._studentId) {
      this.extraCurricularsStep!.activate(this._studentId, this._phase);
      this.dispatchEvent(
        new CustomEvent('extra-curriculars-tab-activated', {
          bubbles: true,
          composed: true,
          detail: { studentId: this._studentId },
        }),
      );
    }

    this.updateFooter();
  }

  /**
   * In edit mode, Siblings and Guardians persist their own changes immediately —
   * the shared Cancel/Save pair only ever acted on the Student tab's fields, which
   * misleadingly implied it covered the other tabs too. So in edit mode, Student's
   * own Cancel/Save live next to its fields instead of the shared footer, and the
   * footer falls back to a plain Close (nothing left for it to cancel) on the other tabs.
   * The Waiting List tab is the same shape as Student — its own Close/Save next to
   * its own fields, since it writes the entry and nothing else does.
   */
  private updateFooter(): void {
    const isCreate = this._mode === 'create';
    const onStudentTab = this._activeStep === 'student';
    const onWaitingListTab = this._activeStep === 'waitingList';
    const editingEntry = !isCreate && onWaitingListTab;

    this.tabSiblings!.disabled = isCreate;
    this.tabGuardians!.disabled = isCreate;
    this.tabCourses!.disabled = isCreate;
    this.tabExtraCurriculars!.disabled = isCreate;
    this.tabWaitingList!.disabled = isCreate;
    // Which tabs exist at all is applyWizardModeTabs's call; Extra-Curriculars'
    // own presence is further narrowed by grade and phase, but only in enrolled
    // mode — waiting-list mode never offers it regardless of either.
    this.tabExtraCurriculars!.hidden = this._wizardMode === 'waitingList' || !this.offersExtraCurriculars;

    // The final step is the one that carries Save and the only one without a
    // Next. That is Extra-Curriculars, except for a graded student with no phase
    // chosen yet, who has no such step — for them Courses is last and carries Save.
    this.previousBtn!.hidden = !(isCreate && this._activeStep !== 'student');
    this.nextBtn!.hidden = !(isCreate && this._activeStep !== this.finalStep);
    this.saveBtn!.hidden = isCreate ? this._activeStep !== this.finalStep : true;
    this.cancelBtn!.hidden = !isCreate && (onStudentTab || onWaitingListTab);
    this.cancelBtn!.textContent = isCreate ? 'Cancel' : 'Close';
    this.studentStepActions!.hidden = isCreate || !onStudentTab;
    this.waitingListStepActions!.hidden = !editingEntry;
  }

  private handlePrevious(): void {
    if (this._activeStep === 'extraCurriculars') {
      this.goToStep('courses');
      return;
    }
    if (this._activeStep === 'waitingList') {
      this.goToStep('guardians');
      return;
    }
    if (this._activeStep === 'courses') {
      this.goToStep('guardians');
      return;
    }
    if (this._activeStep === 'guardians') {
      this.goToStep('siblings');
      return;
    }
    if (this._activeStep === 'siblings') {
      this.goToStep('student');
    }
  }

  private handleNext(): void {
    if (this._activeStep === 'student') {
      if (!this.studentStep!.reportValidity()) return;
      this.goToStep('siblings');
      return;
    }
    if (this._activeStep === 'siblings') {
      this.dispatchEvent(
        new CustomEvent('create-guardians-preview-requested', {
          bubbles: true,
          composed: true,
          detail: { siblingIds: this.siblingsStep!.pendingSiblingIds },
        }),
      );
      this.goToStep('guardians');
      return;
    }
    if (this._activeStep === 'guardians') {
      // Waiting List takes Courses' place in waiting-list mode — the tab
      // order the wizard advances through is Student, Siblings, Guardians,
      // then whichever this mode's final step is.
      this.goToStep(this._wizardMode === 'waitingList' ? 'waitingList' : 'courses');
      return;
    }
    if (this._activeStep === 'courses') {
      // Courses is the last step for a student offered no Extra-Curriculars step,
      // so there is nowhere forward to go — Next is hidden for them anyway. The
      // phase and grade are already current: the Student step announces every
      // change to them.
      if (!this.offersExtraCurriculars) return;

      this.goToStep('extraCurriculars');
    }
  }

  /**
   * The Waiting List tab's own save, scoped to the entry's fields. It does not
   * touch the Student tab: correcting an occurrence type is not a reason to
   * also require a valid name, and the two are separate writes on the server.
   */
  private handleWaitingListEntrySave(): void {
    if (!this.waitingListStep!.reportValidity()) return;

    let input;
    try {
      input = this.waitingListStep!.getValues();
    } catch (err) {
      this.showWaitingListError(err instanceof Error ? err.message : 'An unexpected error occurred');
      return;
    }

    this.waitingListSaveBtn!.disabled = true;
    this.dispatchEvent(
      new CustomEvent('waiting-list-entry-update-requested', {
        bubbles: true,
        composed: true,
        detail: { waitingListEntryId: this._waitingListEntryId, input },
      }),
    );
  }

  private handleSave(): void {
    if (!this.studentStep!.reportValidity()) {
      this.goToStep('student');
      return;
    }

    if (this._mode === 'create' && this._wizardMode === 'waitingList') {
      if (!this.waitingListStep!.reportValidity()) {
        this.goToStep('waitingList');
        return;
      }

      // getValues() resolves the chosen triple against the fetched
      // lesson-structure lookup and throws if nothing matches — reachable in
      // practice only if that lookup never loaded (#299), not through any
      // combination the form itself can select. Caught here rather than left
      // to propagate uncaught out of a click handler, which would leave Save
      // disabled with no dispatch and no visible error at all.
      let waitingListInput;
      try {
        waitingListInput = this.waitingListStep!.getValues();
      } catch (err) {
        this.showWaitingListError(err instanceof Error ? err.message : 'An unexpected error occurred');
        return;
      }

      const input = this.studentStep!.getValues();
      this.saveBtn!.disabled = true;
      this.studentSaveBtn!.disabled = true;
      this.dispatchEvent(
        new CustomEvent('waiting-list-capture-requested', {
          bubbles: true,
          composed: true,
          detail: {
            input,
            pendingSiblingIds: this.siblingsStep!.pendingSiblingIds,
            pendingGuardians: this.guardiansStep!.pendingGuardians,
            waitingListInput,
          },
        }),
      );
      return;
    }

    // A student must hold a course or an extra-curricular, so the create flow
    // cannot save one with neither staged — stated on the step that carries Save
    // rather than failing silently. Waiting-list mode carries no such rule, hence
    // the early return above never reaches here for it.
    if (
      this._mode === 'create' &&
      !this.coursesStep!.hasPendingEnrollments &&
      !this.extraCurricularsStep!.hasPendingExtraCurriculars
    ) {
      const finalStep = this.finalStep;
      this.goToStep(finalStep);
      const step = finalStep === 'extraCurriculars' ? this.extraCurricularsStep! : this.coursesStep!;
      step.showError(COURSE_OR_EXTRA_CURRICULAR_TO_SAVE);
      return;
    }

    const conflict = phaseConflictMessage(
      this.studentStep!.getValues().phase,
      this.extraCurricularsStep!.heldExtraCurriculars,
    );
    if (conflict) {
      this.goToStep('student');
      this.studentStep!.showPhaseConflict(conflict);
      return;
    }
    this.studentStep!.clearError();

    const input = this.studentStep!.getValues();
    this.saveBtn!.disabled = true;
    this.studentSaveBtn!.disabled = true;

    if (this._mode === 'create') {
      this.dispatchEvent(
        new CustomEvent('student-create-requested', {
          bubbles: true,
          composed: true,
          detail: {
            input,
            pendingSiblingIds: this.siblingsStep!.pendingSiblingIds,
            pendingGuardians: this.guardiansStep!.pendingGuardians,
            pendingEnrollments: this.coursesStep!.pendingEnrollments,
            pendingExtraCurricularIds: this.extraCurricularsStep!.pendingExtraCurricularIds,
          },
        }),
      );
    } else {
      this.dispatchEvent(
        new CustomEvent('student-update-requested', {
          bubbles: true,
          composed: true,
          detail: { studentId: this._studentId, input },
        }),
      );
    }
  }
}

customElements.define('pm-student-wizard-modal', PmStudentWizardModal);
