import './pm-student-siblings-summary';
import type { StudentResult } from '../services/students';
import type { PmStudentSiblingsSummary } from './pm-student-siblings-summary';
import { gradeLabel } from './student-options';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
    }
    .students-table__card {
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
    th, td {
      box-sizing: border-box;
      text-align: left;
      padding: 10px 12px;
      font-size: 14px;
      color: var(--pm-text);
      border-bottom: 1px solid var(--pm-border);
    }
    th {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pm-text-muted);
    }
    .students-table__col-chevron {
      width: 40px;
    }
    .students-table__col-name {
      width: 220px;
    }
    .students-table__col-actions {
      width: 200px;
    }
    .students-table__name {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .students-table__actions {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
    }
    .students-table__actions-header {
      text-align: right;
    }
    .students-table__btn {
      border-radius: var(--pm-radius);
      font-size: 12px;
      padding: 6px 12px;
      cursor: pointer;
    }
    .students-table__btn--edit {
      background: transparent;
      border: 1px solid var(--pm-accent);
      color: var(--pm-accent);
    }
    .students-table__btn--edit:hover {
      background: rgba(79, 124, 255, 0.1);
    }
    .students-table__btn--delete {
      background: var(--pm-danger, #e05252);
      border: 1px solid var(--pm-danger, #e05252);
      color: #fff;
    }
    .students-table__btn--delete:hover {
      opacity: 0.9;
    }
    .students-table__chevron-btn {
      background: transparent;
      border: none;
      color: var(--pm-text-muted);
      cursor: pointer;
      font-size: 14px;
      padding: 4px;
      width: 100%;
    }
    .students-table__summary-row td {
      padding: 0;
      background: var(--pm-surface-2);
    }
    .students-table__summary-row[hidden] {
      display: none;
    }
    .students-table__empty {
      color: var(--pm-text-muted);
      font-size: 14px;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="students-table__card">
    <table>
      <colgroup>
        <col class="students-table__col-chevron" />
        <col class="students-table__col-name" />
        <col />
        <col />
        <col />
        <col />
        <col />
        <col class="students-table__col-actions" />
      </colgroup>
      <thead>
        <tr>
          <th></th>
          <th>Name</th>
          <th>Grade</th>
          <th>Phase</th>
          <th>Class</th>
          <th>Language</th>
          <th>Date of Birth</th>
          <th class="students-table__actions-header">Actions</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <p class="students-table__empty" id="empty" hidden>No students found.</p>
  </div>
`;

export class PmStudentsTable extends HTMLElement {
  private rowsBody: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private _students: StudentResult[] = [];
  private _expandedIds = new Set<string>();
  private _summaryComponents = new Map<string, PmStudentSiblingsSummary>();
  /**
   * Last-known siblings per student, kept across re-renders. `render()` tears down
   * and recreates every row's `pm-student-siblings-summary` (even ones already
   * expanded and populated) whenever any row is toggled or the roster changes —
   * without this, that rebuild would wipe an already-fetched sibling list for
   * every OTHER still-expanded row.
   */
  private _siblingsCache = new Map<string, StudentResult[]>();

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

  set students(value: StudentResult[]) {
    this._students = value;
    this.render();
  }

  get students(): StudentResult[] {
    return this._students;
  }

  removeStudent(studentId: string): void {
    this._students = this._students.filter((s) => s.studentId !== studentId);
    this.render();
  }

  setSiblingsSummary(studentId: string, siblings: StudentResult[]): void {
    this._siblingsCache.set(studentId, siblings);
    const component = this._summaryComponents.get(studentId);
    if (component) component.siblings = siblings;
  }

  private render(): void {
    if (!this.rowsBody || !this.emptyMessage) return;

    this.rowsBody.innerHTML = '';
    this._summaryComponents.clear();
    this.emptyMessage.hidden = this._students.length > 0;

    for (const student of this._students) {
      const { mainRow, summaryRow } = this.buildRowPair(student);
      this.rowsBody.appendChild(mainRow);
      this.rowsBody.appendChild(summaryRow);
    }
  }

  private buildRowPair(student: StudentResult): { mainRow: HTMLTableRowElement; summaryRow: HTMLTableRowElement } {
    const row = document.createElement('tr');

    const chevronCell = document.createElement('td');
    const chevronBtn = document.createElement('button');
    chevronBtn.type = 'button';
    chevronBtn.classList.add('students-table__chevron-btn');
    const isExpanded = this._expandedIds.has(student.studentId);
    chevronBtn.textContent = isExpanded ? '▾' : '▸';
    chevronBtn.setAttribute('aria-label', 'Toggle siblings summary');
    chevronBtn.addEventListener('click', () => this.toggleExpanded(student.studentId));
    chevronCell.appendChild(chevronBtn);

    const nameCell = document.createElement('td');
    const nameSpan = document.createElement('span');
    nameSpan.classList.add('students-table__name');
    nameSpan.textContent = `${student.firstName} ${student.lastName}`;
    nameSpan.title = `${student.firstName} ${student.lastName}`;
    nameCell.appendChild(nameSpan);

    const gradeCell = document.createElement('td');
    gradeCell.textContent = gradeLabel(student.grade);

    const phaseCell = document.createElement('td');
    phaseCell.textContent = student.phase;

    const classCell = document.createElement('td');
    classCell.textContent = student.class;

    const languageCell = document.createElement('td');
    languageCell.textContent = student.language;

    const dobCell = document.createElement('td');
    dobCell.textContent = student.dateOfBirth;

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('students-table__actions');

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.classList.add('students-table__btn', 'students-table__btn--edit');
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => this.handleEdit(student));
    actionsCell.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.classList.add('students-table__btn', 'students-table__btn--delete');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => this.handleDelete(student));
    actionsCell.appendChild(deleteBtn);

    row.append(chevronCell, nameCell, gradeCell, phaseCell, classCell, languageCell, dobCell, actionsCell);

    const summaryRow = document.createElement('tr');
    summaryRow.classList.add('students-table__summary-row');
    summaryRow.hidden = !isExpanded;
    summaryRow.dataset.studentId = student.studentId;
    const summaryCell = document.createElement('td');
    summaryCell.colSpan = 8;
    const summary = document.createElement('pm-student-siblings-summary') as PmStudentSiblingsSummary;
    summary.siblings = this._siblingsCache.get(student.studentId) ?? [];
    this._summaryComponents.set(student.studentId, summary);
    summaryCell.appendChild(summary);
    summaryRow.appendChild(summaryCell);

    return { mainRow: row, summaryRow };
  }

  private toggleExpanded(studentId: string): void {
    if (this._expandedIds.has(studentId)) {
      this._expandedIds.delete(studentId);
      this.render();
      return;
    }

    this._expandedIds.add(studentId);
    this.render();

    this.dispatchEvent(
      new CustomEvent('student-row-expanded', {
        bubbles: true,
        composed: true,
        detail: { studentId },
      }),
    );
  }

  private handleEdit(student: StudentResult): void {
    this.dispatchEvent(
      new CustomEvent('student-edit-requested', {
        bubbles: true,
        composed: true,
        detail: { student },
      }),
    );
  }

  private handleDelete(student: StudentResult): void {
    this.dispatchEvent(
      new CustomEvent('student-delete-requested', {
        bubbles: true,
        composed: true,
        detail: { studentId: student.studentId, name: `${student.firstName} ${student.lastName}` },
      }),
    );
  }
}

customElements.define('pm-students-table', PmStudentsTable);
