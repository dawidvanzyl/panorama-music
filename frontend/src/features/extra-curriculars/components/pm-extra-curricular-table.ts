import './pm-extra-curricular-practice-times';
import { MISSING_ERROR, PHASES, PHASE_LABELS, practiceTimesText } from '../services/extra-curricular-display';
import type { ExtraCurricular, PhaseType } from '../services/extra-curriculars';
import type { PmExtraCurricularPracticeTimes } from './pm-extra-curricular-practice-times';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
    }
    .ec-table__card {
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
    .ec-table__expander-header,
    .ec-table__expander {
      width: 40px;
    }
    .ec-table__chevron {
      display: block;
      background: transparent;
      border: none;
      padding: 0;
      color: var(--pm-text-muted);
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
      font-family: 'Material Symbols Outlined', system-ui, sans-serif;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
    }
    .ec-table__chevron--expanded {
      color: var(--pm-text);
    }
    td.ec-table__panel {
      padding: 0 4px 16px;
    }
    td.ec-table__practice-times {
      color: var(--pm-text-muted);
    }
    .ec-table__actions-header,
    .ec-table__actions {
      text-align: right;
      width: 160px;
    }
    .ec-table__badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .ec-table__badge--junior {
      background: rgba(79, 124, 255, 0.15);
      color: var(--pm-accent);
    }
    .ec-table__badge--senior {
      background: rgba(143, 212, 78, 0.15);
      color: var(--pm-success);
    }
    .ec-table__empty {
      color: var(--pm-text-muted);
      font-size: 14px;
      margin: 16px 0 0;
    }
    /* The reason a save or delete failed sits inside the row it concerns, above
       its cells, so it is never mistaken for another row's. */
    .ec-table__error-cell {
      border-bottom: none;
      padding-bottom: 0;
    }
    .ec-table__error {
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
    .ec-table__input,
    .ec-table__select {
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
    .ec-table__btn {
      border: 1px solid transparent;
      border-radius: var(--pm-radius);
      padding: 6px 12px;
      font-size: 12px;
      font-family: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .ec-table__btn + .ec-table__btn {
      margin-left: 6px;
    }
    .ec-table__btn--edit {
      background: transparent;
      border-color: var(--pm-accent);
      color: var(--pm-accent);
    }
    .ec-table__btn--edit:hover:not(:disabled) {
      background: rgba(79, 124, 255, 0.1);
    }
    .ec-table__btn--delete {
      background: var(--pm-danger, #e05252);
      border-color: var(--pm-danger, #e05252);
      color: #fff;
    }
    .ec-table__btn--save {
      background: var(--pm-accent);
      color: #fff;
    }
    .ec-table__btn--cancel {
      background: transparent;
      color: var(--pm-text-muted);
    }
    .ec-table__btn--cancel:hover {
      background: var(--pm-surface-2);
    }
    .ec-table__btn--delete:hover:not(:disabled),
    .ec-table__btn--save:hover:not(:disabled) {
      opacity: 0.9;
    }
    .ec-table__btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="ec-table__card">
    <table>
      <thead>
        <tr>
          <th class="ec-table__expander-header"></th>
          <th>Description</th>
          <th>Phase</th>
          <th>Practice Times</th>
          <th class="ec-table__actions-header" id="actionsHeader" hidden>Actions</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <p class="ec-table__empty" id="empty" hidden>No extra-curricular activities found.</p>
  </div>
`;

export class PmExtraCurricularTable extends HTMLElement {
  private rowsBody: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private actionsHeader: HTMLElement | null = null;
  private _extraCurriculars: ExtraCurricular[] = [];
  private _showActions = false;
  /** The activity whose practice-times panel is open, if any. */
  private expandedId: string | null = null;
  /**
   * The open panel itself, kept across renders rather than rebuilt. A rebuild
   * would clear the day and start time the user had already chosen every time
   * the catalogue reloaded.
   */
  private panel: PmExtraCurricularPracticeTimes | null = null;
  /** The activity whose description and phase are currently editable, if any. */
  private editingId: string | null = null;
  /** The values in the edit inputs, kept so a re-render does not lose them. */
  private descriptionDraft = '';
  private phaseDraft: PhaseType = 'Junior';
  private errorId: string | null = null;
  private errorMessage = '';
  /** A save is in flight; its actions stay dead until it lands, so one click sends one request. */
  private saving = false;

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
    this.upgradeProperty('extraCurriculars');
    this.upgradeProperty('showActions');

    this.render();
  }

  set extraCurriculars(value: ExtraCurricular[]) {
    this._extraCurriculars = value;
    // A fresh list is what a completed save or delete produces, so any edit and
    // any row error it might have carried are done with.
    this.editingId = null;
    this.descriptionDraft = '';
    this.saving = false;
    this.clearRowError();
    this.render();
  }

  get extraCurriculars(): ExtraCurricular[] {
    return this._extraCurriculars;
  }

  /**
   * Whether this viewer may maintain the catalogue. A read-only viewer gets no
   * actions column at all rather than an empty or disabled one, matching how the
   * endpoints answer them. The expanded panel follows the same flag for its own
   * controls.
   */
  set showActions(value: boolean) {
    this._showActions = value;
    this.render();
  }

  get showActions(): boolean {
    return this._showActions;
  }

  /**
   * Puts a refusal the server answered with onto the open panel, beside the
   * controls that produced it. The panel answers its own two rules without a
   * request; this is for everything else.
   */
  showPanelError(message: string): void {
    this.panel?.showError(message);
  }

  /**
   * Reports a refused save or delete against the row it concerns. A row being
   * edited stays in edit mode holding the entered values, so the change can be
   * corrected and retried.
   */
  showRowError(extraCurricularId: string, message: string): void {
    this.errorId = extraCurricularId;
    this.errorMessage = message;
    this.saving = false;
    this.render();
  }

  clearRowError(): void {
    this.errorId = null;
    this.errorMessage = '';
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
    this.emptyMessage.hidden = this._extraCurriculars.length > 0;

    // An activity narrowed out of the list by a filter, or deleted elsewhere,
    // takes its open panel with it rather than leaving one orphaned.
    if (!this._extraCurriculars.some((activity) => activity.extraCurricularId === this.expandedId)) {
      this.collapse();
    }

    this.rowsBody.innerHTML = '';

    for (const extraCurricular of this._extraCurriculars) {
      if (extraCurricular.extraCurricularId === this.errorId) {
        this.rowsBody.appendChild(this.buildErrorRow());
      }

      this.rowsBody.appendChild(this.buildRow(extraCurricular));

      if (extraCurricular.extraCurricularId === this.expandedId) {
        this.rowsBody.appendChild(this.buildPanelRow(extraCurricular));
      }
    }
  }

  /**
   * The panel row: a full-width cell beneath the activity's own row, holding the
   * panel element. It carries no description text of its own, so a locator that
   * filters rows by an activity's description still addresses exactly one row.
   */
  private buildPanelRow(extraCurricular: ExtraCurricular): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.dataset.practiceTimesPanelFor = extraCurricular.extraCurricularId;

    const cell = document.createElement('td');
    cell.classList.add('ec-table__panel');
    cell.colSpan = this._showActions ? 5 : 4;

    this.panel ??= document.createElement(
      'pm-extra-curricular-practice-times',
    ) as unknown as PmExtraCurricularPracticeTimes;
    this.panel.showActions = this._showActions;
    this.panel.extraCurricular = extraCurricular;

    cell.appendChild(this.panel);
    row.appendChild(cell);
    return row;
  }

  private toggleExpanded(extraCurricularId: string): void {
    if (this.expandedId === extraCurricularId) {
      this.collapse();
    } else {
      // One panel at a time: a second one open below the first would put two
      // activities' slots on screen with only their headings to tell them apart.
      this.collapse();
      this.expandedId = extraCurricularId;
    }

    this.render();
  }

  private collapse(): void {
    this.expandedId = null;
    this.panel = null;
  }

  private buildRow(extraCurricular: ExtraCurricular): HTMLTableRowElement {
    const row = document.createElement('tr');
    // The description is free text and not unique, so the row carries the
    // activity's identifier — that is what addresses exactly one row.
    row.dataset.extraCurricularId = extraCurricular.extraCurricularId;

    const expanded = this.expandedId === extraCurricular.extraCurricularId;

    const expanderCell = document.createElement('td');
    expanderCell.classList.add('ec-table__expander');
    expanderCell.appendChild(this.buildExpander(extraCurricular, expanded));

    const editing = this.editingId === extraCurricular.extraCurricularId;

    const descriptionCell = document.createElement('td');
    if (editing) {
      descriptionCell.appendChild(this.buildDescriptionInput());
    } else {
      descriptionCell.textContent = extraCurricular.description;
    }

    const phaseCell = document.createElement('td');
    phaseCell.appendChild(editing ? this.buildPhaseSelect() : this.buildPhaseBadge(extraCurricular));

    // The practice times stay read-only in edit mode: a slot is added and
    // removed from the expanded panel, and never edited in place.
    const practiceTimesCell = document.createElement('td');
    practiceTimesCell.classList.add('ec-table__practice-times');
    practiceTimesCell.textContent = practiceTimesText(extraCurricular);

    row.append(expanderCell, descriptionCell, phaseCell, practiceTimesCell);

    if (this._showActions) {
      row.appendChild(editing ? this.buildEditActions(extraCurricular) : this.buildDisplayActions(extraCurricular));
    }

    return row;
  }

  private buildErrorRow(): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.classList.add('ec-table__error-row');
    row.dataset.errorFor = this.errorId ?? '';

    const cell = document.createElement('td');
    cell.classList.add('ec-table__error-cell');
    cell.colSpan = this._showActions ? 5 : 4;

    const banner = document.createElement('div');
    banner.classList.add('ec-table__error');
    banner.textContent = this.errorMessage;
    cell.appendChild(banner);

    row.appendChild(cell);
    return row;
  }

  private buildDescriptionInput(): HTMLInputElement {
    const input = document.createElement('input');
    input.type = 'text';
    input.id = 'descriptionInput';
    input.classList.add('ec-table__input');
    input.value = this.descriptionDraft;
    input.addEventListener('input', () => {
      this.descriptionDraft = input.value;
    });
    return input;
  }

  private buildPhaseSelect(): HTMLSelectElement {
    const select = document.createElement('select');
    select.id = 'phaseSelect';
    select.classList.add('ec-table__select');

    for (const phase of PHASES) {
      const option = document.createElement('option');
      option.value = phase;
      option.textContent = PHASE_LABELS[phase];
      select.appendChild(option);
    }

    select.value = this.phaseDraft;
    select.addEventListener('change', () => {
      this.phaseDraft = select.value as PhaseType;
    });
    return select;
  }

  private buildDisplayActions(extraCurricular: ExtraCurricular): HTMLTableCellElement {
    const cell = document.createElement('td');
    cell.classList.add('ec-table__actions');

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.classList.add('ec-table__btn', 'ec-table__btn--edit');
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', () => this.handleEditClicked(extraCurricular));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.classList.add('ec-table__btn', 'ec-table__btn--delete');
    deleteBtn.textContent = 'Delete';
    deleteBtn.addEventListener('click', () => this.handleDeleteClicked(extraCurricular));

    cell.append(editBtn, deleteBtn);
    return cell;
  }

  private buildEditActions(extraCurricular: ExtraCurricular): HTMLTableCellElement {
    const cell = document.createElement('td');
    cell.classList.add('ec-table__actions');

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.classList.add('ec-table__btn', 'ec-table__btn--save');
    saveBtn.textContent = 'Save';
    saveBtn.disabled = this.saving;
    saveBtn.addEventListener('click', () => this.handleSaveClicked(extraCurricular));

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.classList.add('ec-table__btn', 'ec-table__btn--cancel');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.disabled = this.saving;
    cancelBtn.addEventListener('click', () => this.handleCancelClicked());

    cell.append(saveBtn, cancelBtn);
    return cell;
  }

  private handleEditClicked(extraCurricular: ExtraCurricular): void {
    this.editingId = extraCurricular.extraCurricularId;
    this.descriptionDraft = extraCurricular.description;
    this.phaseDraft = extraCurricular.phase;
    this.saving = false;
    this.clearRowError();
    this.render();
  }

  /** Restores the stored values by discarding the drafts; nothing is sent. */
  private handleCancelClicked(): void {
    this.editingId = null;
    this.descriptionDraft = '';
    this.saving = false;
    this.clearRowError();
    this.render();
  }

  private handleSaveClicked(extraCurricular: ExtraCurricular): void {
    // The disabled button is the visible half of this; the flag is the half that
    // actually guarantees one save produces one request.
    if (this.saving) return;

    const description = this.descriptionDraft.trim();

    if (description === '') {
      this.showRowError(extraCurricular.extraCurricularId, MISSING_ERROR);
      return;
    }

    // Rendering here both retires any error the previous attempt left on screen
    // and takes the row's actions out of service until the save lands.
    this.clearRowError();
    this.saving = true;
    this.render();
    this.dispatchEvent(
      new CustomEvent('extra-curricular-save-requested', {
        bubbles: true,
        composed: true,
        detail: { extraCurricularId: extraCurricular.extraCurricularId, description, phase: this.phaseDraft },
      }),
    );
  }

  private handleDeleteClicked(extraCurricular: ExtraCurricular): void {
    this.clearRowError();
    this.render();
    this.dispatchEvent(
      new CustomEvent('extra-curricular-delete-clicked', {
        bubbles: true,
        composed: true,
        detail: { extraCurricular },
      }),
    );
  }

  /**
   * The chevron that opens and closes the row's practice-times panel. Its glyph
   * is what says which state the row is in — `chevron_right` closed,
   * `expand_more` open — so the collapsed state is visible rather than inferred
   * from the panel's absence.
   */
  private buildExpander(extraCurricular: ExtraCurricular, expanded: boolean): HTMLElement {
    const chevron = document.createElement('button');
    chevron.type = 'button';
    chevron.classList.add('ec-table__chevron');
    chevron.classList.toggle('ec-table__chevron--expanded', expanded);
    chevron.dataset.expanded = String(expanded);
    chevron.textContent = expanded ? 'expand_more' : 'chevron_right';
    chevron.setAttribute(
      'aria-label',
      `${expanded ? 'Collapse' : 'Expand'} practice times for ${extraCurricular.description}`,
    );
    chevron.addEventListener('click', () => this.toggleExpanded(extraCurricular.extraCurricularId));
    return chevron;
  }

  private buildPhaseBadge(extraCurricular: ExtraCurricular): HTMLElement {
    const badge = document.createElement('span');
    badge.classList.add(
      'ec-table__badge',
      extraCurricular.phase === 'Junior' ? 'ec-table__badge--junior' : 'ec-table__badge--senior',
    );
    badge.textContent = PHASE_LABELS[extraCurricular.phase];
    return badge;
  }
}

customElements.define('pm-extra-curricular-table', PmExtraCurricularTable);
