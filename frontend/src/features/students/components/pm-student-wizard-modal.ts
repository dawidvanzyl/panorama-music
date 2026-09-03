import './pm-student-step';
import './pm-siblings-step';
import './pm-guardians-step';
import './pm-courses-step';
import './pm-extra-curriculars-step';
import './pm-waiting-list-step';
import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import { AT_LEAST_ONE_COURSE_TO_SAVE } from './pm-courses-step';
import type { StudentResult } from '../services/students';
import type { GuardianRelationship, GuardianResult } from '../services/guardians';
import type { AssignableTeacher, EnrollableCourse, EnrollmentResult } from '../services/enrollments';
import type { PhaseType, StudentExtraCurricular } from '../services/student-extra-curriculars';
import type { LessonStructure } from '../services/waiting-list';
import type { PmStudentStep } from './pm-student-step';
import type { PmSiblingsStep } from './pm-siblings-step';
import type { PmGuardiansStep } from './pm-guardians-step';
import type { PmCoursesStep } from './pm-courses-step';
import type { PmExtraCurricularsStep } from './pm-extra-curriculars-step';
import type { PmWaitingListStep } from './pm-waiting-list-step';

type Mode = 'create' | 'edit';
type Step = 'student' | 'siblings' | 'guardians' | 'courses' | 'extraCurriculars' | 'waitingList';
/**
 * Which tabs the wizard presents. 'enrolled' is the Students screen's own
 * modal, unchanged — Courses and Extra-Curriculars, with the "at least one
 * course" rule intact. 'waitingList' is the Waiting List page's capture mode —
 * Waiting List in their place, and no course rule at all (a waiting-list
 * student holds no course).
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

  private _mode: Mode = 'create';
  private _wizardMode: WizardMode = 'enrolled';
  private _activeStep: Step = 'student';
  private _studentId: string | null = null;
  /** The student's own phase, which is what limits the activities the picker offers. */
  private _phase: PhaseType | null = null;

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
   * presents Waiting List in their place — no course rule, since a
   * waiting-list student holds no course.
   */
  openForCreate(candidates: StudentResult[], wizardMode: WizardMode = 'enrolled'): void {
    this._mode = 'create';
    this._wizardMode = wizardMode;
    this._studentId = null;
    this.titleEl!.textContent = wizardMode === 'waitingList' ? 'Capture Waiting List Student' : 'Create Student';
    // No phase until one is chosen on the Student step, which announces it. The
    // reset below fires that announcement, so this is the starting point rather
    // than the last student's phase carrying over.
    this.applyPhase(null);
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
    this._mode = 'edit';
    this._wizardMode = 'enrolled';
    this._studentId = student.studentId;
    this.titleEl!.textContent = `Edit Student: ${student.firstName} ${student.lastName}`;
    // Seeded from the stored student so the tab is already right for this one
    // rather than inheriting whichever was last opened. From here on the form's
    // own field is what governs — setValues below announces it, and every later
    // edit of it does too.
    this.applyPhase((student.phase as PhaseType | null) ?? null);
    this.studentStep!.setValues(student);
    this.applyWizardModeTabs();
    this.saveBtn!.disabled = false;
    this.studentSaveBtn!.disabled = false;
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
    this.tabExtraCurriculars!.hidden = isWaitingList || this._phase === null;
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
   * Capture is one atomic request, so a failure here is the whole save
   * failing — the same reasoning `showStudentError` re-enables Save for the
   * enrolled-mode student-tab error, applied to waiting-list mode's own last
   * step instead.
   */
  showWaitingListError(message: string): void {
    this.waitingListStep!.showError(message);
    this.saveBtn!.disabled = false;
    this.studentSaveBtn!.disabled = false;
  }

  /** Collapses the Guardians step's Add/Edit form panel (if open) and returns to the list view. */
  closeGuardianForm(): void {
    this.guardiansStep!.closeForm();
  }

  /** Collapses the Courses step's enroll form panel (if open) and returns to the list view. */
  closeEnrollmentForm(): void {
    this.coursesStep!.closeForm();
  }

  set siblings(value: StudentResult[]) {
    this.siblingsStep!.siblings = value;
  }

  set candidates(value: StudentResult[]) {
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
    if (this._mode === 'create' || !this._phase) return;
    this.goToStep('extraCurriculars');
  }

  /**
   * The Student step's phase field decides whether this wizard has an
   * Extra-Curriculars step at all, and it is followed live: the form's current
   * value, not the saved student's. Editing a Private-grade student into a graded
   * one makes the step available before anything is saved, which reading the
   * stored row could never do.
   */
  private handlePhaseChanged = (event: Event): void => {
    const { phase } = (event as CustomEvent<{ phase: PhaseType | null }>).detail;
    if (phase === this._phase) return;

    this.applyPhase(phase);
  };

  /**
   * Sets the phase the wizard is shaped around. Losing the phase removes the step:
   * in create mode nothing has been written, so what was staged is discarded
   * outright; in edit mode the tab goes now but the student's stored assignments
   * do not — those are deleted when the student is saved, so cancelling the edit
   * leaves them intact.
   * <para>
   * Whether the tab is offered is `updateFooter`'s to apply, and every path out of
   * here reaches it — directly, or through the `goToStep` below, which ends in it.
   * </para>
   */
  private applyPhase(phase: PhaseType | null): void {
    this._phase = phase;
    // Pushed down so the panel's non-editable Phase value and the picker's read
    // both follow the form rather than the stored student.
    this.extraCurricularsStep!.phase = phase;

    if (phase === null) {
      if (this._mode === 'create') this.extraCurricularsStep!.discardStaged();
      // Never leave the wizard showing a step it no longer offers.
      if (this._activeStep === 'extraCurriculars') {
        this.goToStep('courses');
        return;
      }
    }

    this.updateFooter();
  }

  /**
   * The last step of the create wizard, which is the one that carries Save. In
   * waiting-list mode that is always Waiting List — there is no course rule to
   * route around. In enrolled mode a student with no phase has no
   * Extra-Curriculars step, so Courses is theirs — which is how a
   * Private-grade student gets Save on Courses, their grade having cleared
   * the phase field.
   */
  private get finalStep(): Step {
    if (this._wizardMode === 'waitingList') return 'waitingList';
    return this._phase ? 'extraCurriculars' : 'courses';
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
   */
  private updateFooter(): void {
    const isCreate = this._mode === 'create';
    const onStudentTab = this._activeStep === 'student';

    this.tabSiblings!.disabled = isCreate;
    this.tabGuardians!.disabled = isCreate;
    this.tabCourses!.disabled = isCreate;
    this.tabExtraCurriculars!.disabled = isCreate;
    this.tabWaitingList!.disabled = isCreate;
    // Which tabs exist at all is applyWizardModeTabs's call; Extra-Curriculars'
    // own presence is further narrowed by phase, but only in enrolled mode —
    // waiting-list mode never offers it regardless of phase.
    this.tabExtraCurriculars!.hidden = this._wizardMode === 'waitingList' || this._phase === null;

    // The final step is the one that carries Save and the only one without a
    // Next. That is Extra-Curriculars, except for a Private-grade student, who
    // has no such step — for them Courses is last and carries Save.
    this.previousBtn!.hidden = !(isCreate && this._activeStep !== 'student');
    this.nextBtn!.hidden = !(isCreate && this._activeStep !== this.finalStep);
    this.saveBtn!.hidden = isCreate ? this._activeStep !== this.finalStep : true;
    this.cancelBtn!.hidden = !isCreate && onStudentTab;
    this.cancelBtn!.textContent = isCreate ? 'Cancel' : 'Close';
    this.studentStepActions!.hidden = isCreate || !onStudentTab;
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
      // Courses is the last step for a student with no phase, so there is nowhere
      // forward to go — Next is hidden for them anyway. The phase itself is
      // already current: the Student step announces every change to it.
      if (!this._phase) return;

      this.goToStep('extraCurriculars');
    }
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
            waitingListInput: this.waitingListStep!.getValues(),
          },
        }),
      );
      return;
    }

    // A student must be enrolled in at least one course, so the create flow
    // cannot save one with nothing staged — stated on the Courses tab rather
    // than failing silently. Waiting-list mode carries no such rule, hence the
    // early return above never reaches here for it.
    if (this._mode === 'create' && !this.coursesStep!.hasPendingEnrollments) {
      this.goToStep('courses');
      this.coursesStep!.showError(AT_LEAST_ONE_COURSE_TO_SAVE);
      return;
    }

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
