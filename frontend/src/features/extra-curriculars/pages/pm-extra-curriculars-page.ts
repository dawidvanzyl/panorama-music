import '../components/pm-extra-curricular-form';
import '../components/pm-extra-curricular-filter-bar';
import '../components/pm-extra-curricular-table';
import '../components/pm-delete-extra-curricular-modal';
import { hasAnyRole } from '../../../services/token-storage';
import {
  ExtraCurricularsError,
  addPracticeTime,
  countExtraCurricularStudents,
  createExtraCurricular,
  deleteExtraCurricular,
  getExtraCurriculars,
  removePracticeTime,
  updateExtraCurricular,
  type DayType,
  type ExtraCurricular,
  type ExtraCurricularInput,
  type PhaseType,
} from '../services/extra-curriculars';
import { cannotDeleteError } from '../services/extra-curricular-display';
import { filterExtraCurriculars, type ExtraCurricularFilters } from '../services/filter-extra-curriculars';
import type { PmExtraCurricularFilterBar } from '../components/pm-extra-curricular-filter-bar';
import type { PmExtraCurricularForm } from '../components/pm-extra-curricular-form';
import type { PmExtraCurricularTable } from '../components/pm-extra-curricular-table';
import type { PmDeleteExtraCurricularModal } from '../components/pm-delete-extra-curricular-modal';

/**
 * Who may maintain the catalogue. Admin is deliberately absent: this area is
 * Coordinator-owned, and the endpoints answer the same way.
 */
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
    .extra-curriculars__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--pm-text);
      margin: 0;
    }
    .extra-curriculars__error {
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
      font-size: 13px;
      display: none;
    }
    .extra-curriculars__error--visible {
      display: block;
    }
    [hidden] {
      display: none !important;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <h1 class="extra-curriculars__title">Extra-Curriculars Management</h1>
  <div class="extra-curriculars__error" id="error"></div>
  <pm-extra-curricular-form id="form" hidden></pm-extra-curricular-form>
  <pm-extra-curricular-filter-bar id="filterBar"></pm-extra-curricular-filter-bar>
  <pm-extra-curricular-table id="table"></pm-extra-curricular-table>
  <pm-delete-extra-curricular-modal id="deleteModal"></pm-delete-extra-curricular-modal>
`;

export class PmExtraCurricularsPage extends HTMLElement {
  private activityForm: PmExtraCurricularForm | null = null;
  private filterBar: PmExtraCurricularFilterBar | null = null;
  private activityTable: PmExtraCurricularTable | null = null;
  private deleteModal: PmDeleteExtraCurricularModal | null = null;
  private errorBanner: HTMLElement | null = null;
  private filters: ExtraCurricularFilters = {};
  /** The whole catalogue, read once and narrowed in place by the filter bar. */
  private extraCurriculars: ExtraCurricular[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.activityForm = this.shadowRoot!.getElementById('form') as unknown as PmExtraCurricularForm;
    this.filterBar = this.shadowRoot!.getElementById('filterBar') as unknown as PmExtraCurricularFilterBar;
    this.activityTable = this.shadowRoot!.getElementById('table') as unknown as PmExtraCurricularTable;
    this.deleteModal = this.shadowRoot!.getElementById('deleteModal') as unknown as PmDeleteExtraCurricularModal;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;

    // A Teacher who is not a Coordinator gets a read-only page: the filter bar
    // and table render as they do for anyone, and the create form is absent
    // rather than disabled — matching how the endpoints answer them.
    const canMaintain = hasAnyRole(MAINTAINER_ROLES);
    (this.activityForm as unknown as HTMLElement).hidden = !canMaintain;
    this.activityTable.showActions = canMaintain;

    this.shadowRoot!.addEventListener('extra-curricular-form-submitted', this.handleFormSubmitted);
    this.shadowRoot!.addEventListener('extra-curricular-filter-changed', this.handleFilterChanged);
    this.shadowRoot!.addEventListener('extra-curricular-practice-time-add-requested', this.handlePracticeTimeAdd);
    this.shadowRoot!.addEventListener('extra-curricular-practice-time-remove-requested', this.handlePracticeTimeRemove);
    this.shadowRoot!.addEventListener('extra-curricular-save-requested', this.handleSaveRequested);
    this.shadowRoot!.addEventListener('extra-curricular-delete-clicked', this.handleDeleteClicked);
    this.shadowRoot!.addEventListener('extra-curricular-delete-confirmed', this.handleDeleteConfirmed);

    void this.loadExtraCurriculars();
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener('extra-curricular-form-submitted', this.handleFormSubmitted);
    this.shadowRoot!.removeEventListener('extra-curricular-filter-changed', this.handleFilterChanged);
    this.shadowRoot!.removeEventListener('extra-curricular-practice-time-add-requested', this.handlePracticeTimeAdd);
    this.shadowRoot!.removeEventListener(
      'extra-curricular-practice-time-remove-requested',
      this.handlePracticeTimeRemove,
    );
    this.shadowRoot!.removeEventListener('extra-curricular-save-requested', this.handleSaveRequested);
    this.shadowRoot!.removeEventListener('extra-curricular-delete-clicked', this.handleDeleteClicked);
    this.shadowRoot!.removeEventListener('extra-curricular-delete-confirmed', this.handleDeleteConfirmed);
  }

  private handleSaveRequested = async (event: Event): Promise<void> => {
    const { extraCurricularId, description, phase } = (
      event as CustomEvent<{ extraCurricularId: string; description: string; phase: PhaseType }>
    ).detail;
    this.clearError();

    try {
      const updated = await updateExtraCurricular(extraCurricularId, { description, phase });
      // The response is the updated activity, so the list is corrected in place.
      // A re-read would put a second call between the change and the row that
      // reports it, and its failure would leave the row asserting stale values
      // for a change that actually landed.
      this.extraCurriculars = this.extraCurriculars.map((activity) =>
        activity.extraCurricularId === extraCurricularId ? updated : activity,
      );
      this.renderExtraCurriculars();
    } catch (err) {
      // The reason belongs against the row it concerns, which stays in edit mode
      // holding the entered values so the change can be corrected.
      this.activityTable!.showRowError(extraCurricularId, this.messageFor(err));
    }
  };

  /**
   * An activity any student takes part in cannot be deleted, so the confirmation
   * is never opened for one — the user is told why against the row instead of
   * being asked to confirm something the server would refuse.
   */
  private handleDeleteClicked = async (event: Event): Promise<void> => {
    const { extraCurricular } = (event as CustomEvent<{ extraCurricular: ExtraCurricular }>).detail;
    this.clearError();

    try {
      const { count } = await countExtraCurricularStudents(extraCurricular.extraCurricularId);
      if (count > 0) {
        this.activityTable!.showRowError(
          extraCurricular.extraCurricularId,
          cannotDeleteError(extraCurricular.description, count),
        );
        return;
      }
      this.deleteModal!.show(
        extraCurricular.extraCurricularId,
        extraCurricular.description,
        extraCurricular.practiceTimes.length,
      );
    } catch (err) {
      this.activityTable!.showRowError(extraCurricular.extraCurricularId, this.messageFor(err));
    }
  };

  private handleDeleteConfirmed = async (event: Event): Promise<void> => {
    const { extraCurricularId } = (event as CustomEvent<{ extraCurricularId: string }>).detail;
    this.clearError();

    try {
      await deleteExtraCurricular(extraCurricularId);
      // Dropped from the list rather than re-read, for the same reason an update
      // is applied in place.
      this.extraCurriculars = this.extraCurriculars.filter(
        (activity) => activity.extraCurricularId !== extraCurricularId,
      );
      this.renderExtraCurriculars();
    } catch (err) {
      this.activityTable!.showRowError(extraCurricularId, this.messageFor(err));
    }
  };

  private handleFormSubmitted = async (event: Event): Promise<void> => {
    const detail = (event as CustomEvent<ExtraCurricularInput>).detail;
    this.clearError();

    try {
      await createExtraCurricular(detail);
      this.activityForm!.reset();
      // Filters are cleared alongside the form: an activity created outside the
      // current selection would otherwise be indistinguishable from one that
      // silently failed.
      this.filterBar!.reset();
      this.filters = {};
      await this.loadExtraCurriculars();
    } catch (err) {
      // The reason belongs on the form itself, beside the values the user
      // entered — which stay put so the create can be corrected and retried.
      this.activityForm!.showError(this.messageFor(err));
    }
  };

  /**
   * A slot the panel has already judged addable. Reloading the catalogue is what
   * puts it into both the panel and the row's Practice Times cell, so the change
   * shows without the user reloading the page.
   */
  private handlePracticeTimeAdd = async (event: Event): Promise<void> => {
    const detail = (event as CustomEvent<{ extraCurricularId: string; day: DayType; startTime: string }>).detail;

    try {
      await addPracticeTime(detail.extraCurricularId, { day: detail.day, startTime: detail.startTime });
      await this.loadExtraCurriculars();
    } catch (err) {
      // The reason belongs on the panel, beside the controls that produced it —
      // not on the page banner above an unrelated part of the screen.
      this.activityTable!.showPanelError(this.messageFor(err));
    }
  };

  private handlePracticeTimeRemove = async (event: Event): Promise<void> => {
    const detail = (event as CustomEvent<{ extraCurricularId: string; practiceTimeId: string }>).detail;

    try {
      await removePracticeTime(detail.extraCurricularId, detail.practiceTimeId);
      await this.loadExtraCurriculars();
    } catch (err) {
      this.activityTable!.showPanelError(this.messageFor(err));
    }
  };

  private handleFilterChanged = (event: Event): void => {
    this.filters = (event as CustomEvent<ExtraCurricularFilters>).detail;
    this.renderExtraCurriculars();
  };

  /** Reads the catalogue; only a create or the first render needs a round trip. */
  private loadExtraCurriculars = async (): Promise<void> => {
    try {
      this.extraCurriculars = await getExtraCurriculars();
      this.renderExtraCurriculars();
    } catch (err) {
      this.showError(this.messageFor(err));
    }
  };

  private renderExtraCurriculars(): void {
    this.activityTable!.extraCurriculars = filterExtraCurriculars(this.extraCurriculars, this.filters);
  }

  private messageFor(err: unknown): string {
    return err instanceof ExtraCurricularsError ? err.message : 'An unexpected error occurred';
  }

  private showError(message: string): void {
    this.errorBanner!.textContent = message;
    this.errorBanner!.classList.add('extra-curriculars__error--visible');
  }

  private clearError(): void {
    this.errorBanner!.textContent = '';
    this.errorBanner!.classList.remove('extra-curriculars__error--visible');
  }
}

customElements.define('pm-extra-curriculars-page', PmExtraCurricularsPage);
