import {
  EM_DASH,
  INSTRUMENT_TYPES,
  INSTRUMENT_TYPE_LABELS,
  STEP_TYPES,
  STEP_TYPE_LABELS,
  courseLabel,
  recordsInstrumentType,
  recordsStep,
  teacherLabel,
} from './enrollment-options';
import type {
  AssignableTeacher,
  EnrollableCourse,
  EnrollmentInput,
  EnrollmentResult,
  InstrumentType,
  StepType,
} from '../services/enrollments';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      font-family: 'Inter', system-ui, sans-serif;
    }
    :host([hidden]) {
      display: none;
    }
    .enrollment-list__scroll {
      flex: 1;
      min-height: 0;
      overflow: auto;
    }
    table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }
    .enrollment-list__col-teacher {
      width: 160px;
    }
    .enrollment-list__col-instrument {
      width: 120px;
    }
    .enrollment-list__col-step {
      width: 90px;
    }
    .enrollment-list__col-enrolled {
      width: 120px;
    }
    .enrollment-list__col-actions {
      width: 150px;
    }
    th, td {
      text-align: left;
      padding: 8px 10px;
      font-size: 13px;
      color: var(--pm-text);
      border-bottom: 1px solid var(--pm-border);
      overflow-wrap: break-word;
    }
    th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pm-text-muted);
    }
    .enrollment-list__actions {
      text-align: right;
      white-space: nowrap;
    }
    .enrollment-list__btn {
      background: transparent;
      border: none;
      font-size: 12px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: var(--pm-radius);
    }
    .enrollment-list__btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .enrollment-list__btn--change {
      color: var(--pm-accent);
    }
    .enrollment-list__btn--change:hover:not(:disabled) {
      background: rgba(79, 124, 255, 0.1);
    }
    .enrollment-list__btn--remove {
      color: var(--pm-danger, #e05252);
    }
    .enrollment-list__btn--remove:hover:not(:disabled) {
      background: rgba(224, 82, 82, 0.1);
    }
    .enrollment-list__btn--cancel {
      border: 1px solid currentColor;
      color: var(--pm-text);
    }
    .enrollment-list__btn--cancel:hover {
      background: var(--pm-surface-2);
    }
    .enrollment-list__btn--save {
      background: var(--pm-accent);
      color: #fff;
    }
    .enrollment-list__btn--save:hover {
      opacity: 0.85;
    }
    .enrollment-list__actions .enrollment-list__btn + .enrollment-list__btn {
      margin-left: 8px;
    }
    .enrollment-list__empty {
      margin: 8px 0 0;
      color: var(--pm-text-muted);
      font-size: 13px;
    }
    .enrollment-list__edit-input {
      box-sizing: border-box;
      width: 100%;
      height: 28px;
      padding: 0 6px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 13px;
      font-family: inherit;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="enrollment-list__scroll">
    <table>
      <colgroup>
        <col />
        <col class="enrollment-list__col-teacher" />
        <col class="enrollment-list__col-instrument" />
        <col class="enrollment-list__col-step" />
        <col class="enrollment-list__col-enrolled" />
        <col class="enrollment-list__col-actions" />
      </colgroup>
      <thead>
        <tr>
          <th>Course</th>
          <th>Teacher</th>
          <th>Instrument</th>
          <th>Step</th>
          <th>Enrolled</th>
          <th class="enrollment-list__actions">Actions</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <p class="enrollment-list__empty" id="empty" hidden>No course enrollments.</p>
  </div>
`;

interface EditRowInputs {
  courseSelect: HTMLSelectElement;
  teacherSelect: HTMLSelectElement;
  instrumentSelect: HTMLSelectElement;
  stepSelect: HTMLSelectElement;
}

export class PmEnrollmentList extends HTMLElement {
  private rowsBody: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private _enrollments: EnrollmentResult[] = [];
  private _courses: EnrollableCourse[] = [];
  private _teachers: AssignableTeacher[] = [];
  private _editingId: string | null = null;
  private _isPersisted = true;

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

  set enrollments(value: EnrollmentResult[]) {
    this._enrollments = value;
    this.render();
  }

  get enrollments(): EnrollmentResult[] {
    return this._enrollments;
  }

  set courses(value: EnrollableCourse[]) {
    this._courses = value;
    this.render();
  }

  set teachers(value: AssignableTeacher[]) {
    this._teachers = value;
    this.render();
  }

  /**
   * Whether these enrollments are already persisted (edit mode) or only staged
   * in memory until the student is saved (create mode). A staged row offers
   * Change and Remove; a persisted row's own actions — Edit and Withdraw — are
   * the follow-up story's, so it offers none yet.
   */
  set isPersisted(value: boolean) {
    this._isPersisted = value;
    this.render();
  }

  /** Exits inline row-edit mode (if any) without saving. Safe to call when no row is being edited. */
  exitEditMode(): void {
    if (this._editingId === null) return;
    this._editingId = null;
    this.render();
  }

  private render(): void {
    if (!this.rowsBody || !this.emptyMessage) return;

    this.rowsBody.innerHTML = '';
    this.emptyMessage.hidden = this._enrollments.length > 0;

    for (const enrollment of this._enrollments) {
      const isEditing = enrollment.studentCourseId === this._editingId;
      this.rowsBody.appendChild(isEditing ? this.buildEditableRow(enrollment) : this.buildRow(enrollment));
    }
  }

  private buildRow(enrollment: EnrollmentResult): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.dataset.studentCourseId = enrollment.studentCourseId;

    const courseCell = document.createElement('td');
    courseCell.textContent = courseLabel(enrollment);

    const teacherCell = document.createElement('td');
    teacherCell.textContent = teacherLabel(enrollment) || EM_DASH;

    // An em dash stands in wherever the course type records nothing.
    const instrumentCell = document.createElement('td');
    instrumentCell.textContent = enrollment.instrumentType
      ? INSTRUMENT_TYPE_LABELS[enrollment.instrumentType]
      : EM_DASH;

    const stepCell = document.createElement('td');
    stepCell.textContent = enrollment.stepType ? STEP_TYPE_LABELS[enrollment.stepType] : EM_DASH;

    const enrolledCell = document.createElement('td');
    enrolledCell.textContent = enrollment.enrolledDate;

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('enrollment-list__actions');

    if (!this._isPersisted) {
      const isAnotherRowEditing = this._editingId !== null;

      const changeBtn = document.createElement('button');
      changeBtn.type = 'button';
      changeBtn.classList.add('enrollment-list__btn', 'enrollment-list__btn--change');
      changeBtn.textContent = 'Change';
      changeBtn.disabled = isAnotherRowEditing;
      changeBtn.addEventListener('click', () => this.handleChangeClicked(enrollment));
      actionsCell.appendChild(changeBtn);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.classList.add('enrollment-list__btn', 'enrollment-list__btn--remove');
      removeBtn.textContent = 'Remove';
      removeBtn.disabled = isAnotherRowEditing;
      removeBtn.addEventListener('click', () => this.handleRemoveClicked(enrollment));
      actionsCell.appendChild(removeBtn);
    }

    row.append(courseCell, teacherCell, instrumentCell, stepCell, enrolledCell, actionsCell);
    return row;
  }

  private buildEditableRow(enrollment: EnrollmentResult): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.dataset.studentCourseId = enrollment.studentCourseId;

    const courseSelect = this.buildSelect(
      this._courses.map((course) => ({ value: course.courseId, label: courseLabel(course) })),
      enrollment.courseId,
    );
    const courseCell = document.createElement('td');
    courseCell.appendChild(courseSelect);

    const teacherSelect = this.buildSelect(
      this._teachers.map((teacher) => ({
        value: teacher.teacherId,
        label: `${teacher.firstName} ${teacher.surname}`,
      })),
      enrollment.teacherId,
    );
    const teacherCell = document.createElement('td');
    teacherCell.appendChild(teacherSelect);

    const instrumentSelect = this.buildSelect(
      INSTRUMENT_TYPES.map((instrument) => ({ value: instrument, label: INSTRUMENT_TYPE_LABELS[instrument] })),
      enrollment.instrumentType ?? '',
    );
    const instrumentCell = document.createElement('td');
    instrumentCell.appendChild(instrumentSelect);

    const stepSelect = this.buildSelect(
      STEP_TYPES.map((step) => ({ value: step, label: STEP_TYPE_LABELS[step] })),
      enrollment.stepType ?? '',
    );
    const stepCell = document.createElement('td');
    stepCell.appendChild(stepSelect);

    const enrolledCell = document.createElement('td');
    enrolledCell.textContent = enrollment.enrolledDate;

    const inputs: EditRowInputs = { courseSelect, teacherSelect, instrumentSelect, stepSelect };
    // The row's own course select decides what the row records, exactly as the
    // form panel's does.
    const applyCourseTypeRules = (): void => {
      const course = this._courses.find((c) => c.courseId === courseSelect.value);
      const offersInstrument = course !== undefined && recordsInstrumentType(course.courseType);
      const offersStep = course !== undefined && recordsStep(course.courseType);

      instrumentSelect.hidden = !offersInstrument;
      instrumentSelect.required = offersInstrument;
      if (!offersInstrument) instrumentSelect.value = '';

      stepSelect.hidden = !offersStep;
      stepSelect.required = offersStep;
      if (!offersStep) stepSelect.value = '';
    };
    courseSelect.addEventListener('change', applyCourseTypeRules);
    applyCourseTypeRules();

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('enrollment-list__actions');

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.classList.add('enrollment-list__btn', 'enrollment-list__btn--cancel');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.handleEditCancelled());
    actionsCell.appendChild(cancelBtn);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.classList.add('enrollment-list__btn', 'enrollment-list__btn--save');
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => this.handleEditSaved(enrollment, inputs));
    actionsCell.appendChild(saveBtn);

    row.append(courseCell, teacherCell, instrumentCell, stepCell, enrolledCell, actionsCell);
    return row;
  }

  private buildSelect(options: { value: string; label: string }[], selected: string): HTMLSelectElement {
    const select = document.createElement('select');
    select.classList.add('enrollment-list__edit-input');
    select.required = true;
    for (const option of options) {
      const element = document.createElement('option');
      element.value = option.value;
      element.textContent = option.label;
      select.appendChild(element);
    }
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '';
    select.insertBefore(placeholder, select.firstChild);
    select.value = selected;
    return select;
  }

  private handleChangeClicked(enrollment: EnrollmentResult): void {
    this._editingId = enrollment.studentCourseId;
    this.render();
    this.dispatchEvent(new CustomEvent('enrollment-edit-started', { bubbles: true, composed: true }));
  }

  private handleEditCancelled(): void {
    this._editingId = null;
    this.render();
    this.dispatchEvent(new CustomEvent('enrollment-edit-cancelled', { bubbles: true, composed: true }));
  }

  private handleEditSaved(enrollment: EnrollmentResult, inputs: EditRowInputs): void {
    const required = [inputs.courseSelect, inputs.teacherSelect, inputs.instrumentSelect, inputs.stepSelect].filter(
      (element) => element.required,
    );
    if (!required.every((element) => element.reportValidity())) return;

    const input: EnrollmentInput = {
      courseId: inputs.courseSelect.value,
      teacherId: inputs.teacherSelect.value,
      instrumentType: inputs.instrumentSelect.hidden ? null : (inputs.instrumentSelect.value as InstrumentType),
      stepType: inputs.stepSelect.hidden ? null : (inputs.stepSelect.value as StepType),
      enrolledDate: enrollment.enrolledDate,
    };

    this.dispatchEvent(
      new CustomEvent('enrollment-edit-saved', {
        bubbles: true,
        composed: true,
        detail: { studentCourseId: enrollment.studentCourseId, input },
      }),
    );
  }

  private handleRemoveClicked(enrollment: EnrollmentResult): void {
    this.dispatchEvent(
      new CustomEvent('enrollment-remove-clicked', {
        bubbles: true,
        composed: true,
        detail: { enrollment },
      }),
    );
  }
}

customElements.define('pm-enrollment-list', PmEnrollmentList);
