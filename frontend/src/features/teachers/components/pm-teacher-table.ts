import './pm-teacher-row';
import type { TeacherResult } from '../services/teachers';
import type { PmTeacherRow } from './pm-teacher-row';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
    }
    .teacher-table__card {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 24px;
      margin-top: 24px;
    }
    table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }
    th {
      box-sizing: border-box;
      text-align: left;
      padding: 10px 12px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pm-text-muted);
      border-bottom: 1px solid var(--pm-border);
    }
    .teacher-table__col-actions {
      width: 120px;
    }
    .teacher-table__actions-header {
      text-align: right;
    }
    .teacher-table__empty {
      color: var(--pm-text-muted);
      font-size: 14px;
    }
    .teacher-table__footnote {
      margin: 16px 0 0;
      color: var(--pm-text-muted);
      font-size: 12px;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="teacher-table__card">
    <table>
      <colgroup>
        <col />
        <col />
        <col />
        <col />
        <col />
        <col class="teacher-table__col-actions" />
      </colgroup>
      <thead>
        <tr>
          <th>Name</th>
          <th>Type</th>
          <th>Status</th>
          <th>Linked Account</th>
          <th>Banking details</th>
          <th class="teacher-table__actions-header">Actions</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <p class="teacher-table__empty" id="empty" hidden>No teachers match these filters.</p>
    <p class="teacher-table__footnote">
      Account numbers are masked everywhere. The full value is only returned by an explicit reveal on the teacher
      record, and never appears in a list.
    </p>
  </div>
`;

export class PmTeacherTable extends HTMLElement {
  private rowsBody: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private _teachers: TeacherResult[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.rowsBody = this.shadowRoot!.getElementById('rows') as HTMLElement;
    this.emptyMessage = this.shadowRoot!.getElementById('empty') as HTMLElement;
    this.render();
  }

  set teachers(value: TeacherResult[]) {
    this._teachers = value;
    this.render();
  }

  get teachers(): TeacherResult[] {
    return this._teachers;
  }

  private render(): void {
    if (!this.rowsBody || !this.emptyMessage) return;

    this.rowsBody.innerHTML = '';
    this.emptyMessage.hidden = this._teachers.length > 0;

    for (const teacher of this._teachers) {
      const row = document.createElement('pm-teacher-row') as PmTeacherRow;
      row.teacher = teacher;
      this.rowsBody.appendChild(row);
    }
  }
}

customElements.define('pm-teacher-table', PmTeacherTable);
