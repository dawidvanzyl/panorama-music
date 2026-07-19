import '../components/pm-student-filter-bar';
import '../components/pm-students-table';
import '../components/pm-create-student-form';
import '../components/pm-edit-student-form';
import '../components/pm-delete-student-modal';
import {
  getStudents,
  createStudent,
  updateStudent,
  deleteStudent,
  clearStudentsCache,
  StudentsError,
  type StudentInput,
  type StudentResult,
} from '../services/students';
import { filterStudents, type StudentFilters } from '../services/filter-students';
import type { PmStudentsTable } from '../components/pm-students-table';
import type { PmCreateStudentForm } from '../components/pm-create-student-form';
import type { PmEditStudentForm } from '../components/pm-edit-student-form';
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
    <pm-create-student-form id="createForm"></pm-create-student-form>
    <pm-edit-student-form id="editForm"></pm-edit-student-form>
    <pm-student-filter-bar id="filterBar"></pm-student-filter-bar>
    <div class="students-page__error" id="error"></div>
    <pm-students-table id="studentsTable"></pm-students-table>
  </div>
  <pm-delete-student-modal id="deleteModal"></pm-delete-student-modal>
`;

export class PmStudentsPage extends HTMLElement {
  private studentsTable: PmStudentsTable | null = null;
  private createForm: PmCreateStudentForm | null = null;
  private editForm: PmEditStudentForm | null = null;
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
    this.createForm = this.shadowRoot!.getElementById('createForm') as unknown as PmCreateStudentForm;
    this.editForm = this.shadowRoot!.getElementById('editForm') as unknown as PmEditStudentForm;
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
  }

  private handleCreateClick = (): void => {
    this.editForm!.close();
    this.createForm!.open();
  };

  private handleFilterChanged = (event: Event): void => {
    this._currentFilters = (event as CustomEvent<StudentFilters>).detail;
    this.applyFilters();
  };

  private handleCreateRequested = async (event: Event): Promise<void> => {
    const { input } = (event as CustomEvent<{ input: StudentInput }>).detail;
    this.clearError();
    try {
      await createStudent(input);
      this.createForm!.close();
      await this.loadStudents();
    } catch (err) {
      this.createForm!.showError(err instanceof StudentsError ? err.message : 'An unexpected error occurred');
    }
  };

  private handleEditRequested = (event: Event): void => {
    const { student } = (event as CustomEvent<{ student: StudentResult }>).detail;
    this.createForm!.close();
    this.editForm!.open(student);
  };

  private handleUpdateRequested = async (event: Event): Promise<void> => {
    const { studentId, input } = (event as CustomEvent<{ studentId: string; input: StudentInput }>).detail;
    this.clearError();
    try {
      await updateStudent(studentId, input);
      this.editForm!.close();
      await this.loadStudents();
    } catch (err) {
      this.editForm!.showError(err instanceof StudentsError ? err.message : 'An unexpected error occurred');
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
