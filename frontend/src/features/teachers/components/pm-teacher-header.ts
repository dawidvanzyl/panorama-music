import './pm-linked-account-badge';
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
    .header__chip--type {
      background: var(--pm-surface-2);
      color: var(--pm-text-muted);
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
    .header__btn--link {
      border: 1px solid var(--pm-accent);
      color: var(--pm-accent);
    }
    .header__btn--link:hover {
      background: rgba(79, 124, 255, 0.1);
    }
    .header__btn--unlink {
      border: 1px solid var(--pm-border);
      color: var(--pm-text-muted);
    }
    .header__btn--unlink:hover {
      background: var(--pm-surface-2);
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
    </div>
  </div>
  <div class="header__chips">
    <span class="header__chip" id="statusChip"></span>
    <span class="header__chip header__chip--type" id="typeChip"></span>
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
    this.linkBtn.addEventListener('click', this.handleLinkClick);
    this.unlinkBtn.addEventListener('click', this.handleUnlinkClick);
    this.bankingActivityBtn.addEventListener('click', this.handleBankingActivityClick);
    this.render();
  }

  disconnectedCallback(): void {
    this.linkBtn?.removeEventListener('click', this.handleLinkClick);
    this.unlinkBtn?.removeEventListener('click', this.handleUnlinkClick);
    this.bankingActivityBtn?.removeEventListener('click', this.handleBankingActivityClick);
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
    this.typeChip!.textContent = teacher.isPrivate ? 'Private' : 'School-Paid';
    const linked = teacher.linkedAccountId !== null;
    this.accountBadge!.email = teacher.linkedAccountEmail;
    // A link is established or removed, never changed, so only ever one of the
    // two actions is on offer.
    this.linkBtn!.hidden = linked;
    this.unlinkBtn!.hidden = !linked;
    // Offered only once there are banking details to have a history of.
    this.bankingActivityBtn!.hidden = teacher.banking === null;
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
}

customElements.define('pm-teacher-header', PmTeacherHeader);
