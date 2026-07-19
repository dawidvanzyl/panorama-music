import type { StudentResult } from '../services/students';

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

  private render(): void {
    if (!this.rowsBody || !this.emptyMessage) return;

    this.rowsBody.innerHTML = '';
    this.emptyMessage.hidden = this._students.length > 0;

    for (const student of this._students) {
      this.rowsBody.appendChild(this.buildRow(student));
    }
  }

  private buildRow(student: StudentResult): HTMLTableRowElement {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    const nameSpan = document.createElement('span');
    nameSpan.classList.add('students-table__name');
    nameSpan.textContent = `${student.firstName} ${student.lastName}`;
    nameSpan.title = `${student.firstName} ${student.lastName}`;
    nameCell.appendChild(nameSpan);

    const gradeCell = document.createElement('td');
    gradeCell.textContent = student.grade;

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

    row.append(nameCell, gradeCell, phaseCell, classCell, languageCell, dobCell, actionsCell);
    return row;
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
