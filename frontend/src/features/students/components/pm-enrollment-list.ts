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
  EnrollmentUpdateInput,
  InstrumentType,
  StepType,
} from '../services/enrollments';
import { compactButtonStyles } from '../../../components/compact-button-styles';
import { setButtonsBusy } from '../../../components/button-states';

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
          <th class="compact-actions-col">Actions</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <p class="enrollment-list__empty" id="empty" hidden>No course enrollments.</p>
  </div>
`;

interface EditRowInputs {
  /** Absent on a persisted row: its course is settled at enrollment and stays read-only text. */
  courseSelect?: HTMLSelectElement;
  teacherSelect: HTMLSelectElement;
  instrumentSelect: HTMLSelectElement;
  stepSelect: HTMLSelectElement;
}

interface EnrollmentDraft {
  courseId: string;
  teacherId: string;
  instrumentType: string;
  stepType: string;
}

export class PmEnrollmentList extends HTMLElement {
  private rowsBody: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private _enrollments: EnrollmentResult[] = [];
  private _courses: EnrollableCourse[] = [];
  private _teachers: AssignableTeacher[] = [];
  private _editingId: string | null = null;
  private _isPersisted = true;
  private _draft: EnrollmentDraft | null = null;
  private _saving = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [compactButtonStyles, styles];
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
   * Edit and Remove; a persisted row offers Edit and Withdraw, which act on a
   * record that already exists.
   */
  set isPersisted(value: boolean) {
    this._isPersisted = value;
    this.render();
  }

  /** Exits inline row-edit mode (if any) without saving. Safe to call when no row is being edited. */
  exitEditMode(): void {
    this._saving = false;
    this._draft = null;
    if (this._editingId === null) return;
    this._editingId = null;
    this.render();
  }

  /** Ends the saving state after a failed save, keeping the row in edit with its entered values. */
  endSave(): void {
    if (!this._saving) return;
    this._saving = false;
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
    actionsCell.classList.add('compact-actions-col');
    const actions = this.buildActionsContainer();

    if (this._isPersisted) {
      // Edit stays available on every row: choosing it on a second row closes
      // the first without submitting, rather than being refused.
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.classList.add('compact-btn', 'enrollment-list__btn--edit');
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => this.handleChangeClicked(enrollment));
      actions.appendChild(editBtn);

      // Withdrawing the last course of a student with no extra-curricular is
      // refused, but the action is still offered — choosing it states the requirement instead of
      // confirming, which the Courses step decides rather than this list.
      const withdrawBtn = document.createElement('button');
      withdrawBtn.type = 'button';
      withdrawBtn.classList.add('compact-btn', 'compact-btn--destructive', 'enrollment-list__btn--withdraw');
      withdrawBtn.textContent = 'Withdraw';
      withdrawBtn.addEventListener('click', () => this.handleWithdrawClicked(enrollment));
      actions.appendChild(withdrawBtn);
    } else {
      const isAnotherRowEditing = this._editingId !== null;

      const changeBtn = document.createElement('button');
      changeBtn.type = 'button';
      changeBtn.classList.add('compact-btn', 'enrollment-list__btn--change');
      changeBtn.textContent = 'Edit';
      changeBtn.disabled = isAnotherRowEditing;
      changeBtn.addEventListener('click', () => this.handleChangeClicked(enrollment));
      actions.appendChild(changeBtn);

      const removeBtn = document.createElement('button');
      removeBtn.type = 'button';
      removeBtn.classList.add('compact-btn', 'compact-btn--destructive', 'enrollment-list__btn--remove');
      removeBtn.textContent = 'Remove';
      removeBtn.disabled = isAnotherRowEditing;
      removeBtn.addEventListener('click', () => this.handleRemoveClicked(enrollment));
      actions.appendChild(removeBtn);
    }

    actionsCell.appendChild(actions);
    row.append(courseCell, teacherCell, instrumentCell, stepCell, enrolledCell, actionsCell);
    return row;
  }

  private buildActionsContainer(): HTMLDivElement {
    const actions = document.createElement('div');
    actions.classList.add('compact-actions');
    actions.dataset.testid = 'row-actions';
    return actions;
  }

  private draftOf(enrollment: EnrollmentResult): EnrollmentDraft {
    return {
      courseId: enrollment.courseId,
      teacherId: enrollment.teacherId,
      instrumentType: enrollment.instrumentType ?? '',
      stepType: enrollment.stepType ?? '',
    };
  }

  private buildEditableRow(enrollment: EnrollmentResult): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.dataset.studentCourseId = enrollment.studentCourseId;
    const draft = (this._draft ??= this.draftOf(enrollment));

    // A persisted enrollment's course is settled at enrollment, so it stays
    // read-only text; a staged one may still be changed to another course.
    const courseSelect = this._isPersisted
      ? undefined
      : this.buildSelect(
          this._courses.map((course) => ({ value: course.courseId, label: courseLabel(course) })),
          draft.courseId,
        );
    const courseCell = document.createElement('td');
    if (courseSelect) {
      courseCell.appendChild(courseSelect);
    } else {
      courseCell.textContent = courseLabel(enrollment);
    }

    const teacherSelect = this.buildSelect(
      this._teachers.map((teacher) => ({
        value: teacher.teacherId,
        label: ${teacher.firstName} ,
      })),
      draft.teacherId,
    );
    const teacherCell = document.createElement('td');
    teacherCell.appendChild(teacherSelect);

    const instrumentSelect = this.buildSelect(
      INSTRUMENT_TYPES.map((instrument) => ({ value: instrument, label: INSTRUMENT_TYPE_LABELS[instrument] })),
      draft.instrumentType,
    );
    const instrumentCell = document.createElement('td');
    instrumentCell.appendChild(instrumentSelect);
    // Stands in wherever the select is hidden, so a course type that records no
    // instrument reads the same in an editable row as it does in a settled one.
    const instrumentPlaceholder = buildPlaceholder();
    instrumentCell.appendChild(instrumentPlaceholder);

    const stepSelect = this.buildSelect(
      STEP_TYPES.map((step) => ({ value: step, label: STEP_TYPE_LABELS[step] })),
      draft.stepType,
    );
    const stepCell = document.createElement('td');
    stepCell.appendChild(stepSelect);
    const stepPlaceholder = buildPlaceholder();
    stepCell.appendChild(stepPlaceholder);

    const enrolledCell = document.createElement('td');
    enrolledCell.textContent = enrollment.enrolledDate;

    const inputs: EditRowInputs = { courseSelect, teacherSelect, instrumentSelect, stepSelect };
    const syncDraft = (): void => {
      draft.courseId = courseSelect?.value ?? draft.courseId;
      draft.teacherId = teacherSelect.value;
      draft.instrumentType = instrumentSelect.value;
      draft.stepType = stepSelect.value;
    };
    // What the row records follows its course type — chosen in the row's own
    // course select while the course is still changeable, and fixed at the
    // enrollment's own course once it is not.
    const applyCourseTypeRules = (): void => {
      const courseType = courseSelect
        ? this._courses.find((c) => c.courseId === courseSelect.value)?.courseType
        : enrollment.courseType;
      const offersInstrument = courseType !== undefined && recordsInstrumentType(courseType);
      const offersStep = courseType !== undefined && recordsStep(courseType);

      instrumentSelect.hidden = !offersInstrument;
      instrumentSelect.required = offersInstrument;
      instrumentPlaceholder.hidden = offersInstrument;
      if (!offersInstrument) instrumentSelect.value = '';

      stepSelect.hidden = !offersStep;
      stepSelect.required = offersStep;
      stepPlaceholder.hidden = offersStep;
      if (!offersStep) stepSelect.value = '';
      syncDraft();
    };
    courseSelect?.addEventListener('change', applyCourseTypeRules);
    for (const select of [teacherSelect, instrumentSelect, stepSelect]) {
      select.addEventListener('change', syncDraft);
    }
    applyCourseTypeRules();

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('compact-actions-col');
    const actions = this.buildActionsContainer();

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.classList.add('compact-btn', 'enrollment-list__btn--cancel');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.handleEditCancelled());

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.classList.add('compact-btn', 'enrollment-list__btn--save');
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => this.handleEditSaved(enrollment, inputs));

    if (this._saving) setButtonsBusy(saveBtn, cancelBtn, true);

    actions.append(cancelBtn, saveBtn);
    actionsCell.appendChild(actions);

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
    this._draft = this.draftOf(enrollment);
    this._saving = false;
    this.render();
    this.dispatchEvent(new CustomEvent('enrollment-edit-started', { bubbles: true, composed: true }));
  }

  private handleEditCancelled(): void {
    this._editingId = null;
    this._draft = null;
    this._saving = false;
    this.render();
    this.dispatchEvent(new CustomEvent('enrollment-edit-cancelled', { bubbles: true, composed: true }));
  }

  private handleEditSaved(enrollment: EnrollmentResult, inputs: EditRowInputs): void {
    if (this._saving) return;
    const required = [inputs.courseSelect, inputs.teacherSelect, inputs.instrumentSelect, inputs.stepSelect].filter(
      (element) => element?.required,
    );
    if (!required.every((element) => element!.reportValidity())) return;

    const instrumentType = inputs.instrumentSelect.hidden ? null : (inputs.instrumentSelect.value as InstrumentType);
    const stepType = inputs.stepSelect.hidden ? null : (inputs.stepSelect.value as StepType);

    // A persisted row corrects a record that already exists, so it carries only
    // what may still change; a staged one is still the whole enrollment.
    if (this._isPersisted) {
      const update: EnrollmentUpdateInput = { teacherId: inputs.teacherSelect.value, instrumentType, stepType };

      this._saving = true;
      this.render();
      this.dispatchEvent(
        new CustomEvent('enrollment-update-saved', {
          bubbles: true,
          composed: true,
          detail: { studentCourseId: enrollment.studentCourseId, input: update },
        }),
      );
      return;
    }

    // Only a staged row is built with a course select, so it is present here.
    const input: EnrollmentInput = {
      courseId: inputs.courseSelect!.value,
      teacherId: inputs.teacherSelect.value,
      instrumentType,
      stepType,
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

  private handleWithdrawClicked(enrollment: EnrollmentResult): void {
    this.dispatchEvent(
      new CustomEvent('enrollment-withdraw-clicked', {
        bubbles: true,
        composed: true,
        detail: { enrollment },
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

/** The em dash a settled row shows for a field the course type does not record. */
function buildPlaceholder(): HTMLElement {
  const placeholder = document.createElement('span');
  placeholder.textContent = EM_DASH;
  placeholder.hidden = true;
  return placeholder;
}

customElements.define('pm-enrollment-list', PmEnrollmentList);
