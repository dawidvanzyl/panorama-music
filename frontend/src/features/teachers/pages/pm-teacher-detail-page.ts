import '../components/pm-teacher-header';
import '../components/pm-teacher-profile-section';
import '../components/pm-link-constraint-notice';
import '../components/pm-link-account-modal';
import '../components/pm-unlink-account-modal';
import {
  getTeacherById,
  updateTeacherProfile,
  updateTeacherClassification,
  unlinkTeacherAccount,
  linkTeacherAccount,
  getLinkableAccounts,
  TeachersError,
  type TeacherProfileInput,
  type TeacherResult,
} from '../services/teachers';
import type { PmTeacherHeader } from '../components/pm-teacher-header';
import type { PmTeacherProfileSection } from '../components/pm-teacher-profile-section';
import type { PmLinkAccountModal } from '../components/pm-link-account-modal';
import type { PmUnlinkAccountModal } from '../components/pm-unlink-account-modal';

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
  `);

const template = document.createElement('template');
template.innerHTML = `

  <pm-teacher-header id="header"></pm-teacher-header>
  <pm-link-constraint-notice id="linkNotice" hidden></pm-link-constraint-notice>
  <pm-link-account-modal id="linkModal"></pm-link-account-modal>
  <pm-unlink-account-modal id="unlinkModal"></pm-unlink-account-modal>
  <div class="detail-page__error" id="error"></div>
  <pm-teacher-profile-section id="profileSection"></pm-teacher-profile-section>
`;

export class PmTeacherDetailPage extends HTMLElement {
  private header: PmTeacherHeader | null = null;
  private profileSection: PmTeacherProfileSection | null = null;
  private errorBanner: HTMLElement | null = null;
  private linkNotice: HTMLElement | null = null;
  private linkModal: PmLinkAccountModal | null = null;
  private unlinkModal: PmUnlinkAccountModal | null = null;
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

    this.shadowRoot!.addEventListener('teacher-profile-update-requested', this.handleProfileUpdateRequested);
    this.shadowRoot!.addEventListener('teacher-account-link-requested', this.handleAccountLinkRequested);
    this.shadowRoot!.addEventListener('teacher-account-link-confirmed', this.handleAccountLinkConfirmed);
    this.shadowRoot!.addEventListener('teacher-account-unlink-requested', this.handleAccountUnlinkRequested);
    this.shadowRoot!.addEventListener('teacher-account-unlink-confirmed', this.handleAccountUnlinkConfirmed);
    this.shadowRoot!.addEventListener(
      'teacher-classification-change-requested',
      this.handleClassificationChangeRequested,
    );

    this._teacherId = this.getAttribute('teacher-id');
    if (this._teacherId) void this.loadTeacher(this._teacherId);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener('teacher-profile-update-requested', this.handleProfileUpdateRequested);
    this.shadowRoot!.removeEventListener('teacher-account-link-requested', this.handleAccountLinkRequested);
    this.shadowRoot!.removeEventListener('teacher-account-link-confirmed', this.handleAccountLinkConfirmed);
    this.shadowRoot!.removeEventListener('teacher-account-unlink-requested', this.handleAccountUnlinkRequested);
    this.shadowRoot!.removeEventListener('teacher-account-unlink-confirmed', this.handleAccountUnlinkConfirmed);
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
