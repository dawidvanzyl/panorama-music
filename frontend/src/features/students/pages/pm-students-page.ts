import '../components/pm-student-filter-bar';
import '../components/pm-students-table';
import '../components/pm-student-wizard-modal';
import '../components/pm-delete-student-modal';
import '../components/pm-delete-guardian-modal';
import '../components/pm-withdraw-enrollment-modal';
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  getSiblings,
  addSibling,
  removeSibling,
  clearStudentsCache,
  StudentsError,
  type StudentInput,
  type StudentResult,
} from '../services/students';
import {
  getGuardians,
  addGuardian,
  updateGuardian,
  unlinkGuardian,
  deleteGuardian,
  isGuardianShared,
  syncGuardians,
  getGuardianRelationships,
  getMissingSiblingGuardians,
  peekCachedGuardianRelationships,
  GuardiansError,
  type GuardianInput,
  type GuardianResult,
} from '../services/guardians';
import {
  getStudentCourses,
  enrollStudent,
  updateEnrollment,
  withdrawEnrollment,
  getEnrollableCourses,
  getAssignableTeachers,
  EnrollmentsError,
  type EnrollmentInput,
  type EnrollmentResult,
  type EnrollmentUpdateInput,
} from '../services/enrollments';
import {
  getStudentExtraCurriculars,
  getAssignableExtraCurricularsByPhase,
  assignExtraCurricular,
  removeExtraCurricular,
  StudentExtraCurricularsError,
  type PhaseType,
} from '../services/student-extra-curriculars';
import { courseLabel } from '../components/enrollment-options';
import { filterStudents, type StudentFilters } from '../services/filter-students';
import type { PmStudentsTable } from '../components/pm-students-table';
import type { PmStudentWizardModal } from '../components/pm-student-wizard-modal';
import type { PmDeleteStudentModal } from '../components/pm-delete-student-modal';
import type { PmDeleteGuardianModal, GuardianDeleteScope } from '../components/pm-delete-guardian-modal';
import type { PmWithdrawEnrollmentModal } from '../components/pm-withdraw-enrollment-modal';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      flex: 1;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .students-page__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .students-page__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--pm-text);
      margin: 0;
    }
    .students-page__create-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 24px;
      border: none;
      border-radius: 9999px;
      background: var(--pm-accent);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .students-page__create-btn:hover {
      filter: brightness(1.1);
    }
    .students-page__error {
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
      font-size: 13px;
      display: none;
    }
    .students-page__error--visible {
      display: block;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="students-page__container">
    <div class="students-page__header">
      <h1 class="students-page__title">Students</h1>
      <button type="button" class="students-page__create-btn" id="createBtn">Create Student</button>
    </div>
    <pm-student-filter-bar id="filterBar"></pm-student-filter-bar>
    <div class="students-page__error" id="error"></div>
    <pm-students-table id="studentsTable"></pm-students-table>
  </div>
  <pm-student-wizard-modal id="wizardModal"></pm-student-wizard-modal>
  <pm-delete-student-modal id="deleteModal"></pm-delete-student-modal>
  <pm-delete-guardian-modal id="deleteGuardianModal"></pm-delete-guardian-modal>
  <pm-withdraw-enrollment-modal id="withdrawEnrollmentModal"></pm-withdraw-enrollment-modal>
`;

export class PmStudentsPage extends HTMLElement {
  private studentsTable: PmStudentsTable | null = null;
  private wizardModal: PmStudentWizardModal | null = null;
  private deleteModal: PmDeleteStudentModal | null = null;
  private deleteGuardianModal: PmDeleteGuardianModal | null = null;
  private withdrawEnrollmentModal: PmWithdrawEnrollmentModal | null = null;
  private createBtn: HTMLButtonElement | null = null;
  private errorBanner: HTMLElement | null = null;
  private _allStudents: StudentResult[] = [];
  private _currentFilters: StudentFilters = {};

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.studentsTable = this.shadowRoot!.getElementById('studentsTable') as unknown as PmStudentsTable;
    this.wizardModal = this.shadowRoot!.getElementById('wizardModal') as unknown as PmStudentWizardModal;
    this.deleteModal = this.shadowRoot!.getElementById('deleteModal') as unknown as PmDeleteStudentModal;
    this.deleteGuardianModal = this.shadowRoot!.getElementById(
      'deleteGuardianModal',
    ) as unknown as PmDeleteGuardianModal;
    this.withdrawEnrollmentModal = this.shadowRoot!.getElementById(
      'withdrawEnrollmentModal',
    ) as unknown as PmWithdrawEnrollmentModal;
    this.createBtn = this.shadowRoot!.getElementById('createBtn') as HTMLButtonElement;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;

    this.createBtn.addEventListener('click', this.handleCreateClick);
    this.shadowRoot!.addEventListener('filter-changed', this.handleFilterChanged);
    this.shadowRoot!.addEventListener('student-create-requested', this.handleCreateRequested);
    this.shadowRoot!.addEventListener('student-update-requested', this.handleUpdateRequested);
    this.shadowRoot!.addEventListener('student-edit-requested', this.handleEditRequested);
    this.shadowRoot!.addEventListener('student-delete-requested', this.handleDeleteRequested);
    this.shadowRoot!.addEventListener('student-delete-confirmed', this.handleDeleteConfirmed);
    this.shadowRoot!.addEventListener('student-row-expanded', this.handleRowExpanded);
    this.shadowRoot!.addEventListener('siblings-tab-activated', this.handleSiblingsTabActivated);
    this.shadowRoot!.addEventListener('sibling-add-requested', this.handleSiblingAddRequested);
    this.shadowRoot!.addEventListener('sibling-remove-requested', this.handleSiblingRemoveRequested);
    this.shadowRoot!.addEventListener('guardians-tab-activated', this.handleGuardiansTabActivated);
    this.shadowRoot!.addEventListener('create-guardians-preview-requested', this.handleCreateGuardiansPreviewRequested);
    this.shadowRoot!.addEventListener('guardian-add-requested', this.handleGuardianAddRequested);
    this.shadowRoot!.addEventListener('guardian-update-requested', this.handleGuardianUpdateRequested);
    this.shadowRoot!.addEventListener('guardian-delete-requested', this.handleGuardianDeleteRequested);
    this.shadowRoot!.addEventListener('guardian-delete-confirmed', this.handleGuardianDeleteConfirmed);
    this.shadowRoot!.addEventListener('guardians-sync-requested', this.handleGuardiansSyncRequested);
    this.shadowRoot!.addEventListener('courses-tab-activated', this.handleCoursesTabActivated);
    this.shadowRoot!.addEventListener('enrollment-add-requested', this.handleEnrollmentAddRequested);
    this.shadowRoot!.addEventListener('enrollment-update-requested', this.handleEnrollmentUpdateRequested);
    this.shadowRoot!.addEventListener('enrollment-withdraw-requested', this.handleEnrollmentWithdrawRequested);
    this.shadowRoot!.addEventListener('enrollment-withdraw-confirmed', this.handleEnrollmentWithdrawConfirmed);
    this.shadowRoot!.addEventListener('extra-curriculars-tab-activated', this.handleExtraCurricularsTabActivated);
    this.shadowRoot!.addEventListener('extra-curriculars-assignable-requested', this.handleAssignableRequested);
    this.shadowRoot!.addEventListener('extra-curricular-assign-requested', this.handleExtraCurricularAssignRequested);
    this.shadowRoot!.addEventListener('extra-curricular-remove-requested', this.handleExtraCurricularRemoveRequested);

    clearStudentsCache();
    void this.loadStudents();
    void this.loadGuardianRelationships();
    void this.loadEnrollmentLookups();
  }

  disconnectedCallback(): void {
    this.createBtn?.removeEventListener('click', this.handleCreateClick);
    this.shadowRoot!.removeEventListener('filter-changed', this.handleFilterChanged);
    this.shadowRoot!.removeEventListener('student-create-requested', this.handleCreateRequested);
    this.shadowRoot!.removeEventListener('student-update-requested', this.handleUpdateRequested);
    this.shadowRoot!.removeEventListener('student-edit-requested', this.handleEditRequested);
    this.shadowRoot!.removeEventListener('student-delete-requested', this.handleDeleteRequested);
    this.shadowRoot!.removeEventListener('student-delete-confirmed', this.handleDeleteConfirmed);
    this.shadowRoot!.removeEventListener('student-row-expanded', this.handleRowExpanded);
    this.shadowRoot!.removeEventListener('siblings-tab-activated', this.handleSiblingsTabActivated);
    this.shadowRoot!.removeEventListener('sibling-add-requested', this.handleSiblingAddRequested);
    this.shadowRoot!.removeEventListener('sibling-remove-requested', this.handleSiblingRemoveRequested);
    this.shadowRoot!.removeEventListener('guardians-tab-activated', this.handleGuardiansTabActivated);
    this.shadowRoot!.removeEventListener(
      'create-guardians-preview-requested',
      this.handleCreateGuardiansPreviewRequested,
    );
    this.shadowRoot!.removeEventListener('guardian-add-requested', this.handleGuardianAddRequested);
    this.shadowRoot!.removeEventListener('guardian-update-requested', this.handleGuardianUpdateRequested);
    this.shadowRoot!.removeEventListener('guardian-delete-requested', this.handleGuardianDeleteRequested);
    this.shadowRoot!.removeEventListener('guardian-delete-confirmed', this.handleGuardianDeleteConfirmed);
    this.shadowRoot!.removeEventListener('guardians-sync-requested', this.handleGuardiansSyncRequested);
    this.shadowRoot!.removeEventListener('courses-tab-activated', this.handleCoursesTabActivated);
    this.shadowRoot!.removeEventListener('enrollment-add-requested', this.handleEnrollmentAddRequested);
    this.shadowRoot!.removeEventListener('enrollment-update-requested', this.handleEnrollmentUpdateRequested);
    this.shadowRoot!.removeEventListener('enrollment-withdraw-requested', this.handleEnrollmentWithdrawRequested);
    this.shadowRoot!.removeEventListener('enrollment-withdraw-confirmed', this.handleEnrollmentWithdrawConfirmed);
    this.shadowRoot!.removeEventListener('extra-curriculars-tab-activated', this.handleExtraCurricularsTabActivated);
    this.shadowRoot!.removeEventListener('extra-curriculars-assignable-requested', this.handleAssignableRequested);
    this.shadowRoot!.removeEventListener(
      'extra-curricular-assign-requested',
      this.handleExtraCurricularAssignRequested,
    );
    this.shadowRoot!.removeEventListener(
      'extra-curricular-remove-requested',
      this.handleExtraCurricularRemoveRequested,
    );
  }

  private handleCreateClick = (): void => {
    this.openWizardWhenGuardianRelationshipsReady(() => this.wizardModal!.openForCreate(this._allStudents));
  };

  /**
   * Opens the wizard synchronously when the guardian-relationships lookup is
   * already cached (the common case — loaded eagerly on page mount), so the
   * existing synchronous open-then-fill flows are unaffected. Falls back to
   * awaiting the fetch (which populates the same cache) only on a cold
   * cache, so the Guardians step's relationship dropdown is never empty.
   */
  private openWizardWhenGuardianRelationshipsReady(open: () => void): void {
    const cached = peekCachedGuardianRelationships();
    if (cached) {
      this.wizardModal!.guardianRelationships = cached;
      open();
      return;
    }
    getGuardianRelationships()
      .then((relationships) => {
        this.wizardModal!.guardianRelationships = relationships;
        open();
      })
      .catch((err: unknown) => this.showError(err));
  }

  private handleFilterChanged = (event: Event): void => {
    this._currentFilters = (event as CustomEvent<StudentFilters>).detail;
    this.applyFilters();
  };

  private handleCreateRequested = async (event: Event): Promise<void> => {
    const {
      input,
      pendingSiblingIds,
      pendingGuardians = [],
      pendingEnrollments = [],
      pendingExtraCurricularIds = [],
    } = (
      event as CustomEvent<{
        input: StudentInput;
        pendingSiblingIds: string[];
        pendingGuardians?: GuardianInput[];
        pendingEnrollments?: EnrollmentInput[];
        pendingExtraCurricularIds?: string[];
      }>
    ).detail;
    this.clearError();
    try {
      const created = await createStudent(input);
      this.wizardModal!.close();
      await this.loadStudents();
      if (pendingSiblingIds.length > 0) {
        await this.linkPendingSiblings(created.studentId, pendingSiblingIds);
      }
      if (pendingGuardians.length > 0) {
        await this.linkPendingGuardians(created.studentId, pendingGuardians);
      }
      if (pendingEnrollments.length > 0) {
        await this.createPendingEnrollments(created.studentId, pendingEnrollments);
      }
      if (pendingExtraCurricularIds.length > 0) {
        await this.assignPendingExtraCurriculars(created.studentId, pendingExtraCurricularIds);
      }
    } catch (err) {
      this.wizardModal!.showStudentError(err instanceof StudentsError ? err.message : 'An unexpected error occurred');
    }
  };

  /**
   * The student itself is already created and visible by this point, so a failure
   * here surfaces on the page banner rather than reopening the (now-closed) wizard.
   */
  private async linkPendingSiblings(studentId: string, siblingIds: string[]): Promise<void> {
    try {
      for (const siblingId of siblingIds) {
        await addSibling(studentId, siblingId);
      }
    } catch (err) {
      this.showError(err);
    }
  }

  /**
   * Runs after siblings are linked, so a guardian added during Create links to
   * the student's now-established sibling group too, matching addGuardian's
   * edit-mode behaviour.
   */
  private async linkPendingGuardians(studentId: string, guardians: GuardianInput[]): Promise<void> {
    try {
      for (const guardian of guardians) {
        await addGuardian(studentId, guardian);
      }
    } catch (err) {
      this.showError(err);
    }
  }

  /**
   * Runs last, once the student and its related records exist. Like the staged
   * siblings and guardians, the student is already created and visible by this
   * point, so a failure surfaces on the page banner rather than reopening the
   * (now-closed) wizard.
   */
  private async createPendingEnrollments(studentId: string, enrollments: EnrollmentInput[]): Promise<void> {
    try {
      for (const enrollment of enrollments) {
        await enrollStudent(studentId, enrollment);
      }
    } catch (err) {
      this.showError(err);
    }
  }

  private handleEditRequested = (event: Event): void => {
    const { student } = (event as CustomEvent<{ student: StudentResult }>).detail;
    this.openWizardWhenGuardianRelationshipsReady(() => this.wizardModal!.openForEdit(student));
  };

  private handleUpdateRequested = async (event: Event): Promise<void> => {
    const { studentId, input } = (event as CustomEvent<{ studentId: string; input: StudentInput }>).detail;
    this.clearError();
    try {
      await updateStudent(studentId, input);
      this.wizardModal!.close();
      await this.loadStudents();
    } catch (err) {
      this.wizardModal!.showStudentError(err instanceof StudentsError ? err.message : 'An unexpected error occurred');
    }
  };

  private handleDeleteRequested = (event: Event): void => {
    const { studentId, name } = (event as CustomEvent<{ studentId: string; name: string }>).detail;
    this.deleteModal!.show(studentId, name);
  };

  private handleDeleteConfirmed = async (event: Event): Promise<void> => {
    const { studentId } = (event as CustomEvent<{ studentId: string }>).detail;
    this.clearError();
    try {
      await deleteStudent(studentId);
      this._allStudents = this._allStudents.filter((s) => s.studentId !== studentId);
      this.applyFilters();
    } catch (err) {
      this.showError(err);
    }
  };

  private handleRowExpanded = async (event: Event): Promise<void> => {
    const { studentId } = (event as CustomEvent<{ studentId: string }>).detail;
    // A Private-grade student takes no part in extra-curriculars and is given no
    // summary to populate, so their activities are not read at all rather than
    // read and discarded.
    const takesPartInActivities = this._allStudents.find((s) => s.studentId === studentId)?.grade !== 'Private';
    try {
      const [siblings, guardians, enrollments, extraCurriculars] = await Promise.all([
        getSiblings(studentId),
        getGuardians(studentId),
        getStudentCourses(studentId),
        takesPartInActivities ? getStudentExtraCurriculars(studentId) : Promise.resolve([]),
      ]);
      this.studentsTable!.setSiblingsSummary(studentId, siblings);
      this.studentsTable!.setGuardiansSummary(studentId, guardians);
      this.studentsTable!.setCoursesSummary(studentId, enrollments);
      this.studentsTable!.setExtraCurricularsSummary(studentId, extraCurriculars);
    } catch {
      this.studentsTable!.setSiblingsSummary(studentId, []);
      this.studentsTable!.setGuardiansSummary(studentId, []);
      this.studentsTable!.setCoursesSummary(studentId, []);
      this.studentsTable!.setExtraCurricularsSummary(studentId, []);
    }
  };

  private handleSiblingsTabActivated = async (event: Event): Promise<void> => {
    const { studentId } = (event as CustomEvent<{ studentId: string }>).detail;
    await this.refreshWizardSiblings(studentId);
  };

  private handleSiblingAddRequested = async (event: Event): Promise<void> => {
    const { studentId, siblingId } = (event as CustomEvent<{ studentId: string; siblingId: string }>).detail;
    try {
      await addSibling(studentId, siblingId);
      await this.refreshWizardSiblings(studentId);
    } catch (err) {
      this.wizardModal!.showSiblingsError(err instanceof StudentsError ? err.message : 'An unexpected error occurred');
    }
  };

  private handleSiblingRemoveRequested = async (event: Event): Promise<void> => {
    const { studentId, siblingId } = (event as CustomEvent<{ studentId: string; siblingId: string }>).detail;
    try {
      await removeSibling(studentId, siblingId);
      await this.refreshWizardSiblings(studentId);
    } catch (err) {
      this.wizardModal!.showSiblingsError(err instanceof StudentsError ? err.message : 'An unexpected error occurred');
    }
  };

  private refreshWizardSiblings = async (studentId: string): Promise<void> => {
    try {
      const siblings = await getSiblings(studentId);
      this.wizardModal!.siblings = siblings;
      const linkedIds = new Set(siblings.map((s) => s.studentId));
      this.wizardModal!.candidates = this._allStudents.filter(
        (s) => s.studentId !== studentId && !linkedIds.has(s.studentId),
      );
    } catch (err) {
      this.wizardModal!.showSiblingsError(err instanceof StudentsError ? err.message : 'An unexpected error occurred');
    }
  };

  private handleGuardiansTabActivated = async (event: Event): Promise<void> => {
    const { studentId } = (event as CustomEvent<{ studentId: string }>).detail;
    await this.refreshWizardGuardians(studentId);
  };

  private handleCreateGuardiansPreviewRequested = async (event: Event): Promise<void> => {
    const { siblingIds } = (event as CustomEvent<{ siblingIds: string[] }>).detail;
    if (siblingIds.length === 0) {
      this.wizardModal!.setInheritedGuardiansForCreate([]);
      return;
    }
    try {
      const lists = await Promise.all(siblingIds.map((id) => getGuardians(id)));
      this.wizardModal!.setInheritedGuardiansForCreate(this.mergeGuardianLists(lists));
    } catch (err) {
      this.wizardModal!.showGuardiansError(
        err instanceof GuardiansError ? err.message : 'An unexpected error occurred',
      );
    }
  };

  private handleGuardianAddRequested = async (event: Event): Promise<void> => {
    const { studentId, input } = (event as CustomEvent<{ studentId: string; input: GuardianInput }>).detail;
    try {
      await addGuardian(studentId, input);
      await this.refreshWizardGuardians(studentId);
      this.wizardModal!.closeGuardianForm();
    } catch (err) {
      this.wizardModal!.showGuardiansError(
        err instanceof GuardiansError ? err.message : 'An unexpected error occurred',
      );
    }
  };

  private handleGuardianUpdateRequested = async (event: Event): Promise<void> => {
    const { guardianId, input } = (event as CustomEvent<{ guardianId: string; input: GuardianInput }>).detail;
    try {
      await updateGuardian(guardianId, input);
      if (this.wizardModal!.studentId) {
        await this.refreshWizardGuardians(this.wizardModal!.studentId);
      }
      this.wizardModal!.closeGuardianForm();
    } catch (err) {
      this.wizardModal!.showGuardiansError(
        err instanceof GuardiansError ? err.message : 'An unexpected error occurred',
      );
    }
  };

  private handleGuardianDeleteRequested = async (event: Event): Promise<void> => {
    const { studentId, guardian } = (event as CustomEvent<{ studentId: string; guardian: GuardianResult }>).detail;
    try {
      const shared = await isGuardianShared(guardian.guardianId);
      this.deleteGuardianModal!.show(
        studentId,
        guardian.guardianId,
        `${guardian.firstName} ${guardian.surname}`,
        shared,
      );
    } catch (err) {
      this.wizardModal!.showGuardiansError(
        err instanceof GuardiansError ? err.message : 'An unexpected error occurred',
      );
    }
  };

  private handleGuardianDeleteConfirmed = async (event: Event): Promise<void> => {
    const { studentId, guardianId, scope } = (
      event as CustomEvent<{ studentId: string; guardianId: string; scope: GuardianDeleteScope }>
    ).detail;
    try {
      if (scope === 'all') {
        await deleteGuardian(guardianId);
      } else {
        await unlinkGuardian(studentId, guardianId);
      }
      await this.refreshWizardGuardians(studentId);
    } catch (err) {
      this.wizardModal!.showGuardiansError(
        err instanceof GuardiansError ? err.message : 'An unexpected error occurred',
      );
    }
  };

  private handleGuardiansSyncRequested = async (event: Event): Promise<void> => {
    const { studentId } = (event as CustomEvent<{ studentId: string }>).detail;
    try {
      await syncGuardians(studentId);
      await this.refreshWizardGuardians(studentId);
    } catch (err) {
      this.wizardModal!.showGuardiansError(
        err instanceof GuardiansError ? err.message : 'An unexpected error occurred',
      );
    }
  };

  private refreshWizardGuardians = async (studentId: string): Promise<void> => {
    try {
      const [guardians, missingGuardians] = await Promise.all([
        getGuardians(studentId),
        getMissingSiblingGuardians(studentId),
      ]);
      this.wizardModal!.guardians = guardians;
      this.wizardModal!.hasMissingSiblingGuardians = missingGuardians.length > 0;
    } catch (err) {
      this.wizardModal!.showGuardiansError(
        err instanceof GuardiansError ? err.message : 'An unexpected error occurred',
      );
    }
  };

  private handleCoursesTabActivated = async (event: Event): Promise<void> => {
    const { studentId } = (event as CustomEvent<{ studentId: string }>).detail;
    await this.refreshWizardEnrollments(studentId);
  };

  private handleEnrollmentAddRequested = async (event: Event): Promise<void> => {
    const { studentId, input } = (event as CustomEvent<{ studentId: string; input: EnrollmentInput }>).detail;
    try {
      await enrollStudent(studentId, input);
      await this.refreshWizardEnrollments(studentId);
      this.wizardModal!.closeEnrollmentForm();
    } catch (err) {
      this.wizardModal!.showCoursesError(
        err instanceof EnrollmentsError ? err.message : 'An unexpected error occurred',
      );
    }
  };

  private handleEnrollmentUpdateRequested = async (event: Event): Promise<void> => {
    const { studentId, studentCourseId, input } = (
      event as CustomEvent<{ studentId: string; studentCourseId: string; input: EnrollmentUpdateInput }>
    ).detail;
    try {
      await updateEnrollment(studentId, studentCourseId, input);
      await this.refreshWizardEnrollments(studentId);
      // Returns the corrected row to its read-only form, the same way the
      // enroll panel is closed after a successful add.
      this.wizardModal!.closeEnrollmentForm();
    } catch (err) {
      this.wizardModal!.showCoursesError(
        err instanceof EnrollmentsError ? err.message : 'An unexpected error occurred',
      );
    }
  };

  /**
   * Naming the student is the page's answer rather than the wizard's — the
   * roster it already holds is where the name comes from, exactly as the
   * guardian delete confirmation reads its own.
   */
  private handleEnrollmentWithdrawRequested = (event: Event): void => {
    const { studentId, enrollment } = (event as CustomEvent<{ studentId: string; enrollment: EnrollmentResult }>)
      .detail;
    const student = this._allStudents.find((s) => s.studentId === studentId);

    this.withdrawEnrollmentModal!.show(
      studentId,
      enrollment.studentCourseId,
      student ? `${student.firstName} ${student.lastName}` : 'This student',
      courseLabel(enrollment),
    );
  };

  private handleEnrollmentWithdrawConfirmed = async (event: Event): Promise<void> => {
    const { studentId, studentCourseId } = (event as CustomEvent<{ studentId: string; studentCourseId: string }>)
      .detail;
    try {
      await withdrawEnrollment(studentId, studentCourseId);
      await this.refreshWizardEnrollments(studentId);
      // Another row may have been open for editing when this withdrawal was
      // confirmed; the refreshed list would otherwise re-seed it from server
      // data and drop the selections made in it without saying so.
      this.wizardModal!.closeEnrollmentForm();
    } catch (err) {
      this.wizardModal!.showCoursesError(
        err instanceof EnrollmentsError ? err.message : 'An unexpected error occurred',
      );
    }
  };

  private handleExtraCurricularsTabActivated = async (event: Event): Promise<void> => {
    const { studentId } = (event as CustomEvent<{ studentId: string }>).detail;
    await this.refreshWizardExtraCurriculars(studentId);
  };

  /**
   * The picker's options, asked for each time the Add Activity panel opens. Both
   * modes read by the phase the form currently holds, never by the stored
   * student: an unsaved phase is the whole point — editing a Private-grade
   * student into a graded one has to offer that phase's activities before
   * anything is saved. Leaving out what the student already holds is the step's,
   * since a phase-scoped read knows nothing about them.
   */
  private handleAssignableRequested = async (event: Event): Promise<void> => {
    const { phase } = (event as CustomEvent<{ phase: PhaseType | null }>).detail;
    try {
      // No phase means no step at all, so there is nothing to offer.
      this.wizardModal!.assignableExtraCurriculars = phase ? await getAssignableExtraCurricularsByPhase(phase) : [];
    } catch (err) {
      this.wizardModal!.showExtraCurricularsError(this.extraCurricularMessage(err));
    }
  };

  private handleExtraCurricularAssignRequested = async (event: Event): Promise<void> => {
    const { studentId, extraCurricularId } = (event as CustomEvent<{ studentId: string; extraCurricularId: string }>)
      .detail;
    try {
      await assignExtraCurricular(studentId, extraCurricularId);
      await this.refreshWizardExtraCurriculars(studentId);
      this.wizardModal!.closeExtraCurricularPanel();
    } catch (err) {
      this.wizardModal!.showExtraCurricularsError(this.extraCurricularMessage(err));
    }
  };

  private handleExtraCurricularRemoveRequested = async (event: Event): Promise<void> => {
    const { studentId, extraCurricularId } = (event as CustomEvent<{ studentId: string; extraCurricularId: string }>)
      .detail;
    try {
      await removeExtraCurricular(studentId, extraCurricularId);
      await this.refreshWizardExtraCurriculars(studentId);
    } catch (err) {
      this.wizardModal!.showExtraCurricularsError(this.extraCurricularMessage(err));
    }
  };

  private refreshWizardExtraCurriculars = async (studentId: string): Promise<void> => {
    try {
      this.wizardModal!.extraCurriculars = await getStudentExtraCurriculars(studentId);
    } catch (err) {
      this.wizardModal!.showExtraCurricularsError(this.extraCurricularMessage(err));
    }
  };

  /**
   * Runs last, once the student and its related records exist. Like the staged
   * siblings, guardians and enrollments, the student is already created and
   * visible by this point, so a failure surfaces on the page banner rather than
   * reopening the (now-closed) wizard.
   */
  private async assignPendingExtraCurriculars(studentId: string, extraCurricularIds: string[]): Promise<void> {
    try {
      for (const extraCurricularId of extraCurricularIds) {
        await assignExtraCurricular(studentId, extraCurricularId);
      }
    } catch (err) {
      this.showError(err);
    }
  }

  private extraCurricularMessage(err: unknown): string {
    return err instanceof StudentExtraCurricularsError ? err.message : 'An unexpected error occurred';
  }

  private refreshWizardEnrollments = async (studentId: string): Promise<void> => {
    try {
      this.wizardModal!.enrollments = await getStudentCourses(studentId);
    } catch (err) {
      this.wizardModal!.showCoursesError(
        err instanceof EnrollmentsError ? err.message : 'An unexpected error occurred',
      );
    }
  };

  /** The course catalogue and teacher roster the enroll form chooses from. */
  private async loadEnrollmentLookups(): Promise<void> {
    try {
      const [courses, teachers] = await Promise.all([getEnrollableCourses(), getAssignableTeachers()]);
      this.wizardModal!.enrollableCourses = courses;
      this.wizardModal!.assignableTeachers = teachers;
    } catch (err) {
      this.showError(err);
    }
  }

  private mergeGuardianLists(lists: GuardianResult[][]): GuardianResult[] {
    const seen = new Set<string>();
    const merged: GuardianResult[] = [];
    for (const list of lists) {
      for (const guardian of list) {
        if (!seen.has(guardian.guardianId)) {
          seen.add(guardian.guardianId);
          merged.push(guardian);
        }
      }
    }
    return merged;
  }

  private async loadGuardianRelationships(): Promise<void> {
    try {
      const relationships = await getGuardianRelationships();
      this.wizardModal!.guardianRelationships = relationships;
      this.studentsTable!.relationships = relationships;
    } catch (err) {
      this.showError(err);
    }
  }

  private loadStudents = async (): Promise<void> => {
    this.clearError();
    try {
      this._allStudents = await getStudents();
      this.applyFilters();
    } catch (err) {
      this.showError(err);
    }
  };

  private applyFilters(): void {
    this.studentsTable!.students = filterStudents(this._allStudents, this._currentFilters);
  }

  private showError(err: unknown): void {
    this.errorBanner!.textContent =
      err instanceof StudentsError ||
      err instanceof GuardiansError ||
      err instanceof EnrollmentsError ||
      err instanceof StudentExtraCurricularsError
        ? err.message
        : 'An unexpected error occurred';
    this.errorBanner!.classList.add('students-page__error--visible');
  }

  private clearError(): void {
    this.errorBanner!.classList.remove('students-page__error--visible');
  }
}

customElements.define('pm-students-page', PmStudentsPage);
