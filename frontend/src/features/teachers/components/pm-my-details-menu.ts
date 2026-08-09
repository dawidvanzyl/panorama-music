import './pm-my-details-modal';
import './pm-banking-delete-modal';
import './pm-banking-activity-modal';
import { hasRole } from '../../../services/token-storage';
import {
  getOwnTeacher,
  updateOwnTeacherProfile,
  createOwnBankingDetails,
  updateOwnBankingDetails,
  deleteOwnBankingDetails,
  revealOwnAccountNumber,
  getOwnBankingActivity,
  TeachersError,
  type BankingDetailsInput,
  type TeacherProfileInput,
  type TeacherResult,
} from '../services/teachers';
import type { PmMyDetailsModal } from './pm-my-details-modal';
import type { PmBankingDeleteModal } from './pm-banking-delete-modal';
import type { PmBankingActivityModal } from './pm-banking-activity-modal';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
    }
    :host([hidden]) {
      display: none !important;
    }
    .my-details-menu__item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 12px;
      border: none;
      border-radius: var(--pm-radius);
      background: transparent;
      color: var(--pm-text);
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
    }
    .my-details-menu__item:hover {
      background: var(--pm-surface-2);
    }
    .my-details-menu__item-icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 20px;
      color: var(--pm-text-muted);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <button type="button" class="my-details-menu__item" id="openBtn" role="menuitem">
    <span class="my-details-menu__item-icon" aria-hidden="true">manage_accounts</span>My Details
  </button>
`;

// The dialogs are mounted on the document rather than beside the button. The
// button lives inside the account dropdown, which closes on the very click that
// opens the dialog — a dialog nested in it would be hidden along with it.
const dialogsTemplate = document.createElement('template');
dialogsTemplate.innerHTML = `
  <pm-my-details-modal id="modal"></pm-my-details-modal>
  <pm-banking-delete-modal id="bankingDeleteModal"></pm-banking-delete-modal>
  <pm-banking-activity-modal id="bankingActivityModal"></pm-banking-activity-modal>
  <div class="pm-my-details-error" id="error" hidden></div>
`;

/**
 * The account menu's own-record entry point, and the one place the self-service
 * endpoints are called from. The teachers feature owns this; the shared nav bar
 * only offers the slot it hangs in, which is what keeps a bounded context's
 * screens out of the application shell.
 *
 * It is offered only to a signed-in user whose account is linked to a teacher.
 * That is not a role question — an account can hold the Teacher role and be
 * linked to nothing — so it is settled by asking the server for the caller's own
 * record and hiding when there is none.
 */
export class PmMyDetailsMenu extends HTMLElement {
  private openBtn: HTMLButtonElement | null = null;
  private dialogs: HTMLElement | null = null;
  private modal: PmMyDetailsModal | null = null;
  private bankingDeleteModal: PmBankingDeleteModal | null = null;
  private bankingActivityModal: PmBankingActivityModal | null = null;
  private errorBanner: HTMLElement | null = null;
  private _teacher: TeacherResult | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.openBtn = this.shadowRoot!.getElementById('openBtn') as HTMLButtonElement;
    this.openBtn.addEventListener('click', this.handleOpen);

    // Hidden until the server confirms there is a record to open — the entry
    // point must not be offered to a user who has none.
    this.hidden = true;
    void this.loadOwnTeacher();
  }

  disconnectedCallback(): void {
    this.openBtn?.removeEventListener('click', this.handleOpen);
    this.dialogs?.removeEventListener('teacher-profile-update-requested', this.handleProfileUpdateRequested);
    this.dialogs?.removeEventListener('teacher-banking-save-requested', this.handleBankingSaveRequested);
    this.dialogs?.removeEventListener('teacher-banking-delete-requested', this.handleBankingDeleteRequested);
    this.dialogs?.removeEventListener('teacher-banking-delete-confirmed', this.handleBankingDeleteConfirmed);
    this.dialogs?.removeEventListener('teacher-banking-reveal-requested', this.handleBankingRevealRequested);
    this.dialogs?.removeEventListener('teacher-banking-activity-requested', this.handleBankingActivityRequested);
    this.dialogs?.remove();
    this.dialogs = null;
  }

  /** The dialogs, for tests and for anything that needs to drive them directly. */
  get dialogHost(): HTMLElement {
    return this.dialogs!;
  }

  /**
   * The dialogs are mounted only once there is a record to open. They carry
   * their own ids, and a user with no record would otherwise have a second set
   * of them on every page for a view they can never reach.
   */
  private mountDialogs(): void {
    if (this.dialogs) return;

    this.dialogs = document.createElement('div');
    this.dialogs.className = 'pm-my-details-dialogs';
    this.dialogs.appendChild(dialogsTemplate.content.cloneNode(true));
    document.body.appendChild(this.dialogs);

    this.modal = this.dialogs.querySelector('#modal') as unknown as PmMyDetailsModal;
    this.bankingDeleteModal = this.dialogs.querySelector('#bankingDeleteModal') as unknown as PmBankingDeleteModal;
    this.bankingActivityModal = this.dialogs.querySelector(
      '#bankingActivityModal',
    ) as unknown as PmBankingActivityModal;
    this.errorBanner = this.dialogs.querySelector('#error') as HTMLElement;

    this.dialogs.addEventListener('teacher-profile-update-requested', this.handleProfileUpdateRequested);
    this.dialogs.addEventListener('teacher-banking-save-requested', this.handleBankingSaveRequested);
    this.dialogs.addEventListener('teacher-banking-delete-requested', this.handleBankingDeleteRequested);
    this.dialogs.addEventListener('teacher-banking-delete-confirmed', this.handleBankingDeleteConfirmed);
    this.dialogs.addEventListener('teacher-banking-reveal-requested', this.handleBankingRevealRequested);
    this.dialogs.addEventListener('teacher-banking-activity-requested', this.handleBankingActivityRequested);
  }

  /**
   * A record is only worth asking for when the account could hold one: linking
   * requires the Teacher role, so an account without it is linked to nothing and
   * the request would be refused on every page load for no gain.
   */
  private async loadOwnTeacher(): Promise<void> {
    if (!hasRole('Teacher')) {
      this.announceAvailability();
      return;
    }

    try {
      this._teacher = await getOwnTeacher();
      this.mountDialogs();
      this.hidden = false;
    } catch {
      // A refusal is the expected answer for an account linked to no teacher,
      // and the answer to every other failure is the same: offer nothing.
      this._teacher = null;
      this.hidden = true;
    }

    this.announceAvailability();
  }

  private announceAvailability(): void {
    this.dispatchEvent(new CustomEvent('account-menu-changed', { bubbles: true, composed: true }));
  }

  private handleOpen = (): void => {
    if (!this._teacher) return;
    this.clearError();
    this.modal!.show(this._teacher);
  };

  private handleProfileUpdateRequested = async (event: Event): Promise<void> => {
    const { input } = (event as CustomEvent<{ input: TeacherProfileInput }>).detail;
    try {
      this.applyTeacher(await updateOwnTeacherProfile(input));
      this.modal!.closeEdit();
    } catch (err) {
      this.modal!.showEditError(this.messageOf(err));
    }
  };

  private handleBankingSaveRequested = async (event: Event): Promise<void> => {
    const { mode, input } = (event as CustomEvent<{ mode: 'create' | 'edit'; input: BankingDetailsInput }>).detail;
    try {
      const banking = mode === 'create' ? await createOwnBankingDetails(input) : await updateOwnBankingDetails(input);

      this.applyTeacher({ ...this._teacher!, banking });
      this.modal!.bankingSection.closeForm();
    } catch (err) {
      // The form stays open on a rejection so the values can be corrected.
      this.modal!.bankingSection.showFormError(this.messageOf(err));
    }
  };

  private handleBankingDeleteRequested = (event: Event): void => {
    const { accountNumberLast4 } = (event as CustomEvent<{ accountNumberLast4: string }>).detail;
    this.bankingDeleteModal!.show(accountNumberLast4);
  };

  private handleBankingDeleteConfirmed = async (): Promise<void> => {
    this.clearError();
    try {
      await deleteOwnBankingDetails();
      this.applyTeacher({ ...this._teacher!, banking: null });
    } catch (err) {
      this.showError(err);
    }
  };

  /**
   * The full number is handed straight to the section displaying it and never
   * kept here — the only copy is the one on screen, until it is hidden or the
   * record is reloaded.
   */
  private handleBankingRevealRequested = async (): Promise<void> => {
    this.clearError();
    try {
      this.modal!.bankingSection.showRevealed(await revealOwnAccountNumber());
    } catch (err) {
      this.showError(err);
    }
  };

  private handleBankingActivityRequested = async (): Promise<void> => {
    this.clearError();
    try {
      this.bankingActivityModal!.show(await getOwnBankingActivity());
    } catch (err) {
      this.showError(err);
    }
  };

  private applyTeacher(teacher: TeacherResult): void {
    this._teacher = teacher;
    this.modal!.teacher = teacher;
  }

  private messageOf(err: unknown): string {
    return err instanceof TeachersError ? err.message : 'An unexpected error occurred';
  }

  private showError(err: unknown): void {
    this.errorBanner!.textContent = this.messageOf(err);
    this.errorBanner!.hidden = false;
  }

  private clearError(): void {
    this.errorBanner!.hidden = true;
  }
}

customElements.define('pm-my-details-menu', PmMyDetailsMenu);
