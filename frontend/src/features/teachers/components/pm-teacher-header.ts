import './pm-linked-account-badge';
import { hasRole } from '../../../services/token-storage';
import type { TeacherResult } from '../services/teachers';
import type { PmLinkedAccountBadge } from './pm-linked-account-badge';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .header__back {
      display: inline-block;
      margin-bottom: 16px;
      color: var(--pm-accent);
      font-size: 14px;
      text-decoration: none;
    }
    .header__chips {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
    /* The link actions sit on the name's own line, pushed to the right, so the
       record's title row carries both the identity and what can be done to it. */
    .header__title-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      flex-wrap: wrap;
    }
    .header__name {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--pm-text);
      margin: 0;
    }
    .header__chip {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .header__chip--active {
      background: rgba(52, 168, 83, 0.15);
      color: #2e8f47;
    }
    .header__chip--deactivated {
      background: rgba(224, 82, 82, 0.15);
      color: var(--pm-danger, #e05252);
    }
    /* The classification chip carries the same two treatments the roster row
       uses, so a teacher reads the same in the list and on their record. */
    .header__chip--type-private {
      background: rgba(79, 124, 255, 0.12);
      color: var(--pm-accent);
    }
    .header__chip--type-school {
      background: rgba(124, 58, 237, 0.12);
      color: #7c3aed;
    }
    .header__actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    /* Same metrics as the Create Teacher button, so the record's primary
       actions read as one family. Both carry a permanent border. */
    .header__btn {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 8px 20px;
      border-radius: var(--pm-radius);
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      background: transparent;
    }
    .header__btn[hidden] {
      display: none;
    }
    .header__btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .header__btn--link {
      border: 1px solid var(--pm-accent);
      color: var(--pm-accent);
    }
    .header__btn--link:hover:not(:disabled) {
      background: rgba(79, 124, 255, 0.1);
    }
    .header__btn--unlink {
      border: 1px solid var(--pm-border);
      color: var(--pm-text-muted);
    }
    .header__btn--unlink:hover {
      background: var(--pm-surface-2);
    }
    /* The lifecycle actions carry the same treatments the User Directory's do:
       an outlined red deactivate, an outlined green activate, and a filled red
       delete. Ending a record should read the same whichever record it is. */
    .header__btn--deactivate {
      border: 1px solid var(--pm-danger, #e05252);
      color: var(--pm-danger, #e05252);
    }
    .header__btn--deactivate:hover {
      background: rgba(224, 82, 82, 0.1);
    }
    .header__btn--reactivate {
      border: 1px solid #8fd44e;
      color: #8fd44e;
    }
    .header__btn--reactivate:hover {
      background: rgba(143, 212, 78, 0.1);
    }
    .header__btn--delete {
      background: var(--pm-danger, #e05252);
      border: 1px solid var(--pm-danger, #e05252);
      color: #fff;
    }
    .header__btn--delete:hover {
      opacity: 0.9;
    }
    .header__btn-icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 18px;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <a href="#/teachers" class="header__back">&larr; All teachers</a>
  <div class="header__title-row">
    <h1 class="header__name" id="name"></h1>
    <div class="header__actions">
      <button type="button" class="header__btn header__btn--unlink" id="bankingActivityBtn" hidden>
        <span class="header__btn-icon" aria-hidden="true">receipt_long</span>Banking activity
      </button>
      <button type="button" class="header__btn header__btn--link" id="linkBtn" hidden>
        <span class="header__btn-icon" aria-hidden="true">link</span>Link account
      </button>
      <button type="button" class="header__btn header__btn--unlink" id="unlinkBtn" hidden>
        <span class="header__btn-icon" aria-hidden="true">link_off</span>Unlink account
      </button>
      <button type="button" class="header__btn header__btn--deactivate" id="deactivateBtn" hidden>
        <span class="header__btn-icon" aria-hidden="true">person_off</span>Deactivate
      </button>
      <button type="button" class="header__btn header__btn--reactivate" id="reactivateBtn" hidden>
        <span class="header__btn-icon" aria-hidden="true">person_check</span>Reactivate
      </button>
      <button type="button" class="header__btn header__btn--delete" id="deleteBtn" hidden>
        <span class="header__btn-icon" aria-hidden="true">delete</span>Delete
      </button>
    </div>
  </div>
  <div class="header__chips">
    <span class="header__chip" id="statusChip"></span>
    <span class="header__chip" id="typeChip"></span>
    <pm-linked-account-badge id="accountBadge"></pm-linked-account-badge>
  </div>
`;

export class PmTeacherHeader extends HTMLElement {
  private nameEl: HTMLElement | null = null;
  private statusChip: HTMLElement | null = null;
  private typeChip: HTMLElement | null = null;
  private accountBadge: PmLinkedAccountBadge | null = null;
  private linkBtn: HTMLButtonElement | null = null;
  private unlinkBtn: HTMLButtonElement | null = null;
  private bankingActivityBtn: HTMLButtonElement | null = null;
  private deactivateBtn: HTMLButtonElement | null = null;
  private reactivateBtn: HTMLButtonElement | null = null;
  private deleteBtn: HTMLButtonElement | null = null;
  private _teacher: TeacherResult | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.nameEl = this.shadowRoot!.getElementById('name') as HTMLElement;
    this.statusChip = this.shadowRoot!.getElementById('statusChip') as HTMLElement;
    this.typeChip = this.shadowRoot!.getElementById('typeChip') as HTMLElement;
    this.accountBadge = this.shadowRoot!.getElementById('accountBadge') as unknown as PmLinkedAccountBadge;
    this.linkBtn = this.shadowRoot!.getElementById('linkBtn') as HTMLButtonElement;
    this.unlinkBtn = this.shadowRoot!.getElementById('unlinkBtn') as HTMLButtonElement;
    this.bankingActivityBtn = this.shadowRoot!.getElementById('bankingActivityBtn') as HTMLButtonElement;
    this.deactivateBtn = this.shadowRoot!.getElementById('deactivateBtn') as HTMLButtonElement;
    this.reactivateBtn = this.shadowRoot!.getElementById('reactivateBtn') as HTMLButtonElement;
    this.deleteBtn = this.shadowRoot!.getElementById('deleteBtn') as HTMLButtonElement;
    this.linkBtn.addEventListener('click', this.handleLinkClick);
    this.unlinkBtn.addEventListener('click', this.handleUnlinkClick);
    this.bankingActivityBtn.addEventListener('click', this.handleBankingActivityClick);
    this.deactivateBtn.addEventListener('click', this.handleDeactivateClick);
    this.reactivateBtn.addEventListener('click', this.handleReactivateClick);
    this.deleteBtn.addEventListener('click', this.handleDeleteClick);
    this.render();
  }

  disconnectedCallback(): void {
    this.linkBtn?.removeEventListener('click', this.handleLinkClick);
    this.unlinkBtn?.removeEventListener('click', this.handleUnlinkClick);
    this.bankingActivityBtn?.removeEventListener('click', this.handleBankingActivityClick);
    this.deactivateBtn?.removeEventListener('click', this.handleDeactivateClick);
    this.reactivateBtn?.removeEventListener('click', this.handleReactivateClick);
    this.deleteBtn?.removeEventListener('click', this.handleDeleteClick);
  }

  set teacher(value: TeacherResult | null) {
    this._teacher = value;
    this.render();
  }

  get teacher(): TeacherResult | null {
    return this._teacher;
  }

  private render(): void {
    if (!this.nameEl || !this._teacher) return;

    const teacher = this._teacher;
    this.nameEl.textContent = `${teacher.firstName} ${teacher.surname}`;
    this.statusChip!.textContent = teacher.isActive ? 'Active' : 'Deactivated';
    this.statusChip!.className = `header__chip ${teacher.isActive ? 'header__chip--active' : 'header__chip--deactivated'}`;
    this.typeChip!.textContent = teacher.isPrivate ? 'Private' : 'School-paid';
    this.typeChip!.className = `header__chip ${teacher.isPrivate ? 'header__chip--type-private' : 'header__chip--type-school'}`;
    const linked = teacher.linkedAccountId !== null;
    this.accountBadge!.email = teacher.linkedAccountEmail;
    // A link is established or removed, never changed, so only ever one of the
    // two actions is on offer.
    this.linkBtn!.hidden = linked;
    this.unlinkBtn!.hidden = !linked;
    // Attaching a login account to a teacher who is no longer in service would
    // hand out self-service access to a record that has been stood down, so the
    // action is disabled rather than withheld — it returns on reactivation.
    // Unlinking stays available: removing access from a deactivated teacher is
    // never the wrong direction.
    this.linkBtn!.disabled = !teacher.isActive;
    // Offered only once there are banking details to have a history of.
    this.bankingActivityBtn!.hidden = teacher.banking === null;
    // Ending a teacher's record is an Admin's to do; a Coordinator maintains the
    // teacher, not their lifecycle. Withholding the controls is presentation
    // only — the endpoints enforce the same rule.
    //
    // Delete is absent rather than disabled while the teacher is active: the
    // action does not exist until deactivation has happened, so there is nothing
    // to present as blocked.
    const canManageLifecycle = hasRole('Admin');
    this.deactivateBtn!.hidden = !canManageLifecycle || !teacher.isActive;
    this.reactivateBtn!.hidden = !canManageLifecycle || teacher.isActive;
    this.deleteBtn!.hidden = !canManageLifecycle || teacher.isActive;
  }

  private handleLinkClick = (): void => {
    this.dispatchEvent(new CustomEvent('teacher-account-link-requested', { bubbles: true, composed: true }));
  };

  private handleUnlinkClick = (): void => {
    this.dispatchEvent(new CustomEvent('teacher-account-unlink-requested', { bubbles: true, composed: true }));
  };

  private handleBankingActivityClick = (): void => {
    this.dispatchEvent(new CustomEvent('teacher-banking-activity-requested', { bubbles: true, composed: true }));
  };

  private handleDeactivateClick = (): void => {
    this.dispatchEvent(new CustomEvent('teacher-deactivate-requested', { bubbles: true, composed: true }));
  };

  /** Reactivation restores nothing and destroys nothing, so it is not confirmed. */
  private handleReactivateClick = (): void => {
    this.dispatchEvent(new CustomEvent('teacher-reactivate-requested', { bubbles: true, composed: true }));
  };

  private handleDeleteClick = (): void => {
    this.dispatchEvent(new CustomEvent('teacher-delete-requested', { bubbles: true, composed: true }));
  };
}

customElements.define('pm-teacher-header', PmTeacherHeader);
