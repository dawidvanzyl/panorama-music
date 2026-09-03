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
   * Settled independently rather than as one `Promise.all` (ruling R8 part 1,
   * standing): a failure on any one of these three must never sink the other
   * two, so each lookup is assigned — or its own failure surfaced — on its
   * own. `GET /api/students` was Teacher-gated when this was first written,
   * which meant a Coordinator-only session predictably 403'd on
   * `getStudents()` alone; ruling R9 widened that read to
   * `TeacherOrCoordinatorPolicy` (a Coordinator capturing a waiting-list
   * student needs it for the Siblings tab's own candidate list — the
   * "accepted degradation" R8 first proposed for that gap would have gutted
   * the tab for this story's own primary actor). A rejection here is no
   * longer an expected, silently-absorbed outcome for anyone; it is shown
   * the same way a `getGuardianRelationships()`/`getLessonStructures()`
   * failure already is.
   */
  private async loadWizardLookups(): Promise<void> {
    const [studentsResult, relationshipsResult, lessonStructuresResult] = await Promise.allSettled([
      getStudents(),
      getGuardianRelationships(),
      getLessonStructures(),
    ]);

    if (studentsResult.status === 'fulfilled') {
      this._allStudents = studentsResult.value;
    } else {
      this.showError(studentsResult.reason);
    }

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
    this.clearSuccess();
    try {
      const created = await captureWaitingListStudent(input, waitingListInput);
      this.wizardModal!.close();
      await this.loadWaitingList();

      // The student and their waiting-list entry are already created and
      // visible by this point — a failure linking a sibling or guardian is a
      // partial capture, not a failed one, so the outcome must read as one or
      // the other, never both. showError leaves its banner up; the success
      // banner is skipped so the page never claims completion over a capture
      // that landed only part-way.
      const siblingsLinked =
        pendingSiblingIds.length === 0 || (await this.linkPendingSiblings(created.studentId, pendingSiblingIds));
      const guardiansLinked =
        pendingGuardians.length === 0 || (await this.linkPendingGuardians(created.studentId, pendingGuardians));

      if (siblingsLinked && guardiansLinked) {
        this.showSuccess(`${created.firstName} ${created.lastName} was added to the waiting list.`);
      }
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
   * create flow follows for its post-creation steps. Returns whether every
   * staged sibling linked, so the caller knows not to also claim success.
   */
  private async linkPendingSiblings(studentId: string, siblingIds: string[]): Promise<boolean> {
    try {
      for (const siblingId of siblingIds) {
        await addSibling(studentId, siblingId);
      }
      return true;
    } catch (err) {
      this.showError(err);
      return false;
    }
  }

  /** Returns whether every staged guardian linked — see linkPendingSiblings. */
  private async linkPendingGuardians(studentId: string, guardians: GuardianInput[]): Promise<boolean> {
    try {
      for (const guardian of guardians) {
        await addGuardian(studentId, guardian);
      }
      return true;
    } catch (err) {
      this.showError(err);
      return false;
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
