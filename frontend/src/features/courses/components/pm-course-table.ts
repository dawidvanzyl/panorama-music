import {
  COST_ERROR,
  COURSE_TYPE_LABELS,
  OCCURRENCE_TYPE_LABELS,
  costText,
  isValidCost,
  lessonStructureColumnText,
} from '../services/course-display';
import type { Course } from '../services/courses';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
    }
    .course-table__card {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 24px;
    }
    table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }
    th, td {
      box-sizing: border-box;
      text-align: left;
      padding: 12px 4px;
      font-size: 14px;
      color: var(--pm-text);
      border-bottom: 1px solid var(--pm-border);
    }
    th {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pm-text-muted);
      padding-top: 0;
    }
    td.course-table__structure,
    td.course-table__occurrence {
      color: var(--pm-text-muted);
    }
    .course-table__actions-header,
    .course-table__actions {
      text-align: right;
      width: 220px;
    }
    .course-table__actions {
      white-space: nowrap;
    }
    /* The reason a save or delete failed sits inside the row it concerns,
       above its cells, so it is never mistaken for another row's. */
    .course-table__error-cell {
      border-bottom: none;
      padding-bottom: 0;
    }
    .course-table__error {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      border-radius: var(--pm-radius);
      padding: 8px 14px;
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-danger);
    }
    .course-table__cost-input {
      box-sizing: border-box;
      width: 100%;
      height: 38px;
      padding: 0 8px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
      font-family: inherit;
    }
    .course-table__btn {
      border: 1px solid transparent;
      border-radius: var(--pm-radius);
      padding: 6px 12px;
      font-size: 12px;
      font-family: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .course-table__btn + .course-table__btn {
      margin-left: 6px;
    }
    .course-table__btn--edit {
      background: transparent;
      border-color: var(--pm-accent);
      color: var(--pm-accent);
    }
    .course-table__btn--edit:hover:not(:disabled) {
      background: rgba(79, 124, 255, 0.1);
    }
    .course-table__btn--delete {
      background: var(--pm-danger, #e05252);
      border-color: var(--pm-danger, #e05252);
      color: #fff;
    }
    .course-table__btn--save {
      background: var(--pm-accent);
      color: #fff;
    }
    .course-table__btn--cancel {
      background: transparent;
      color: var(--pm-text-muted);
    }
    .course-table__btn--cancel:hover {
      background: var(--pm-surface-2);
    }
    .course-table__btn--delete:hover:not(:disabled),
    .course-table__btn--save:hover:not(:disabled) {
      opacity: 0.9;
    }
    .course-table__btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .course-table__empty {
      color: var(--pm-text-muted);
      font-size: 14px;
      margin: 16px 0 0;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="course-table__card">
    <table>
      <thead>
        <tr>
          <th>Course Type</th>
          <th>Lesson Structure</th>
          <th>Occurrence</th>
          <th>Cost</th>
          <th class="course-table__actions-header" id="actionsHeader" hidden>Actions</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <p class="course-table__empty" id="empty" hidden>No courses found.</p>
  </div>
`;

export class PmCourseTable extends HTMLElement {
  private rowsBody: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private actionsHeader: HTMLElement | null = null;
  private _courses: Course[] = [];
  private _showActions = false;
  private _editingCourseId: string | null = null;
  /** The value currently in the cost input, kept so a re-render does not lose it. */
  private _costDraft = '';
  private _errorCourseId: string | null = null;
  private _errorMessage = '';

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.rowsBody = this.shadowRoot!.getElementById('rows') as HTMLElement;
    this.emptyMessage = this.shadowRoot!.getElementById('empty') as HTMLElement;
    this.actionsHeader = this.shadowRoot!.getElementById('actionsHeader') as HTMLElement;

    // A property assigned before this element upgraded lands as an own property
    // that shadows the accessor below, so it is replayed through the setter here.
    this.upgradeProperty('courses');
    this.upgradeProperty('showActions');

    this.render();
  }

  set courses(value: Course[]) {
    this._courses = value;
    // A fresh list is what a completed save or delete produces, so any edit and
    // any row error it might have carried are done with.
    this._editingCourseId = null;
    this._costDraft = '';
    this.clearRowError();
    this.render();
  }

  get courses(): Course[] {
    return this._courses;
  }

  /**
   * Whether the actions column exists at all. A staff user who may not maintain
   * courses gets no column rather than a disabled one, matching how the
   * endpoints answer.
   */
  set showActions(value: boolean) {
    this._showActions = value;
    this.render();
  }

  /**
   * Reports a failed save or delete against the row it concerns. A row being
   * edited stays in edit mode with the entered value, so the change can be
   * corrected and retried.
   */
  showRowError(courseId: string, message: string): void {
    this._errorCourseId = courseId;
    this._errorMessage = message;
    this.render();
  }

  clearRowError(): void {
    this._errorCourseId = null;
    this._errorMessage = '';
  }

  private upgradeProperty(name: string): void {
    if (!Object.hasOwn(this, name)) return;

    const self = this as unknown as Record<string, unknown>;
    const value = self[name];
    delete self[name];
    self[name] = value;
  }

  private render(): void {
    if (!this.rowsBody || !this.emptyMessage || !this.actionsHeader) return;

    this.actionsHeader.hidden = !this._showActions;
    this.emptyMessage.hidden = this._courses.length > 0;
    this.rowsBody.innerHTML = '';

    for (const course of this._courses) {
      if (course.courseId === this._errorCourseId) {
        this.rowsBody.appendChild(this.buildErrorRow());
      }
      this.rowsBody.appendChild(this.buildRow(course));
    }
  }

  private buildErrorRow(): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.classList.add('course-table__error-row');
    row.dataset.courseId = this._errorCourseId ?? '';

    const cell = document.createElement('td');
    cell.classList.add('course-table__error-cell');
    cell.colSpan = this._showActions ? 5 : 4;

    const banner = document.createElement('div');
    banner.classList.add('course-table__error');
    banner.textContent = this._errorMessage;
    cell.appendChild(banner);

    row.appendChild(cell);
    return row;
  }

  private buildRow(course: Course): HTMLTableRowElement {
    const isEditing = course.courseId === this._editingCourseId;
    const row = document.createElement('tr');
    // The course is identified to a human by its type, structure and
    // occurrence, none of which is unique; the row carries its identifier so a
    // caller can address exactly one row regardless of what it currently shows.
    row.dataset.courseId = course.courseId;

    const typeCell = document.createElement('td');
    typeCell.textContent = COURSE_TYPE_LABELS[course.courseType];

    const structureCell = document.createElement('td');
    structureCell.classList.add('course-table__structure');
    structureCell.textContent = lessonStructureColumnText(course);

    const occurrenceCell = document.createElement('td');
    occurrenceCell.classList.add('course-table__occurrence');
    occurrenceCell.textContent = OCCURRENCE_TYPE_LABELS[course.occurrenceType];

    const costCell = document.createElement('td');
    if (isEditing) {
      costCell.appendChild(this.buildCostInput());
    } else {
      costCell.textContent = costText(course.cost);
    }

    row.append(typeCell, structureCell, occurrenceCell, costCell);

    if (this._showActions) {
      row.appendChild(isEditing ? this.buildEditActions(course) : this.buildDisplayActions(course));
    }

    return row;
  }

  private buildCostInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'costInput';
    input.classList.add('course-table__cost-input');
    input.inputMode = 'decimal';
    input.value = this._costDraft;
    // A cost is never negative, so a minus sign is dropped as it is typed
    // rather than being accepted and then refused on save.
    input.addEventListener('input', () => {
      if (input.value.includes('-')) {
        const caret = (input.selectionStart ?? input.value.length) - 1;
        input.value = input.value.replaceAll('-', '');
        input.setSelectionRange(caret, caret);
      }
      this._costDraft = input.value;
    });
    return input;
  }

  private buildDisplayActions(course: Course): HTMLTableCellElement {
    const cell = document.createElement('td');
    cell.classList.add('course-table__actions');

    // Another row's edit is in progress; leaving these live would abandon it.
    const isAnotherRowEditing = this._editingCourseId !== null;

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.classList.add('course-table__btn', 'course-table__btn--edit');
    editBtn.textContent = 'Edit Cost';
    editBtn.disabled = isAnotherRowEditing;
    editBtn.addEventListener('click', () => this.handleEditClicked(course));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.classList.add('course-table__btn', 'course-table__btn--delete');
    deleteBtn.textContent = 'Delete';
    deleteBtn.disabled = isAnotherRowEditing;
    deleteBtn.addEventListener('click', () => this.handleDeleteClicked(course));

    cell.append(editBtn, deleteBtn);
    return cell;
  }

  private buildEditActions(course: Course): HTMLTableCellElement {
    const cell = document.createElement('td');
    cell.classList.add('course-table__actions');

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.classList.add('course-table__btn', 'course-table__btn--save');
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => this.handleSaveClicked(course));

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.classList.add('course-table__btn', 'course-table__btn--cancel');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.handleCancelClicked());

    cell.append(saveBtn, cancelBtn);
    return cell;
  }

  private handleEditClicked(course: Course): void {
    this._editingCourseId = course.courseId;
    this._costDraft = course.cost;
    this.clearRowError();
    this.render();
  }

  private handleCancelClicked(): void {
    this._editingCourseId = null;
    this._costDraft = '';
    this.clearRowError();
    this.render();
  }

  private handleSaveClicked(course: Course): void {
    const cost = this._costDraft.trim();

    if (!isValidCost(cost)) {
      this.showRowError(course.courseId, COST_ERROR);
      return;
    }

    this.clearRowError();
    this.dispatchEvent(
      new CustomEvent('course-cost-save-requested', {
        bubbles: true,
        composed: true,
        detail: { courseId: course.courseId, cost },
      }),
    );
  }

  private handleDeleteClicked(course: Course): void {
    this.clearRowError();
    this.render();
    this.dispatchEvent(
      new CustomEvent('course-delete-clicked', {
        bubbles: true,
        composed: true,
        detail: { course },
      }),
    );
  }
}

customElements.define('pm-course-table', PmCourseTable);
