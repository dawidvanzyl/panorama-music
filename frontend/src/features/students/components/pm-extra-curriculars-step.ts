import {
  NO_ACTIVITIES_ASSIGNED,
  PHASE_LABELS,
  PHASE_RESTRICTION_NOTE,
  activityOptionLabel,
  practiceTimesText,
} from './extra-curricular-options';
import type { PhaseType, StudentExtraCurricular } from '../services/student-extra-curriculars';

type Mode = 'inactive' | 'create' | 'edit';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .ec-step__section {
      display: none;
      flex-direction: column;
      gap: 16px;
    }
    .ec-step__section--visible {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .ec-step__toolbar {
      display: flex;
      flex-shrink: 0;
      justify-content: flex-end;
    }
    .ec-step__btn {
      height: 36px;
      padding: 0 16px;
      border-radius: var(--pm-radius);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      background: var(--pm-accent);
      color: #fff;
    }
    .ec-step__panel {
      flex-shrink: 0;
      max-height: 0;
      overflow: hidden;
      transition: max-height 220ms ease;
    }
    .ec-step__panel--expanded {
      /* A generous fixed ceiling above the panel's actual content height, for the
         same reason the Courses step's form panel carries one. */
      max-height: 320px;
    }
    .ec-step__panel-inner {
      padding: 0 3px 4px;
    }
    .ec-step__fields {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 16px;
      align-items: end;
    }
    .ec-step__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ec-step__label {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text);
    }
    .ec-step__control {
      box-sizing: border-box;
      height: 44px;
      padding: 0 12px;
      background: var(--pm-surface-alt, #22263a);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
      font-family: inherit;
    }
    .ec-step__control:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .ec-step__note {
      margin: 10px 0 0;
      font-size: 11px;
      letter-spacing: 0.02em;
      color: var(--pm-text-muted);
    }
    .ec-step__panel-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      margin-top: 20px;
    }
    .ec-step__panel-btn {
      height: 40px;
      padding: 0 20px;
      border-radius: var(--pm-radius);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .ec-step__panel-btn--cancel {
      background: transparent;
      border: 1px solid var(--pm-border);
      color: var(--pm-text);
    }
    .ec-step__panel-btn--assign {
      border: none;
      background: var(--pm-accent);
      color: #fff;
    }
    .ec-step__table-wrap {
      flex: 1;
      min-height: 0;
      overflow: auto;
    }
    table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }
    th,
    td {
      text-align: left;
      padding: 8px 10px;
      font-size: 13px;
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
    td.ec-step__practice-times {
      color: var(--pm-text-muted);
    }
    .ec-step__actions-header,
    .ec-step__actions {
      text-align: right;
      width: 120px;
    }
    .ec-step__remove {
      background: transparent;
      border: none;
      padding: 0;
      color: var(--pm-danger);
      font: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .ec-step__badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .ec-step__badge--junior {
      background: rgba(79, 124, 255, 0.15);
      color: var(--pm-accent);
    }
    .ec-step__badge--senior {
      background: rgba(143, 212, 78, 0.15);
      color: var(--pm-success);
    }
    .ec-step__empty {
      color: var(--pm-text-muted);
      font-size: 14px;
      margin: 16px 0 0;
    }
    .ec-step__message {
      flex-shrink: 0;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      font-size: 13px;
      display: none;
    }
    .ec-step__message--error {
      display: block;
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="ec-step__section" id="section">
    <div class="ec-step__message" id="message"></div>
    <div class="ec-step__toolbar" id="toolbar">
      <button type="button" class="ec-step__btn" id="addBtn">Add Activity</button>
    </div>
    <div class="ec-step__panel" id="panel">
      <div class="ec-step__panel-inner">
        <div class="ec-step__fields">
          <div class="ec-step__field">
            <label class="ec-step__label" for="activitySelect">Activity</label>
            <select class="ec-step__control" id="activitySelect"></select>
          </div>
          <div class="ec-step__field">
            <label class="ec-step__label" for="phaseField">Phase</label>
            <input class="ec-step__control" id="phaseField" disabled value="">
          </div>
        </div>
        <p class="ec-step__note" id="note"></p>
        <div class="ec-step__panel-actions">
          <button type="button" class="ec-step__panel-btn ec-step__panel-btn--cancel" id="cancelBtn">Cancel</button>
          <button type="button" class="ec-step__panel-btn ec-step__panel-btn--assign" id="assignBtn">Assign</button>
        </div>
      </div>
    </div>
    <div class="ec-step__table-wrap">
      <table>
        <thead>
          <tr>
            <th>Activity</th>
            <th>Phase</th>
            <th>Practice Times</th>
            <th class="ec-step__actions-header">Actions</th>
          </tr>
        </thead>
        <tbody id="rows"></tbody>
      </table>
      <p class="ec-step__empty" id="empty" hidden></p>
    </div>
  </div>
`;

/**
 * The Student modal's Extra-Curriculars tab. In edit mode an assignment or a
 * removal is written straight away; in create mode both are staged in memory
 * until the student is saved, exactly as the Siblings, Guardians and Courses
 * steps already behave.
 */
export class PmExtraCurricularsStep extends HTMLElement {
  private section: HTMLElement | null = null;
  private toolbar: HTMLElement | null = null;
  private addBtn: HTMLButtonElement | null = null;
  private panel: HTMLElement | null = null;
  private activitySelect: HTMLSelectElement | null = null;
  private phaseField: HTMLInputElement | null = null;
  private note: HTMLElement | null = null;
  private cancelBtn: HTMLButtonElement | null = null;
  private assignBtn: HTMLButtonElement | null = null;
  private rowsBody: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private message: HTMLElement | null = null;

  private _mode: Mode = 'inactive';
  private _studentId: string | null = null;
  private _phase: PhaseType | null = null;
  private _assigned: StudentExtraCurricular[] = [];
  private _assignable: StudentExtraCurricular[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.section = this.shadowRoot!.getElementById('section') as HTMLElement;
    this.toolbar = this.shadowRoot!.getElementById('toolbar') as HTMLElement;
    this.addBtn = this.shadowRoot!.getElementById('addBtn') as HTMLButtonElement;
    this.panel = this.shadowRoot!.getElementById('panel') as HTMLElement;
    this.activitySelect = this.shadowRoot!.getElementById('activitySelect') as HTMLSelectElement;
    this.phaseField = this.shadowRoot!.getElementById('phaseField') as HTMLInputElement;
    this.note = this.shadowRoot!.getElementById('note') as HTMLElement;
    this.cancelBtn = this.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement;
    this.assignBtn = this.shadowRoot!.getElementById('assignBtn') as HTMLButtonElement;
    this.rowsBody = this.shadowRoot!.getElementById('rows') as HTMLElement;
    this.emptyMessage = this.shadowRoot!.getElementById('empty') as HTMLElement;
    this.message = this.shadowRoot!.getElementById('message') as HTMLElement;

    this.note.textContent = PHASE_RESTRICTION_NOTE;
    this.emptyMessage.textContent = NO_ACTIVITIES_ASSIGNED;
    this.panel.setAttribute('inert', '');

    this.addBtn.addEventListener('click', this.handleAddClicked);
    this.cancelBtn.addEventListener('click', this.handleCancelClicked);
    this.assignBtn.addEventListener('click', this.handleAssignClicked);

    // Anything assigned to these before the element was upgraded landed as a
    // plain own property, which then shadows the accessor for good — every later
    // assignment silently sets a field nothing reads. Re-applying them through
    // the accessors is the standard upgrade fix, and it matters here because the
    // wizard pushes the phase down as it opens, which can precede the upgrade.
    this.upgradeProperty('phase');
    this.upgradeProperty('assigned');
    this.upgradeProperty('assignable');
  }

  private upgradeProperty(name: 'phase' | 'assigned' | 'assignable'): void {
    if (!Object.hasOwn(this, name)) return;

    const value = this[name] as never;
    delete this[name];
    this[name] = value;
  }

  disconnectedCallback(): void {
    this.addBtn?.removeEventListener('click', this.handleAddClicked);
    this.cancelBtn?.removeEventListener('click', this.handleCancelClicked);
    this.assignBtn?.removeEventListener('click', this.handleAssignClicked);
  }

  /** Create mode: the student has no id yet, so assignments are staged until Save. */
  activateForCreate(phase: PhaseType | null): void {
    this._mode = 'create';
    this._studentId = null;
    this._phase = phase;
    this._assigned = [];
    this._assignable = [];
    this.clearError();
    this.closePanel();
    this.renderAssigned();

    this.section!.classList.add('ec-step__section--visible');
  }

  /** Edit mode: participation for a student who already exists. */
  activate(studentId: string, phase: PhaseType | null): void {
    this._mode = 'edit';
    this._studentId = studentId;
    this._phase = phase;
    this.clearError();
    this.closePanel();

    this.section!.classList.add('ec-step__section--visible');
  }

  /**
   * The activities the student takes part in (edit mode), pushed in by the page
   * after a fetch. Data-only — it does not touch the panel, for the same reason
   * the Courses step's list setter does not: a background refresh can race a
   * panel the user just opened.
   */
  set assigned(value: StudentExtraCurricular[]) {
    this._assigned = value;
    this.renderAssigned();
  }

  /** The picker's options, pushed in by the page when the panel is opened. */
  set assignable(value: StudentExtraCurricular[]) {
    // The read is phase-scoped and knows nothing about this student, so leaving
    // out what they already take part in is this step's job in both modes: in
    // create mode those are the staged activities the server cannot know about,
    // in edit mode the ones it holds but was not asked to exclude. One filter,
    // because `_assigned` is the same list either way.
    const held = new Set(this._assigned.map((activity) => activity.extraCurricularId));
    this._assignable = value.filter((activity) => !held.has(activity.extraCurricularId));
    this.renderAssignable();
  }

  /** The student's own phase, shown as the panel's non-editable Phase value. */
  set phase(value: PhaseType | null) {
    this._phase = value;
    if (this.phaseField) this.phaseField.value = value ? PHASE_LABELS[value] : '';
  }

  /** Activities staged during create mode, to be assigned once the student is saved. */
  get pendingExtraCurricularIds(): string[] {
    return this._assigned.map((activity) => activity.extraCurricularId);
  }

  /**
   * Drops everything staged and closes the panel. Run when the grade becomes
   * Private in create mode: that student takes part in nothing, and nothing has
   * been written yet, so the staged set simply goes. Edit mode does not call this
   * — a persisted assignment is deleted by saving the student, not by the change.
   */
  discardStaged(): void {
    this._assigned = [];
    this._assignable = [];
    this.clearError();
    this.closePanel();
    this.renderAssigned();
  }

  showError(message: string): void {
    this.message!.textContent = message;
    this.message!.classList.add('ec-step__message--error');
  }

  clearError(): void {
    this.message!.textContent = '';
    this.message!.className = 'ec-step__message';
  }

  /** Collapses the Add Activity panel (if open) and returns to the table. */
  closePanel(): void {
    this.panel!.classList.remove('ec-step__panel--expanded');
    this.panel!.setAttribute('inert', '');
    this.addBtn!.hidden = false;
    this.toolbar!.hidden = false;
  }

  private openPanel(): void {
    this.panel!.classList.add('ec-step__panel--expanded');
    this.panel!.removeAttribute('inert');
    this.addBtn!.hidden = true;
  }

  private handleAddClicked = (): void => {
    this.clearError();
    this.phase = this._phase;
    this.openPanel();

    // The list is asked for each time the panel opens, so an activity removed a
    // moment ago is offered again without the tab having to track it. The phase
    // is the whole of the request: the read is phase-scoped in both modes, and
    // which activities this student already holds is settled here rather than by
    // the caller.
    this.dispatchEvent(
      new CustomEvent('extra-curriculars-assignable-requested', {
        bubbles: true,
        composed: true,
        detail: { phase: this._phase },
      }),
    );
  };

  private handleCancelClicked = (): void => {
    this.closePanel();
  };

  private handleAssignClicked = (): void => {
    const extraCurricularId = this.activitySelect!.value;
    // Nothing chosen — an empty picker, or the placeholder still selected. There
    // is nothing to assign, so nothing is sent and the panel stays as it is.
    if (!extraCurricularId) return;

    const activity = this._assignable.find((candidate) => candidate.extraCurricularId === extraCurricularId);
    if (!activity) return;

    if (this._mode === 'create') {
      this._assigned = [...this._assigned, activity];
      this.clearError();
      this.closePanel();
      this.renderAssigned();
      return;
    }

    this.dispatchEvent(
      new CustomEvent('extra-curricular-assign-requested', {
        bubbles: true,
        composed: true,
        detail: { studentId: this._studentId, extraCurricularId },
      }),
    );
  };

  private handleRemoveClicked(activity: StudentExtraCurricular): void {
    if (this._mode === 'create') {
      this._assigned = this._assigned.filter((staged) => staged.extraCurricularId !== activity.extraCurricularId);
      this.clearError();
      this.renderAssigned();
      return;
    }

    this.dispatchEvent(
      new CustomEvent('extra-curricular-remove-requested', {
        bubbles: true,
        composed: true,
        detail: { studentId: this._studentId, extraCurricularId: activity.extraCurricularId },
      }),
    );
  }

  private renderAssignable(): void {
    this.activitySelect!.replaceChildren();

    for (const activity of this._assignable) {
      const option = document.createElement('option');
      option.value = activity.extraCurricularId;
      option.textContent = activityOptionLabel(activity);
      this.activitySelect!.appendChild(option);
    }
  }

  private renderAssigned(): void {
    if (!this.rowsBody || !this.emptyMessage) return;

    this.rowsBody.replaceChildren();
    this.emptyMessage.hidden = this._assigned.length > 0;

    for (const activity of this._assigned) {
      this.rowsBody.appendChild(this.buildRow(activity));
    }
  }

  private buildRow(activity: StudentExtraCurricular): HTMLElement {
    const row = document.createElement('tr');
    row.dataset.extraCurricularId = activity.extraCurricularId;

    const description = document.createElement('td');
    description.textContent = activity.description;

    const phase = document.createElement('td');
    const badge = document.createElement('span');
    badge.classList.add(
      'ec-step__badge',
      activity.phase === 'Junior' ? 'ec-step__badge--junior' : 'ec-step__badge--senior',
    );
    badge.textContent = PHASE_LABELS[activity.phase];
    phase.appendChild(badge);

    const practiceTimes = document.createElement('td');
    practiceTimes.classList.add('ec-step__practice-times');
    practiceTimes.textContent = practiceTimesText(activity);

    const actions = document.createElement('td');
    actions.classList.add('ec-step__actions');
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.classList.add('ec-step__remove');
    remove.textContent = 'Remove';
    remove.addEventListener('click', () => this.handleRemoveClicked(activity));
    actions.appendChild(remove);

    row.append(description, phase, practiceTimes, actions);
    return row;
  }
}

customElements.define('pm-extra-curriculars-step', PmExtraCurricularsStep);
