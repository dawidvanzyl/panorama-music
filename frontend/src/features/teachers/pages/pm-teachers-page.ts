import '../components/pm-teacher-filter-bar';
import '../components/pm-teacher-table';
import '../components/pm-teacher-create-section';
import {
  getTeachers,
  getLinkableAccounts,
  createTeacher,
  clearTeachersCache,
  TeachersError,
  type TeacherInput,
  type TeacherResult,
} from '../services/teachers';
import { filterTeachers, type TeacherFilters } from '../services/filter-teachers';
import type { PmTeacherTable } from '../components/pm-teacher-table';
import type { PmTeacherCreateSection } from '../components/pm-teacher-create-section';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      flex: 1;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .teachers-page__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .teachers-page__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--pm-text);
      margin: 0;
    }
    .teachers-page__error {
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
      font-size: 13px;
      display: none;
    }
    .teachers-page__error--visible {
      display: block;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="teachers-page__container">
    <div class="teachers-page__header">
      <h1 class="teachers-page__title">Teachers</h1>
    </div>
    <pm-teacher-create-section id="createSection"></pm-teacher-create-section>
    <div class="teachers-page__error" id="error"></div>
    <pm-teacher-filter-bar id="filterBar"></pm-teacher-filter-bar>
    <pm-teacher-table id="teacherTable"></pm-teacher-table>
  </div>
`;

export class PmTeachersPage extends HTMLElement {
  private teacherTable: PmTeacherTable | null = null;
  private createSection: PmTeacherCreateSection | null = null;
  private errorBanner: HTMLElement | null = null;
  private _allTeachers: TeacherResult[] = [];
  private _currentFilters: TeacherFilters = {};

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.teacherTable = this.shadowRoot!.getElementById('teacherTable') as unknown as PmTeacherTable;
    this.createSection = this.shadowRoot!.getElementById('createSection') as unknown as PmTeacherCreateSection;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;

    this.shadowRoot!.addEventListener('filter-changed', this.handleFilterChanged);
    this.shadowRoot!.addEventListener('teacher-create-requested', this.handleCreateRequested);
    this.shadowRoot!.addEventListener('teacher-open-requested', this.handleOpenRequested);

    clearTeachersCache();
    void this.loadTeachers();
    void this.loadLinkableAccounts();
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener('filter-changed', this.handleFilterChanged);
    this.shadowRoot!.removeEventListener('teacher-create-requested', this.handleCreateRequested);
    this.shadowRoot!.removeEventListener('teacher-open-requested', this.handleOpenRequested);
  }

  private handleFilterChanged = (event: Event): void => {
    this._currentFilters = (event as CustomEvent<TeacherFilters>).detail;
    this.applyFilters();
  };

  private handleCreateRequested = async (event: Event): Promise<void> => {
    const { input } = (event as CustomEvent<{ input: TeacherInput }>).detail;
    try {
      await createTeacher(input);
      this.createSection!.reset();
      await this.loadTeachers();
      // Linking during creation consumes an account, so the picker's options
      // are stale the moment the create succeeds.
      await this.loadLinkableAccounts();
    } catch (err) {
      this.createSection!.showError(err instanceof TeachersError ? err.message : 'An unexpected error occurred');
    }
  };

  private handleOpenRequested = (event: Event): void => {
    const { teacherId } = (event as CustomEvent<{ teacherId: string }>).detail;
    window.location.hash = `#/teachers/${teacherId}`;
  };

  private loadLinkableAccounts = async (): Promise<void> => {
    try {
      this.createSection!.linkableAccounts = await getLinkableAccounts();
    } catch (err) {
      this.showError(err);
    }
  };

  private loadTeachers = async (): Promise<void> => {
    this.clearError();
    try {
      this._allTeachers = await getTeachers();
      this.applyFilters();
    } catch (err) {
      this.showError(err);
    }
  };

  private applyFilters(): void {
    this.teacherTable!.teachers = filterTeachers(this._allTeachers, this._currentFilters);
  }

  private showError(err: unknown): void {
    this.errorBanner!.textContent = err instanceof TeachersError ? err.message : 'An unexpected error occurred';
    this.errorBanner!.classList.add('teachers-page__error--visible');
  }

  private clearError(): void {
    this.errorBanner!.classList.remove('teachers-page__error--visible');
  }
}

customElements.define('pm-teachers-page', PmTeachersPage);
