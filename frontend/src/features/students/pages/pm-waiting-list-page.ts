import '../components/pm-waiting-list-table';
import '../components/pm-student-wizard-modal';
import { hasAnyRole } from '../../../services/token-storage';
import {
  getWaitingList,
  getLessonStructures,
  captureWaitingListStudent,
  WaitingListError,
  type WaitingListCaptureInput,
} from '../services/waiting-list';
import { getStudents, StudentsError, type StudentInput, type StudentResult } from '../services/students';
import {
  getGuardians,
  addGuardian,
  getGuardianRelationships,
  GuardiansError,
  type GuardianInput,
  type GuardianResult,
} from '../services/guardians';
import { addSibling } from '../services/students';
import type { PmWaitingListTable } from '../components/pm-waiting-list-table';
import type { PmStudentWizardModal } from '../components/pm-student-wizard-modal';

/** Who may capture a student and act on a row. A Teacher gets a read-only page. */
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
    .waiting-list-page__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .waiting-list-page__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--pm-text);
      margin: 0;
    }
    .waiting-list-page__capture-btn {
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
    .waiting-list-page__capture-btn:hover {
      filter: brightness(1.1);
    }
    .waiting-list-page__error {
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
      font-size: 13px;
      display: none;
    }
    .waiting-list-page__error--visible {
      display: block;
    }
    .waiting-list-page__success {
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(46, 160, 67, 0.1);
      border: 1px solid #2ea043;
      color: #2ea043;
      font-size: 13px;
      display: none;
    }
    .waiting-list-page__success--visible {
      display: block;
    }
    [hidden] {
      display: none !important;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="waiting-list-page__header">
    <h1 class="waiting-list-page__title">Waiting List</h1>
    <button type="button" class="waiting-list-page__capture-btn" id="captureBtn" hidden>Capture Student</button>
  </div>
  <div class="waiting-list-page__success" id="success"></div>
  <div class="waiting-list-page__error" id="error"></div>
  <pm-waiting-list-table id="table"></pm-waiting-list-table>
  <pm-student-wizard-modal id="wizardModal"></pm-student-wizard-modal>
`;

export class PmWaitingListPage extends HTMLElement {
  private table: PmWaitingListTable | null = null;
  private captureBtn: HTMLButtonElement | null = null;
  private wizardModal: PmStudentWizardModal | null = null;
  private errorBanner: HTMLElement | null = null;
  private successBanner: HTMLElement | null = null;
  private _allStudents: StudentResult[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.table = this.shadowRoot!.getElementById('table') as unknown as PmWaitingListTable;
    this.captureBtn = this.shadowRoot!.getElementById('captureBtn') as HTMLButtonElement;
    this.wizardModal = this.shadowRoot!.getElementById('wizardModal') as unknown as PmStudentWizardModal;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;
    this.successBanner = this.shadowRoot!.getElementById('success') as HTMLElement;

    // A Teacher gets a read-only page: the table renders as it does for
    // anyone, and the capture action is absent rather than disabled —
    // matching how the endpoint answers them.
    const canMaintain = hasAnyRole(MAINTAINER_ROLES);
    this.captureBtn.hidden = !canMaintain;
    this.table.showActions = canMaintain;

    this.captureBtn.addEventListener('click', this.handleCaptureClick);
    this.shadowRoot!.addEventListener('waiting-list-capture-requested', this.handleCaptureRequested);
    this.shadowRoot!.addEventListener('create-guardians-preview-requested', this.handleCreateGuardiansPreviewRequested);

    void this.loadWaitingList();

    if (canMaintain) {
      void this.loadWizardLookups();
    }
  }

  disconnectedCallback(): void {
    this.captureBtn?.removeEventListener('click', this.handleCaptureClick);
    this.shadowRoot!.removeEventListener('waiting-list-capture-requested', this.handleCaptureRequested);
    this.shadowRoot!.removeEventListener(
      'create-guardians-preview-requested',
      this.handleCreateGuardiansPreviewRequested,
    );
  }

  private async loadWaitingList(): Promise<void> {
    this.clearError();
    try {
      this.table!.groups = await getWaitingList();
    } catch (err) {
      this.showError(err);
    }
  }

  /**
   * The Siblings/Guardians tabs' candidate list and relationship options, and
   * the Waiting List tab's lesson-structure lookup — everything the capture
   * wizard needs before it opens.
   *
   * Settled independently rather than as one `Promise.all`: `getStudents()`
   * is Teacher-gated (`GET /api/students`), so a Coordinator-only session
   * gets a 403 on it while `getGuardianRelationships()` and
   * `getLessonStructures()` succeed. A single `Promise.all` would let that
   * one rejection sink the whole batch, leaving the Waiting List tab's own
   * lookup unassigned and Save silently unable to resolve a lesson structure
   * — see #299 (ruling R8). An empty sibling-candidate list is the accepted
   * degradation for a Coordinator-only session; widening `GET /api/students`
   * to Coordinator to avoid it is explicitly out of scope for this story.
   */
  private async loadWizardLookups(): Promise<void> {
    const [studentsResult, relationshipsResult, lessonStructuresResult] = await Promise.allSettled([
      getStudents(),
      getGuardianRelationships(),
      getLessonStructures(),
    ]);

    if (studentsResult.status === 'fulfilled') {
      this._allStudents = studentsResult.value;
    }
    // A rejection here (expected for a Coordinator-only session, since the
    // read is Teacher-gated) is not surfaced as a page error — an empty
    // sibling-candidate list is the accepted degradation, not a failure.

    if (relationshipsResult.status === 'fulfilled') {
      this.wizardModal!.guardianRelationships = relationshipsResult.value;
    } else {
      this.showError(relationshipsResult.reason);
    }

    if (lessonStructuresResult.status === 'fulfilled') {
      this.wizardModal!.lessonStructures = lessonStructuresResult.value;
    } else {
      this.showError(lessonStructuresResult.reason);
    }
  }

  private handleCaptureClick = (): void => {
    this.clearSuccess();
    this.wizardModal!.openForCreate(this._allStudents, 'waitingList');
  };

  private handleCaptureRequested = async (event: Event): Promise<void> => {
    const { input, pendingSiblingIds, pendingGuardians, waitingListInput } = (
      event as CustomEvent<{
        input: StudentInput;
        pendingSiblingIds: string[];
        pendingGuardians: GuardianInput[];
        waitingListInput: WaitingListCaptureInput;
      }>
    ).detail;
    this.clearError();
    try {
      const created = await captureWaitingListStudent(input, waitingListInput);
      this.wizardModal!.close();
      await this.loadWaitingList();
      if (pendingSiblingIds.length > 0) {
        await this.linkPendingSiblings(created.studentId, pendingSiblingIds);
      }
      if (pendingGuardians.length > 0) {
        await this.linkPendingGuardians(created.studentId, pendingGuardians);
      }
      this.showSuccess(`${created.firstName} ${created.lastName} was added to the waiting list.`);
    } catch (err) {
      this.wizardModal!.showWaitingListError(
        err instanceof WaitingListError ? err.message : 'An unexpected error occurred',
      );
    }
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

  /**
   * The student is already created and visible on the list by this point, so
   * a failure here surfaces on the page banner rather than reopening the
   * (now-closed) wizard — the same reasoning the Students screen's own
   * create flow follows for its post-creation steps.
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

  private async linkPendingGuardians(studentId: string, guardians: GuardianInput[]): Promise<void> {
    try {
      for (const guardian of guardians) {
        await addGuardian(studentId, guardian);
      }
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

  private showError(err: unknown): void {
    this.errorBanner!.textContent =
      err instanceof WaitingListError || err instanceof StudentsError || err instanceof GuardiansError
        ? err.message
        : 'An unexpected error occurred';
    this.errorBanner!.classList.add('waiting-list-page__error--visible');
  }

  private clearError(): void {
    this.errorBanner!.textContent = '';
    this.errorBanner!.classList.remove('waiting-list-page__error--visible');
  }

  private showSuccess(message: string): void {
    this.successBanner!.textContent = message;
    this.successBanner!.classList.add('waiting-list-page__success--visible');
  }

  private clearSuccess(): void {
    this.successBanner!.textContent = '';
    this.successBanner!.classList.remove('waiting-list-page__success--visible');
  }
}

customElements.define('pm-waiting-list-page', PmWaitingListPage);
