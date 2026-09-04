import '../components/pm-waiting-list-table';
import '../components/pm-student-wizard-modal';
import '../components/pm-delete-waiting-list-entry-modal';
import '../components/pm-delete-guardian-modal';
import { hasAnyRole } from '../../../services/token-storage';
import {
  getWaitingList,
  getLessonStructures,
  captureWaitingListStudent,
  updateWaitingListEntry,
  updateWaitingListStudent,
  removeWaitingListStudent,
  WaitingListError,
  type OccurrenceType,
  type WaitingListEntryInput,
  type WaitingListEntryResult,
} from '../services/waiting-list';
import {
  getStudents,
  getStudentById,
  getSiblings,
  addSibling,
  removeSibling,
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
  GuardiansError,
  type GuardianInput,
  type GuardianResult,
} from '../services/guardians';
import type { PmWaitingListTable } from '../components/pm-waiting-list-table';
import type { PmStudentWizardModal } from '../components/pm-student-wizard-modal';
import type { PmDeleteWaitingListEntryModal } from '../components/pm-delete-waiting-list-entry-modal';
import type { PmDeleteGuardianModal, GuardianDeleteScope } from '../components/pm-delete-guardian-modal';

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
  <pm-delete-waiting-list-entry-modal id="deleteModal"></pm-delete-waiting-list-entry-modal>
  <pm-delete-guardian-modal id="deleteGuardianModal"></pm-delete-guardian-modal>
`;

export class PmWaitingListPage extends HTMLElement {
  private table: PmWaitingListTable | null = null;
  private captureBtn: HTMLButtonElement | null = null;
  private wizardModal: PmStudentWizardModal | null = null;
  private deleteModal: PmDeleteWaitingListEntryModal | null = null;
  private deleteGuardianModal: PmDeleteGuardianModal | null = null;
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
    this.deleteModal = this.shadowRoot!.getElementById('deleteModal') as unknown as PmDeleteWaitingListEntryModal;
    this.deleteGuardianModal = this.shadowRoot!.getElementById(
      'deleteGuardianModal',
    ) as unknown as PmDeleteGuardianModal;
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
    this.shadowRoot!.addEventListener('waiting-list-edit-requested', this.handleEditRequested);
    this.shadowRoot!.addEventListener('student-update-requested', this.handleStudentUpdateRequested);
    this.shadowRoot!.addEventListener('waiting-list-entry-update-requested', this.handleEntryUpdateRequested);
    this.shadowRoot!.addEventListener('waiting-list-remove-requested', this.handleRemoveRequested);
    this.shadowRoot!.addEventListener('waiting-list-student-remove-confirmed', this.handleRemoveConfirmed);
    this.shadowRoot!.addEventListener('siblings-tab-activated', this.handleSiblingsTabActivated);
    this.shadowRoot!.addEventListener('sibling-add-requested', this.handleSiblingAddRequested);
    this.shadowRoot!.addEventListener('sibling-remove-requested', this.handleSiblingRemoveRequested);
    this.shadowRoot!.addEventListener('guardians-tab-activated', this.handleGuardiansTabActivated);
    this.shadowRoot!.addEventListener('guardian-add-requested', this.handleGuardianAddRequested);
    this.shadowRoot!.addEventListener('guardian-update-requested', this.handleGuardianUpdateRequested);
    this.shadowRoot!.addEventListener('guardian-delete-requested', this.handleGuardianDeleteRequested);
    this.shadowRoot!.addEventListener('guardian-delete-confirmed', this.handleGuardianDeleteConfirmed);
    this.shadowRoot!.addEventListener('guardians-sync-requested', this.handleGuardiansSyncRequested);

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
    this.shadowRoot!.removeEventListener('waiting-list-edit-requested', this.handleEditRequested);
    this.shadowRoot!.removeEventListener('student-update-requested', this.handleStudentUpdateRequested);
    this.shadowRoot!.removeEventListener('waiting-list-entry-update-requested', this.handleEntryUpdateRequested);
    this.shadowRoot!.removeEventListener('waiting-list-remove-requested', this.handleRemoveRequested);
    this.shadowRoot!.removeEventListener('waiting-list-student-remove-confirmed', this.handleRemoveConfirmed);
    this.shadowRoot!.removeEventListener('siblings-tab-activated', this.handleSiblingsTabActivated);
    this.shadowRoot!.removeEventListener('sibling-add-requested', this.handleSiblingAddRequested);
    this.shadowRoot!.removeEventListener('sibling-remove-requested', this.handleSiblingRemoveRequested);
    this.shadowRoot!.removeEventListener('guardians-tab-activated', this.handleGuardiansTabActivated);
    this.shadowRoot!.removeEventListener('guardian-add-requested', this.handleGuardianAddRequested);
    this.shadowRoot!.removeEventListener('guardian-update-requested', this.handleGuardianUpdateRequested);
    this.shadowRoot!.removeEventListener('guardian-delete-requested', this.handleGuardianDeleteRequested);
    this.shadowRoot!.removeEventListener('guardian-delete-confirmed', this.handleGuardianDeleteConfirmed);
    this.shadowRoot!.removeEventListener('guardians-sync-requested', this.handleGuardiansSyncRequested);
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
   * Settled independently rather than as one `Promise.all`: a failure on any
   * one of these three must never sink the other two, so each lookup is
   * assigned — or its own failure surfaced — on its own. No rejection here is
   * an expected, silently-absorbed outcome for anyone; every one of the three
   * is shown.
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
        waitingListInput: WaitingListEntryInput;
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

  /**
   * The row carries the entry's own fields but not the student's, and a
   * waiting-list student is deliberately absent from the cached roster, so
   * their details are read directly before the wizard opens. The occurrence
   * type comes from the group the row was rendered under — the entry itself
   * does not carry one.
   */
  private handleEditRequested = async (event: Event): Promise<void> => {
    const { entry, occurrenceType } = (
      event as CustomEvent<{ entry: WaitingListEntryResult; occurrenceType: OccurrenceType }>
    ).detail;
    this.clearError();
    this.clearSuccess();
    try {
      const student = await getStudentById(entry.studentId);
      this.wizardModal!.openForWaitingListEdit(student, {
        waitingListEntryId: entry.waitingListEntryId,
        occurrenceType,
        lessonType: entry.lessonType,
        durationType: entry.durationType,
        instrumentType: entry.instrumentType,
        notes: entry.notes,
        addedAt: entry.addedAt,
      });
    } catch (err) {
      this.showError(err);
    }
  };

  /**
   * The Student tab's own save. It goes through the waiting list's own update
   * rather than the roster's, which is a Teacher's — the same fields, reached
   * by the role that owns this screen.
   */
  private handleStudentUpdateRequested = async (event: Event): Promise<void> => {
    const { studentId, input } = (event as CustomEvent<{ studentId: string; input: StudentInput }>).detail;
    this.clearError();
    try {
      await updateWaitingListStudent(studentId, input);
      this.wizardModal!.close();
      await this.loadWaitingList();
    } catch (err) {
      this.wizardModal!.showStudentError(
        err instanceof WaitingListError ? err.message : 'An unexpected error occurred',
      );
    }
  };

  /** The Waiting List tab's own save, scoped to the entry and nothing else. */
  private handleEntryUpdateRequested = async (event: Event): Promise<void> => {
    const { waitingListEntryId, input } = (
      event as CustomEvent<{ waitingListEntryId: string; input: WaitingListEntryInput }>
    ).detail;
    this.clearError();
    try {
      await updateWaitingListEntry(waitingListEntryId, input);
      this.wizardModal!.close();
      await this.loadWaitingList();
    } catch (err) {
      this.wizardModal!.showWaitingListError(
        err instanceof WaitingListError ? err.message : 'An unexpected error occurred',
      );
    }
  };

  private handleRemoveRequested = (event: Event): void => {
    const { entry } = (event as CustomEvent<{ entry: WaitingListEntryResult }>).detail;
    this.clearError();
    this.clearSuccess();
    this.deleteModal!.show(entry.studentId, `${entry.firstName} ${entry.lastName}`);
  };

  private handleRemoveConfirmed = async (event: Event): Promise<void> => {
    const { studentId, name } = (event as CustomEvent<{ studentId: string; name: string }>).detail;
    this.clearError();
    try {
      await removeWaitingListStudent(studentId);
      await this.loadWaitingList();
      this.showSuccess(`${name} and their waiting-list entry were removed.`);
    } catch (err) {
      this.showError(err);
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
        guardian.restricted,
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
