import type { TeacherResult } from '../services/teachers';

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
    .header__account {
      margin-top: 8px;
      font-size: 13px;
      color: var(--pm-text-muted);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <a href="#/teachers" class="header__back">&larr; All teachers</a>
  <h1 class="header__name" id="name"></h1>
  <div class="header__chips">
    <span class="header__chip" id="statusChip"></span>
    <span class="header__chip header__chip--type" id="typeChip"></span>
  </div>
  <div class="header__account" id="account"></div>
`;

export class PmTeacherHeader extends HTMLElement {
  private nameEl: HTMLElement | null = null;
  private statusChip: HTMLElement | null = null;
  private typeChip: HTMLElement | null = null;
  private accountEl: HTMLElement | null = null;
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
    this.accountEl = this.shadowRoot!.getElementById('account') as HTMLElement;
    this.render();
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
    this.accountEl!.textContent = teacher.linkedAccountId ? `Linked account: ${teacher.linkedAccountId}` : '';
  }
}

customElements.define('pm-teacher-header', PmTeacherHeader);
