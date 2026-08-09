import '../components/pm-teacher-header';
import '../components/pm-teacher-profile-section';
import '../components/pm-link-constraint-notice';
import '../components/pm-link-account-modal';
import '../components/pm-unlink-account-modal';
import '../components/pm-banking-section';
import '../components/pm-banking-delete-modal';
import '../components/pm-banking-activity-modal';
import '../components/pm-teacher-deactivate-modal';
import '../components/pm-teacher-delete-modal';
import {
  getTeacherById,
  updateTeacherProfile,
  updateTeacherClassification,
  unlinkTeacherAccount,
  linkTeacherAccount,
  getLinkableAccounts,
  createBankingDetails,
  updateBankingDetails,
  deleteBankingDetails,
  revealAccountNumber,
  getBankingActivity,
  deactivateTeacher,
  reactivateTeacher,
  deleteTeacher,
  TeachersError,
  type BankingDetailsInput,
  type TeacherProfileInput,
  type TeacherResult,
} from '../services/teachers';
import type { PmTeacherHeader } from '../components/pm-teacher-header';
import type { PmTeacherProfileSection } from '../components/pm-teacher-profile-section';
import type { PmLinkAccountModal } from '../components/pm-link-account-modal';
import type { PmUnlinkAccountModal } from '../components/pm-unlink-account-modal';
import type { PmBankingSection } from '../components/pm-banking-section';
import type { PmBankingDeleteModal } from '../components/pm-banking-delete-modal';
import type { PmBankingActivityModal } from '../components/pm-banking-activity-modal';
import type { PmTeacherDeactivateModal } from '../components/pm-teacher-deactivate-modal';
import type { PmTeacherDeleteModal } from '../components/pm-teacher-delete-modal';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      flex: 1;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .detail-page__error {
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
      font-size: 13px;
      display: none;
    }
    .detail-page__error--visible {
      display: block;
    }
    /* Profile and banking sit side by side: they are the two halves of a
       teacher's record and neither is subordinate to the other. Each section
       carries its own top margin, so the columns line up without one here. */
    .detail-page__columns {
      display: grid;
      grid-template-columns: 1fr 1fr;
      align-items: start;
      gap: 24px;
    }
    /* Below this the two cards' field grids get too narrow to read, so they
       stack in the same order they appear side by side. */
    @media (max-width: 900px) {
      .detail-page__columns {
        grid-template-columns: 1fr;
        gap: 0;
      }
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <pm-teacher-header id="header"></pm-teacher-header>
  <pm-link-constraint-notice id="linkNotice" hidden></pm-link-constraint-notice>
  <pm-link-account-modal id="linkModal"></pm-link-account-modal>
  <pm-unlink-account-modal id="unlinkModal"></pm-unlink-account-modal>
  <div class="detail-page__error" id="error"></div>
  <div class="detail-page__columns">
    <pm-teacher-profile-section id="profileSection"></pm-teacher-profile-section>
    <pm-banking-section id="bankingSection"></pm-banking-section>
  </div>
  <pm-banking-delete-modal id="bankingDeleteModal"></pm-banking-delete-modal>
  <pm-banking-activity-modal id="bankingActivityModal"></pm-banking-activity-modal>
  <pm-teacher-deactivate-modal id="deactivateModal"></pm-teacher-deactivate-modal>
  <pm-teacher-delete-modal id="deleteModal"></pm-teacher-delete-modal>
`;

export class PmTeacherDetailPage extends HTMLElement {
  private header: PmTeacherHeader | null = null;
  private profileSection: PmTeacherProfileSection | null = null;
  private errorBanner: HTMLElement | null = null;
  private linkNotice: HTMLElement | null = null;
  private linkModal: PmLinkAccountModal | null = null;
  private unlinkModal: PmUnlinkAccountModal | null = null;
  private bankingSection: PmBankingSection | null = null;
  private bankingDeleteModal: PmBankingDeleteModal | null = null;
  private bankingActivityModal: PmBankingActivityModal | null = null;
  private deactivateModal: PmTeacherDeactivateModal | null = null;
  private deleteModal: PmTeacherDeleteModal | null = null;
  private _teacher: TeacherResult | null = null;
  private _teacherId: string | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.header = this.shadowRoot!.getElementById('header') as unknown as PmTeacherHeader;
    this.profileSection = this.shadowRoot!.getElementById('profileSection') as unknown as PmTeacherProfileSection;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;
    this.linkNotice = this.shadowRoot!.getElementById('linkNotice') as HTMLElement;
    this.linkModal = this.shadowRoot!.getElementById('linkModal') as unknown as PmLinkAccountModal;
    this.unlinkModal = this.shadowRoot!.getElementById('unlinkModal') as unknown as PmUnlinkAccountModal;
    this.bankingSection = this.shadowRoot!.getElementById('bankingSection') as unknown as PmBankingSection;
    this.bankingDeleteModal = this.shadowRoot!.getElementById('bankingDeleteModal') as unknown as PmBankingDeleteModal;
    this.bankingActivityModal = this.shadowRoot!.getElementById(
      'bankingActivityModal',
    ) as unknown as PmBankingActivityModal;
    this.deactivateModal = this.shadowRoot!.getElementById('deactivateModal') as unknown as PmTeacherDeactivateModal;
    this.deleteModal = this.shadowRoot!.getElementById('deleteModal') as unknown as PmTeacherDeleteModal;

    this.shadowRoot!.addEventListener('teacher-profile-update-requested', this.handleProfileUpdateRequested);
    this.shadowRoot!.addEventListener('teacher-banking-save-requested', this.handleBankingSaveRequested);
    this.shadowRoot!.addEventListener('teacher-banking-delete-requested', this.handleBankingDeleteRequested);
    this.shadowRoot!.addEventListener('teacher-banking-delete-confirmed', this.handleBankingDeleteConfirmed);
    this.shadowRoot!.addEventListener('teacher-banking-reveal-requested', this.handleBankingRevealRequested);
    this.shadowRoot!.addEventListener('teacher-banking-activity-requested', this.handleBankingActivityRequested);
    this.shadowRoot!.addEventListener('teacher-account-link-requested', this.handleAccountLinkRequested);
    this.shadowRoot!.addEventListener('teacher-account-link-confirmed', this.handleAccountLinkConfirmed);
    this.shadowRoot!.addEventListener('teacher-account-unlink-requested', this.handleAccountUnlinkRequested);
    this.shadowRoot!.addEventListener('teacher-account-unlink-confirmed', this.handleAccountUnlinkConfirmed);
    this.shadowRoot!.addEventListener('teacher-deactivate-requested', this.handleDeactivateRequested);
    this.shadowRoot!.addEventListener('teacher-deactivate-confirmed', this.handleDeactivateConfirmed);
    this.shadowRoot!.addEventListener('teacher-reactivate-requested', this.handleReactivateRequested);
    this.shadowRoot!.addEventListener('teacher-delete-requested', this.handleDeleteRequested);
    this.shadowRoot!.addEventListener('teacher-delete-confirmed', this.handleDeleteConfirmed);
    this.shadowRoot!.addEventListener(
      'teacher-classification-change-requested',
      this.handleClassificationChangeRequested,
    );

    this._teacherId = this.getAttribute('teacher-id');
    if (this._teacherId) void this.loadTeacher(this._teacherId);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener('teacher-profile-update-requested', this.handleProfileUpdateRequested);
    this.shadowRoot!.removeEventListener('teacher-banking-save-requested', this.handleBankingSaveRequested);
    this.shadowRoot!.removeEventListener('teacher-banking-delete-requested', this.handleBankingDeleteRequested);
    this.shadowRoot!.removeEventListener('teacher-banking-delete-confirmed', this.handleBankingDeleteConfirmed);
    this.shadowRoot!.removeEventListener('teacher-banking-reveal-requested', this.handleBankingRevealRequested);
    this.shadowRoot!.removeEventListener('teacher-banking-activity-requested', this.handleBankingActivityRequested);
    this.shadowRoot!.removeEventListener('teacher-account-link-requested', this.handleAccountLinkRequested);
    this.shadowRoot!.removeEventListener('teacher-account-link-confirmed', this.handleAccountLinkConfirmed);
    this.shadowRoot!.removeEventListener('teacher-account-unlink-requested', this.handleAccountUnlinkRequested);
    this.shadowRoot!.removeEventListener('teacher-account-unlink-confirmed', this.handleAccountUnlinkConfirmed);
    this.shadowRoot!.removeEventListener('teacher-deactivate-requested', this.handleDeactivateRequested);
    this.shadowRoot!.removeEventListener('teacher-deactivate-confirmed', this.handleDeactivateConfirmed);
    this.shadowRoot!.removeEventListener('teacher-reactivate-requested', this.handleReactivateRequested);
    this.shadowRoot!.removeEventListener('teacher-delete-requested', this.handleDeleteRequested);
    this.shadowRoot!.removeEventListener('teacher-delete-confirmed', this.handleDeleteConfirmed);
    this.shadowRoot!.removeEventListener(
      'teacher-classification-change-requested',
      this.handleClassificationChangeRequested,
    );
  }

  set teacherId(value: string) {
    this._teacherId = value;
    void this.loadTeacher(value);
  }

  private handleProfileUpdateRequested = async (event: Event): Promise<void> => {
    const { teacherId, input } = (event as CustomEvent<{ teacherId: string; input: TeacherProfileInput }>).detail;
    try {
      this.applyTeacher(await updateTeacherProfile(teacherId, input));
      this.profileSection!.closeEdit();
    } catch (err) {
      this.profileSection!.showEditError(this.messageOf(err));
    }
  };

  /**
   * The classification persists immediately on toggle. A failed save reverts
   * the switch to the last persisted value so the UI never shows unpersisted
   * state as persisted.
   */
  private handleClassificationChangeRequested = async (event: Event): Promise<void> => {
    const { teacherId, isPrivate } = (event as CustomEvent<{ teacherId: string; isPrivate: boolean }>).detail;
    try {
      this.applyTeacher(await updateTeacherClassification(teacherId, isPrivate));
    } catch (err) {
      this.profileSection!.revertClassification(this.messageOf(err));
    }
  };

  /** Opens the picker only once the eligible accounts are in hand. */
  private handleAccountLinkRequested = async (): Promise<void> => {
    this.clearError();
    try {
      this.linkModal!.show(await getLinkableAccounts());
    } catch (err) {
      this.showError(err);
    }
  };

  private handleAccountLinkConfirmed = async (event: Event): Promise<void> => {
    const { accountId } = (event as CustomEvent<{ accountId: string }>).detail;
    try {
      this.applyTeacher(await linkTeacherAccount(this._teacherId!, accountId));
      this.linkModal!.close();
    } catch (err) {
      // The modal stays open on a rejection so another account can be chosen.
      this.linkModal!.showError(this.messageOf(err));
    }
  };

  private handleAccountUnlinkRequested = (): void => {
    this.unlinkModal!.show(this._teacher?.linkedAccountEmail ?? null);
  };

  private handleAccountUnlinkConfirmed = async (): Promise<void> => {
    this.clearError();
    try {
      this.applyTeacher(await unlinkTeacherAccount(this._teacherId!));
    } catch (err) {
      this.showError(err);
    }
  };

  private handleBankingSaveRequested = async (event: Event): Promise<void> => {
    const { teacherId, mode, input } = (
      event as CustomEvent<{ teacherId: string; mode: 'create' | 'edit'; input: BankingDetailsInput }>
    ).detail;

    try {
      const banking =
        mode === 'create' ? await createBankingDetails(teacherId, input) : await updateBankingDetails(teacherId, input);

      this.applyTeacher({ ...this._teacher!, banking });
      this.bankingSection!.closeForm();
    } catch (err) {
      // The form stays open on a rejection so the values can be corrected.
      this.bankingSection!.showFormError(this.messageOf(err));
    }
  };

  private handleBankingDeleteRequested = (event: Event): void => {
    const { accountNumberLast4 } = (event as CustomEvent<{ accountNumberLast4: string }>).detail;
    this.bankingDeleteModal!.show(accountNumberLast4);
  };

  private handleBankingDeleteConfirmed = async (): Promise<void> => {
    this.clearError();
    try {
      await deleteBankingDetails(this._teacherId!);
      this.applyTeacher({ ...this._teacher!, banking: null });
    } catch (err) {
      this.showError(err);
    }
  };

  /**
   * The full number is fetched, handed to the section, and never stored on this
   * page — the only place it lives is the element that is displaying it, until
   * the record is reloaded or hidden.
   */
  private handleBankingRevealRequested = async (event: Event): Promise<void> => {
    const { teacherId } = (event as CustomEvent<{ teacherId: string }>).detail;
    this.clearError();
    try {
      this.bankingSection!.showRevealed(await revealAccountNumber(teacherId));
    } catch (err) {
      this.showError(err);
    }
  };

  private handleBankingActivityRequested = async (): Promise<void> => {
    this.clearError();
    try {
      this.bankingActivityModal!.show(await getBankingActivity(this._teacherId!));
    } catch (err) {
      this.showError(err);
    }
  };

  private handleDeactivateRequested = (): void => {
    this.deactivateModal!.show(this.teacherName());
  };

  private handleDeactivateConfirmed = async (): Promise<void> => {
    this.clearError();
    try {
      this.applyTeacher(await deactivateTeacher(this._teacherId!));
    } catch (err) {
      this.showError(err);
    }
  };

  private handleReactivateRequested = async (): Promise<void> => {
    this.clearError();
    try {
      this.applyTeacher(await reactivateTeacher(this._teacherId!));
    } catch (err) {
      this.showError(err);
    }
  };

  private handleDeleteRequested = (): void => {
    this.deleteModal!.show(this.teacherName());
  };

  /** The record is gone, so there is nothing left to show — the roster is. */
  private handleDeleteConfirmed = async (): Promise<void> => {
    this.clearError();
    try {
      await deleteTeacher(this._teacherId!);
      window.location.hash = '#/teachers';
    } catch (err) {
      this.showError(err);
    }
  };

  private teacherName(): string {
    return this._teacher ? `${this._teacher.firstName} ${this._teacher.surname}` : 'this teacher';
  }

  private async loadTeacher(teacherId: string): Promise<void> {
    this.clearError();
    try {
      this.applyTeacher(await getTeacherById(teacherId));
    } catch (err) {
      this.showError(err);
    }
  }

  private applyTeacher(teacher: TeacherResult): void {
    this._teacher = teacher;
    this.header!.teacher = teacher;
    this.profileSection!.teacher = teacher;
    this.bankingSection!.teacher = teacher;
    this.linkNotice!.hidden = teacher.linkedAccountId === null;
  }

  private messageOf(err: unknown): string {
    return err instanceof TeachersError ? err.message : 'An unexpected error occurred';
  }

  private showError(err: unknown): void {
    this.errorBanner!.textContent = this.messageOf(err);
    this.errorBanner!.classList.add('detail-page__error--visible');
  }

  private clearError(): void {
    this.errorBanner!.classList.remove('detail-page__error--visible');
  }
}

customElements.define('pm-teacher-detail-page', PmTeacherDetailPage);
