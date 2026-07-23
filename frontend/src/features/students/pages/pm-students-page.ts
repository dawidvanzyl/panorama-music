import '../components/pm-student-filter-bar';
import '../components/pm-students-table';
import '../components/pm-student-wizard-modal';
import '../components/pm-delete-student-modal';
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
import { filterStudents, type StudentFilters } from '../services/filter-students';
import type { PmStudentsTable } from '../components/pm-students-table';
import type { PmStudentWizardModal } from '../components/pm-student-wizard-modal';
import type { PmDeleteStudentModal } from '../components/pm-delete-student-modal';

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
      <h1 class="students-page__title">Student Management</h1>
      <button type="button" class="students-page__create-btn" id="createBtn">Create Student</button>
    </div>
    <pm-student-filter-bar id="filterBar"></pm-student-filter-bar>
    <div class="students-page__error" id="error"></div>
    <pm-students-table id="studentsTable"></pm-students-table>
  </div>
  <pm-student-wizard-modal id="wizardModal"></pm-student-wizard-modal>
  <pm-delete-student-modal id="deleteModal"></pm-delete-student-modal>
`;

export class PmStudentsPage extends HTMLElement {
  private studentsTable: PmStudentsTable | null = null;
  private wizardModal: PmStudentWizardModal | null = null;
  private deleteModal: PmDeleteStudentModal | null = null;
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

    clearStudentsCache();
    void this.loadStudents();
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
  }

  private handleCreateClick = (): void => {
    this.wizardModal!.openForCreate(this._allStudents);
  };

  private handleFilterChanged = (event: Event): void => {
    this._currentFilters = (event as CustomEvent<StudentFilters>).detail;
    this.applyFilters();
  };

  private handleCreateRequested = async (event: Event): Promise<void> => {
    const { input, pendingSiblingIds } = (event as CustomEvent<{ input: StudentInput; pendingSiblingIds: string[] }>)
      .detail;
    this.clearError();
    try {
      const created = await createStudent(input);
      this.wizardModal!.close();
      await this.loadStudents();
      if (pendingSiblingIds.length > 0) {
        await this.linkPendingSiblings(created.studentId, pendingSiblingIds);
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

  private handleEditRequested = (event: Event): void => {
    const { student } = (event as CustomEvent<{ student: StudentResult }>).detail;
    this.wizardModal!.openForEdit(student);
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
    try {
      const siblings = await getSiblings(studentId);
      this.studentsTable!.setSiblingsSummary(studentId, siblings);
    } catch {
      this.studentsTable!.setSiblingsSummary(studentId, []);
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
    this.errorBanner!.textContent = err instanceof StudentsError ? err.message : 'An unexpected error occurred';
    this.errorBanner!.classList.add('students-page__error--visible');
  }

  private clearError(): void {
    this.errorBanner!.classList.remove('students-page__error--visible');
  }
}

customElements.define('pm-students-page', PmStudentsPage);
