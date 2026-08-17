import './pm-enrollment-form';
import './pm-enrollment-list';
import type { AssignableTeacher, EnrollableCourse, EnrollmentInput, EnrollmentResult } from '../services/enrollments';
import type { PmEnrollmentForm } from './pm-enrollment-form';
import type { PmEnrollmentList } from './pm-enrollment-list';

type Mode = 'inactive' | 'create' | 'edit';

/** Stated rather than failing silently — the create wizard cannot save without one. */
export const AT_LEAST_ONE_COURSE_TO_SAVE =
  'A student must be enrolled in at least one course before they can be saved.';

export const AT_LEAST_ONE_COURSE = 'A student must be enrolled in at least one course.';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .courses-step__section {
      display: none;
      flex-direction: column;
      gap: 16px;
    }
    .courses-step__section--visible {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .courses-step__toolbar {
      display: flex;
      flex-shrink: 0;
      gap: 12px;
      justify-content: flex-end;
    }
    .courses-step__btn {
      height: 36px;
      padding: 0 16px;
      border-radius: var(--pm-radius);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      background: var(--pm-accent);
      color: #fff;
    }
    .courses-step__btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .courses-step__form-panel {
      flex-shrink: 0;
      max-height: 0;
      overflow: hidden;
      transition: max-height 220ms ease;
    }
    .courses-step__form-panel--expanded {
      /* A generous fixed ceiling above the form's actual content height, for the
         same reason the Guardians step's panel carries one. */
      max-height: 420px;
    }
    .courses-step__form-panel pm-enrollment-form {
      display: block;
      padding-top: 12px;
    }
    pm-enrollment-list#enrollmentList {
      flex: 1;
      min-height: 0;
    }
    .courses-step__message {
      flex-shrink: 0;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      font-size: 13px;
      display: none;
    }
    .courses-step__message--error {
      display: block;
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="courses-step__section" id="section">
    <div class="courses-step__message" id="message"></div>
    <div class="courses-step__toolbar" id="listToolbar">
      <button type="button" class="courses-step__btn" id="enrollBtn">Enroll in Course</button>
    </div>
    <div class="courses-step__form-panel" id="formPanel">
      <pm-enrollment-form id="enrollmentForm"></pm-enrollment-form>
    </div>
    <pm-enrollment-list id="enrollmentList"></pm-enrollment-list>
  </div>
`;

export class PmCoursesStep extends HTMLElement {
  private section: HTMLElement | null = null;
  private listToolbar: HTMLElement | null = null;
  private enrollBtn: HTMLButtonElement | null = null;
  private formPanel: HTMLElement | null = null;
  private message: HTMLElement | null = null;
  private enrollmentList: PmEnrollmentList | null = null;
  private enrollmentForm: PmEnrollmentForm | null = null;

  private _mode: Mode = 'inactive';
  private _studentId: string | null = null;
  private _courses: EnrollableCourse[] = [];
  private _teachers: AssignableTeacher[] = [];
  private _pendingEnrollments: EnrollmentResult[] = [];
  private _pendingCounter = 0;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.section = this.shadowRoot!.getElementById('section') as HTMLElement;
    this.listToolbar = this.shadowRoot!.getElementById('listToolbar') as HTMLElement;
    this.enrollBtn = this.shadowRoot!.getElementById('enrollBtn') as HTMLButtonElement;
    this.formPanel = this.shadowRoot!.getElementById('formPanel') as HTMLElement;
    this.message = this.shadowRoot!.getElementById('message') as HTMLElement;
    this.enrollmentList = this.shadowRoot!.getElementById('enrollmentList') as unknown as PmEnrollmentList;
    this.enrollmentForm = this.shadowRoot!.getElementById('enrollmentForm') as unknown as PmEnrollmentForm;

    this.formPanel.setAttribute('inert', '');

    this.enrollBtn.addEventListener('click', this.handleEnrollClicked);
    this.shadowRoot!.addEventListener('enrollment-form-submitted', this.handleFormSubmitted);
    this.shadowRoot!.addEventListener('enrollment-form-cancelled', this.handleFormCancelled);
    this.shadowRoot!.addEventListener('enrollment-edit-started', this.handleEditStarted);
    this.shadowRoot!.addEventListener('enrollment-edit-cancelled', this.handleEditCancelled);
    this.shadowRoot!.addEventListener('enrollment-edit-saved', this.handleEditSaved);
    this.shadowRoot!.addEventListener('enrollment-remove-clicked', this.handleRemoveClicked);
  }

  disconnectedCallback(): void {
    this.enrollBtn?.removeEventListener('click', this.handleEnrollClicked);
    this.shadowRoot!.removeEventListener('enrollment-form-submitted', this.handleFormSubmitted);
    this.shadowRoot!.removeEventListener('enrollment-form-cancelled', this.handleFormCancelled);
    this.shadowRoot!.removeEventListener('enrollment-edit-started', this.handleEditStarted);
    this.shadowRoot!.removeEventListener('enrollment-edit-cancelled', this.handleEditCancelled);
    this.shadowRoot!.removeEventListener('enrollment-edit-saved', this.handleEditSaved);
    this.shadowRoot!.removeEventListener('enrollment-remove-clicked', this.handleRemoveClicked);
  }

  /** The course catalogue the enroll form and the row edit offer. */
  set courses(value: EnrollableCourse[]) {
    this._courses = value;
    this.enrollmentForm!.courses = value;
    this.enrollmentList!.courses = value;
  }

  set teachers(value: AssignableTeacher[]) {
    this._teachers = value;
    this.enrollmentForm!.teachers = value;
    this.enrollmentList!.teachers = value;
  }

  /** Create mode: the student has no id yet, so enrollments are staged in memory until Save. */
  activateForCreate(): void {
    this._mode = 'create';
    this._studentId = null;
    this._pendingEnrollments = [];
    this._pendingCounter = 0;
    this.clearError();
    this.enrollmentList!.isPersisted = false;
    this.enrollmentForm!.isPersisted = false;
    this.showListView();
    this.renderPendingList();

    this.section!.classList.add('courses-step__section--visible');
  }

  /** Edit mode: enrollment management for an existing student. */
  activate(studentId: string): void {
    this._mode = 'edit';
    this._studentId = studentId;
    this.clearError();
    this.enrollmentList!.isPersisted = true;
    this.enrollmentForm!.isPersisted = true;
    this.showListView();

    this.enrollmentList!.enrollments = [];

    this.section!.classList.add('courses-step__section--visible');
  }

  /**
   * Enrollments the student currently holds (edit mode), pushed in by the page
   * after a fetch. Data-only — it does not touch the form panel, for the same
   * reason the Guardians step's list setter does not: a background refresh can
   * race a form the user just opened.
   */
  set enrollments(value: EnrollmentResult[]) {
    this.enrollmentList!.enrollments = value;
  }

  /** Enrollments staged during create mode, to be created once the student is saved. */
  get pendingEnrollments(): EnrollmentInput[] {
    return this._pendingEnrollments.map((enrollment) => this.toInput(enrollment));
  }

  /** Whether the create wizard has the one enrollment a student must be saved with. */
  get hasPendingEnrollments(): boolean {
    return this._pendingEnrollments.length > 0;
  }

  /** Collapses the form panel (if open) and returns to the list view. */
  closeForm(): void {
    this.showListView();
  }

  showError(message: string): void {
    this.message!.textContent = message;
    this.message!.classList.add('courses-step__message--error');
  }

  clearError(): void {
    this.message!.textContent = '';
    this.message!.className = 'courses-step__message';
  }

  private renderPendingList(): void {
    this.enrollmentList!.enrollments = [...this._pendingEnrollments];
  }

  private showListView(): void {
    this.collapseFormPanelOnly();
    this.enrollBtn!.hidden = false;
    this.enrollmentList!.exitEditMode();
    this.listToolbar!.hidden = false;
    this.enrollmentList!.hidden = false;
  }

  private expandFormPanel(): void {
    this.formPanel!.classList.add('courses-step__form-panel--expanded');
    this.formPanel!.removeAttribute('inert');
    this.enrollBtn!.hidden = true;
  }

  private collapseFormPanelOnly(): void {
    this.formPanel!.classList.remove('courses-step__form-panel--expanded');
    this.formPanel!.setAttribute('inert', '');
  }

  private handleEnrollClicked = (): void => {
    this.clearError();
    this.enrollmentForm!.resetForAdd();
    this.expandFormPanel();
  };

  private handleFormSubmitted = (event: Event): void => {
    const { input } = (event as CustomEvent<{ input: EnrollmentInput }>).detail;

    if (this._mode === 'create') {
      this.addPendingEnrollment(input);
      this.clearError();
      this.showListView();
      this.renderPendingList();
      return;
    }

    this.dispatchEvent(
      new CustomEvent('enrollment-add-requested', {
        bubbles: true,
        composed: true,
        detail: { studentId: this._studentId, input },
      }),
    );
  };

  private handleFormCancelled = (): void => {
    this.showListView();
  };

  private handleEditStarted = (): void => {
    // A row edit and the enroll form are mutually exclusive; collapsing here is
    // a no-op if the panel was not open.
    this.collapseFormPanelOnly();
    this.enrollBtn!.hidden = true;
  };

  private handleEditCancelled = (): void => {
    this.showListView();
  };

  /** Only staged rows offer Change, so a saved edit is always an in-memory one. */
  private handleEditSaved = (event: Event): void => {
    const { studentCourseId, input } = (event as CustomEvent<{ studentCourseId: string; input: EnrollmentInput }>)
      .detail;

    this.updatePendingEnrollment(studentCourseId, input);
    this.showListView();
    this.renderPendingList();
  };

  /**
   * The only staged enrollment is not removable — dropping it would leave a
   * student that cannot be saved, so the requirement is stated instead.
   */
  private handleRemoveClicked = (event: Event): void => {
    const { enrollment } = (event as CustomEvent<{ enrollment: EnrollmentResult }>).detail;

    if (this._pendingEnrollments.length <= 1) {
      this.showError(AT_LEAST_ONE_COURSE);
      return;
    }

    this._pendingEnrollments = this._pendingEnrollments.filter(
      (staged) => staged.studentCourseId !== enrollment.studentCourseId,
    );
    this.clearError();
    this.renderPendingList();
  };

  /**
   * A staged enrollment is rendered by the same list as a persisted one, so it
   * is built into the same shape — the course and teacher detail resolved from
   * the lookups the form chose from, and a local id standing in until the real
   * one comes back from the server.
   */
  private addPendingEnrollment(input: EnrollmentInput): void {
    this._pendingCounter += 1;
    this._pendingEnrollments.push(this.toStaged(`pending-${this._pendingCounter}`, input));
  }

  private updatePendingEnrollment(studentCourseId: string, input: EnrollmentInput): void {
    const index = this._pendingEnrollments.findIndex((staged) => staged.studentCourseId === studentCourseId);
    if (index === -1) return;

    this._pendingEnrollments[index] = this.toStaged(studentCourseId, input);
  }

  private toStaged(studentCourseId: string, input: EnrollmentInput): EnrollmentResult {
    const course = this._courses.find((c) => c.courseId === input.courseId);
    const teacher = this._teachers.find((t) => t.teacherId === input.teacherId);

    return {
      studentCourseId,
      studentId: '',
      courseId: input.courseId,
      courseType: course?.courseType ?? 'Theory',
      lessonType: course?.lessonType ?? 'Group',
      durationType: course?.durationType ?? 'Hour',
      occurrenceType: course?.occurrenceType ?? 'DuringSchool',
      teacherId: input.teacherId,
      teacherFirstName: teacher?.firstName ?? '',
      teacherSurname: teacher?.surname ?? '',
      instrumentType: input.instrumentType,
      stepType: input.stepType,
      enrolledDate: input.enrolledDate,
    };
  }

  private toInput(enrollment: EnrollmentResult): EnrollmentInput {
    return {
      courseId: enrollment.courseId,
      teacherId: enrollment.teacherId,
      instrumentType: enrollment.instrumentType,
      stepType: enrollment.stepType,
      enrolledDate: enrollment.enrolledDate,
    };
  }
}

customElements.define('pm-courses-step', PmCoursesStep);
