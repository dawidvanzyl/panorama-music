import '../components/pm-course-form';
import '../components/pm-course-filter-bar';
import '../components/pm-course-table';
import '../components/pm-delete-course-modal';
import { hasAnyRole } from '../../../services/token-storage';
import {
  CoursesError,
  countCourseEnrollments,
  createCourse,
  deleteCourse,
  getCourses,
  getLessonStructures,
  updateCourseCost,
  type Course,
} from '../services/courses';
import { courseName } from '../services/course-display';
import { filterCourses, type CourseFilters } from '../services/filter-courses';
import type { PmCourseFilterBar } from '../components/pm-course-filter-bar';
import type { PmCourseForm } from '../components/pm-course-form';
import type { PmCourseTable } from '../components/pm-course-table';
import type { PmDeleteCourseModal } from '../components/pm-delete-course-modal';

const MAINTAINER_ROLES = ['Coordinator'];

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
    [hidden] {
      display: none !important;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <h1 class="course-management__title">Courses</h1>
  <div class="course-management__error" id="error"></div>
  <pm-course-form id="form" hidden></pm-course-form>
  <pm-course-filter-bar id="filterBar" hidden></pm-course-filter-bar>
  <pm-course-table id="table"></pm-course-table>
  <pm-delete-course-modal id="deleteModal"></pm-delete-course-modal>
`;

export class PmCourseManagementPage extends HTMLElement {
  private courseForm: PmCourseForm | null = null;
  private filterBar: PmCourseFilterBar | null = null;
  private courseTable: PmCourseTable | null = null;
  private deleteModal: PmDeleteCourseModal | null = null;
  private errorBanner: HTMLElement | null = null;
  private filters: CourseFilters = {};
  /** The whole catalogue, read once and narrowed in place by the filter bar. */
  private courses: Course[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.courseForm = this.shadowRoot!.getElementById('form') as unknown as PmCourseForm;
    this.filterBar = this.shadowRoot!.getElementById('filterBar') as unknown as PmCourseFilterBar;
    this.courseTable = this.shadowRoot!.getElementById('table') as unknown as PmCourseTable;
    this.deleteModal = this.shadowRoot!.getElementById('deleteModal') as unknown as PmDeleteCourseModal;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;

    // A user who may not maintain courses gets no create form, no filter bar
    // and no actions column — absent, not disabled, matching how the endpoints
    // answer them.
    const canMaintain = hasAnyRole(MAINTAINER_ROLES);
    (this.courseForm as unknown as HTMLElement).hidden = !canMaintain;
    (this.filterBar as unknown as HTMLElement).hidden = !canMaintain;
    this.courseTable.showActions = canMaintain;

    this.shadowRoot!.addEventListener('course-form-submitted', this.handleFormSubmitted);
    this.shadowRoot!.addEventListener('course-filter-changed', this.handleFilterChanged);
    this.shadowRoot!.addEventListener('course-cost-save-requested', this.handleCostSaveRequested);
    this.shadowRoot!.addEventListener('course-delete-clicked', this.handleDeleteClicked);
    this.shadowRoot!.addEventListener('course-delete-confirmed', this.handleDeleteConfirmed);

    if (canMaintain) void this.loadStructures();
    void this.loadCourses();
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener('course-form-submitted', this.handleFormSubmitted);
    this.shadowRoot!.removeEventListener('course-filter-changed', this.handleFilterChanged);
    this.shadowRoot!.removeEventListener('course-cost-save-requested', this.handleCostSaveRequested);
    this.shadowRoot!.removeEventListener('course-delete-clicked', this.handleDeleteClicked);
    this.shadowRoot!.removeEventListener('course-delete-confirmed', this.handleDeleteConfirmed);
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
      // Filters are cleared alongside the form: a create that landed outside
      // the current selection would otherwise be indistinguishable from one
      // that silently failed.
      this.filterBar!.reset();
      this.filters = {};
      await this.loadCourses();
    } catch (err) {
      // The reason belongs on the form itself, beside the values the user
      // entered — which stay put so the create can be corrected and retried.
      this.courseForm!.showError(this.messageFor(err));
    }
  };

  private handleCostSaveRequested = async (event: Event): Promise<void> => {
    const { courseId, cost } = (event as CustomEvent<{ courseId: string; cost: string }>).detail;
    this.clearError();

    try {
      const updated = await updateCourseCost(courseId, cost);
      // The response is the updated course, so the list is corrected in place.
      // A re-read would put a second call between the change and the row that
      // reports it, and its failure would leave the row asserting a stale cost
      // for a change that actually landed.
      this.courses = this.courses.map((course) => (course.courseId === courseId ? updated : course));
      this.renderCourses();
    } catch (err) {
      // The reason belongs against the row it concerns, which stays in edit
      // mode holding the entered value so the change can be corrected.
      this.courseTable!.showRowError(courseId, this.messageFor(err));
    }
  };

  /**
   * A course any student is enrolled in cannot be deleted, so the confirmation
   * is never opened for one — the user is told why against the row instead of
   * being asked to confirm something the server would reject.
   */
  private handleDeleteClicked = async (event: Event): Promise<void> => {
    const { course } = (event as CustomEvent<{ course: Course }>).detail;
    this.clearError();

    try {
      const { count } = await countCourseEnrollments(course.courseId);
      if (count > 0) {
        this.courseTable!.showRowError(
          course.courseId,
          `${courseName(course)} has ${count} enrolled student(s) and cannot be deleted.`,
        );
        return;
      }
      this.deleteModal!.show(course.courseId, courseName(course));
    } catch (err) {
      this.courseTable!.showRowError(course.courseId, this.messageFor(err));
    }
  };

  private handleDeleteConfirmed = async (event: Event): Promise<void> => {
    const { courseId } = (event as CustomEvent<{ courseId: string }>).detail;
    this.clearError();

    try {
      await deleteCourse(courseId);
      // Dropped from the list rather than re-read, for the same reason a cost
      // update is applied in place.
      this.courses = this.courses.filter((course) => course.courseId !== courseId);
      this.renderCourses();
    } catch (err) {
      this.courseTable!.showRowError(courseId, this.messageFor(err));
    }
  };

  private handleFilterChanged = (event: Event): void => {
    this.filters = (event as CustomEvent<CourseFilters>).detail;
    this.renderCourses();
  };

  private loadStructures = async (): Promise<void> => {
    try {
      this.courseForm!.structures = await getLessonStructures();
    } catch (err) {
      this.showError(this.messageFor(err));
    }
  };

  /** Reads the catalogue; only a create or the first render needs a round trip.
   *  A cost update and a delete are applied to the list already in hand. */
  private loadCourses = async (): Promise<void> => {
    try {
      this.courses = await getCourses();
      this.renderCourses();
    } catch (err) {
      this.showError(this.messageFor(err));
    }
  };

  private renderCourses(): void {
    this.courseTable!.courses = filterCourses(this.courses, this.filters);
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
