import '../components/pm-course-form';
import '../components/pm-course-filter-bar';
import '../components/pm-course-table';
import { hasAnyRole } from '../../../services/token-storage';
import { resultSummaryText } from '../services/course-display';
import { CoursesError, createCourse, getCourses, getLessonStructures, type CourseFilter } from '../services/courses';
import type { PmCourseForm } from '../components/pm-course-form';
import type { PmCourseTable } from '../components/pm-course-table';

const MAINTAINER_ROLES = ['Coordinator', 'Admin'];

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .course-management__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--pm-text);
      margin: 0;
    }
    .course-management__error {
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
      font-size: 13px;
      display: none;
    }
    .course-management__error--visible {
      display: block;
    }
    .course-management__summary {
      font-size: 11px;
      letter-spacing: 0.02em;
      color: var(--pm-text-muted);
      margin: 0;
    }
    [hidden] {
      display: none !important;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <h1 class="course-management__title">Course Management</h1>
  <div class="course-management__error" id="error"></div>
  <pm-course-form id="form" hidden></pm-course-form>
  <pm-course-filter-bar id="filterBar" hidden></pm-course-filter-bar>
  <pm-course-table id="table"></pm-course-table>
  <p class="course-management__summary" id="summary" hidden></p>
`;

export class PmCourseManagementPage extends HTMLElement {
  private courseForm: PmCourseForm | null = null;
  private filterBar: HTMLElement | null = null;
  private courseTable: PmCourseTable | null = null;
  private summary: HTMLElement | null = null;
  private errorBanner: HTMLElement | null = null;
  private filter: CourseFilter = {};
  /** The unfiltered count the result summary reports against. */
  private totalCount = 0;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.courseForm = this.shadowRoot!.getElementById('form') as unknown as PmCourseForm;
    this.filterBar = this.shadowRoot!.getElementById('filterBar') as HTMLElement;
    this.courseTable = this.shadowRoot!.getElementById('table') as unknown as PmCourseTable;
    this.summary = this.shadowRoot!.getElementById('summary') as HTMLElement;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;

    // A user who may not maintain courses gets no create form, no filter bar
    // and no actions column — absent, not disabled, matching how the endpoints
    // answer them.
    const canMaintain = hasAnyRole(MAINTAINER_ROLES);
    (this.courseForm as unknown as HTMLElement).hidden = !canMaintain;
    this.filterBar.hidden = !canMaintain;
    this.summary.hidden = !canMaintain;
    this.courseTable.showActions = canMaintain;

    this.shadowRoot!.addEventListener('course-form-submitted', this.handleFormSubmitted);
    this.shadowRoot!.addEventListener('course-filter-changed', this.handleFilterChanged);

    if (canMaintain) void this.loadStructures();
    void this.loadCourses();
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener('course-form-submitted', this.handleFormSubmitted);
    this.shadowRoot!.removeEventListener('course-filter-changed', this.handleFilterChanged);
  }

  private handleFormSubmitted = async (event: Event): Promise<void> => {
    const detail = (event as CustomEvent<{ courseType: string; cost: string; lessonStructureId: string }>).detail;
    this.clearError();

    try {
      await createCourse({
        courseType: detail.courseType as Parameters<typeof createCourse>[0]['courseType'],
        cost: detail.cost,
        lessonStructureId: detail.lessonStructureId,
      });
      this.courseForm!.reset();
      await this.loadCourses(true);
    } catch (err) {
      // The reason belongs on the form itself, beside the values the user
      // entered — which stay put so the create can be corrected and retried.
      this.courseForm!.showError(this.messageFor(err));
    }
  };

  private handleFilterChanged = async (event: Event): Promise<void> => {
    this.filter = (event as CustomEvent<CourseFilter>).detail;
    await this.loadCourses();
  };

  private loadStructures = async (): Promise<void> => {
    try {
      this.courseForm!.structures = await getLessonStructures();
    } catch (err) {
      this.showError(this.messageFor(err));
    }
  };

  /**
   * `refreshTotal` re-reads the whole catalogue for the summary's denominator.
   * Only the events that can change it — the first load and a create — pay for
   * that second request; a filter change re-reads the narrowed list alone.
   */
  private loadCourses = async (refreshTotal = false): Promise<void> => {
    try {
      const courses = await getCourses(this.filter);
      this.courseTable!.courses = courses;

      if (refreshTotal || !this.hasFilter()) {
        this.totalCount = this.hasFilter() ? (await getCourses()).length : courses.length;
      }
      this.summary!.textContent = resultSummaryText(courses.length, this.totalCount);
    } catch (err) {
      this.showError(this.messageFor(err));
    }
  };

  private hasFilter(): boolean {
    return Object.values(this.filter).some((value) => value !== undefined);
  }

  private messageFor(err: unknown): string {
    return err instanceof CoursesError ? err.message : 'An unexpected error occurred';
  }

  private showError(message: string): void {
    this.errorBanner!.textContent = message;
    this.errorBanner!.classList.add('course-management__error--visible');
  }

  private clearError(): void {
    this.errorBanner!.textContent = '';
    this.errorBanner!.classList.remove('course-management__error--visible');
  }
}

customElements.define('pm-course-management-page', PmCourseManagementPage);
