import type { TeacherResult } from '../services/teachers';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: table-row;
      font-family: 'Inter', system-ui, sans-serif;
    }
    td {
      box-sizing: border-box;
      text-align: left;
      padding: 10px 12px;
      font-size: 14px;
      color: var(--pm-text);
      border-bottom: 1px solid var(--pm-border);
    }
    .teacher-row__name {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .teacher-row__chip {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .teacher-row__chip--type-private {
      background: rgba(79, 124, 255, 0.12);
      color: var(--pm-accent);
    }
    .teacher-row__chip--type-school {
      background: rgba(124, 58, 237, 0.12);
      color: #7c3aed;
    }
    .teacher-row__chip--status-active {
      background: rgba(34, 197, 94, 0.12);
      color: #16a34a;
    }
    .teacher-row__chip--status-inactive {
      background: rgba(148, 163, 184, 0.2);
      color: var(--pm-text-muted);
    }
    .teacher-row__actions {
      text-align: right;
    }
    .teacher-row__btn {
      border-radius: var(--pm-radius);
      font-size: 12px;
      padding: 6px 12px;
      cursor: pointer;
      background: transparent;
      border: 1px solid var(--pm-accent);
      color: var(--pm-accent);
    }
    .teacher-row__btn:hover {
      background: rgba(79, 124, 255, 0.1);
    }
    .teacher-row__account {
      color: var(--pm-text-muted);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <td><span class="teacher-row__name" id="name"></span></td>
  <td><span class="teacher-row__chip" id="typeChip"></span></td>
  <td><span class="teacher-row__chip" id="statusChip"></span></td>
  <td><span class="teacher-row__account" id="account"></span></td>
  <td class="teacher-row__actions"><button type="button" class="teacher-row__btn" id="openBtn">Open</button></td>
`;

export class PmTeacherRow extends HTMLElement {
  private _teacher: TeacherResult | null = null;
  private nameEl: HTMLElement | null = null;
  private typeChip: HTMLElement | null = null;
  private statusChip: HTMLElement | null = null;
  private accountEl: HTMLElement | null = null;
  private openBtn: HTMLButtonElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.nameEl = this.shadowRoot!.getElementById('name') as HTMLElement;
    this.typeChip = this.shadowRoot!.getElementById('typeChip') as HTMLElement;
    this.statusChip = this.shadowRoot!.getElementById('statusChip') as HTMLElement;
    this.accountEl = this.shadowRoot!.getElementById('account') as HTMLElement;
    this.openBtn = this.shadowRoot!.getElementById('openBtn') as HTMLButtonElement;
    this.openBtn.addEventListener('click', this.handleOpen);
    this.render();
  }

  disconnectedCallback(): void {
    this.openBtn?.removeEventListener('click', this.handleOpen);
  }

  set teacher(value: TeacherResult) {
    this._teacher = value;
    this.render();
  }

  get teacher(): TeacherResult | null {
    return this._teacher;
  }

  private render(): void {
    if (!this._teacher || !this.nameEl || !this.typeChip || !this.statusChip || !this.accountEl) return;
    const t = this._teacher;

    this.nameEl.textContent = `${t.firstName} ${t.surname}`;
    this.nameEl.title = `${t.firstName} ${t.surname}`;

    this.typeChip.textContent = t.isPrivate ? 'Private' : 'School-paid';
    this.typeChip.className = `teacher-row__chip ${t.isPrivate ? 'teacher-row__chip--type-private' : 'teacher-row__chip--type-school'}`;

    this.statusChip.textContent = t.isActive ? 'Active' : 'Deactivated';
    this.statusChip.className = `teacher-row__chip ${t.isActive ? 'teacher-row__chip--status-active' : 'teacher-row__chip--status-inactive'}`;

    this.accountEl.textContent = t.linkedAccountEmail ?? 'No login account';
  }

  private handleOpen = (): void => {
    this.dispatchEvent(
      new CustomEvent('teacher-open-requested', {
        bubbles: true,
        composed: true,
        detail: { teacherId: this._teacher!.teacherId },
      }),
    );
  };
}

customElements.define('pm-teacher-row', PmTeacherRow);
