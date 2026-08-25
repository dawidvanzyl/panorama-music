import {
  DAYS,
  DAY_LABELS,
  MISSING_SLOT_ERROR,
  NO_PRACTICE_TIME_ERROR,
  duplicatePracticeTimeError,
  practiceTimesHeading,
  startTimeText,
} from '../services/extra-curricular-display';
import { appendOptions } from '../../../components/select-options';
import type { DayType, ExtraCurricular } from '../services/extra-curriculars';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
      font-family: 'Material Symbols Outlined', system-ui, sans-serif;
      font-size: 18px;
    }
    .ec-panel {
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 16px 20px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .ec-panel__title {
      font-size: 13px;
      font-weight: 600;
      color: var(--pm-text);
    }
    .ec-panel__error {
      display: none;
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
    .ec-panel__error--visible {
      display: flex;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      text-align: left;
      padding: 0 8px 8px;
      font-size: 11px;
      font-weight: 400;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pm-text-muted);
      border-bottom: 1px solid var(--pm-border);
    }
    td {
      padding: 8px;
      font-size: 13px;
      color: var(--pm-text);
      border-bottom: 1px solid var(--pm-border);
    }
    .ec-panel__actions-header,
    .ec-panel__actions {
      text-align: right;
    }
    .ec-panel__remove {
      background: transparent;
      border: none;
      padding: 4px 8px;
      border-radius: var(--pm-radius);
      color: var(--pm-danger);
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
    }
    .ec-panel__add {
      display: grid;
      grid-template-columns: 220px 160px auto;
      gap: 12px;
      align-items: center;
    }
    .ec-panel__select,
    .ec-panel__time {
      box-sizing: border-box;
      height: 38px;
      padding: 0 12px;
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 13px;
      font-family: inherit;
    }
    .ec-panel__select--error,
    .ec-panel__time--error {
      border-color: var(--pm-danger);
    }
    .ec-panel__add-button {
      height: 38px;
      padding: 0 16px;
      border: none;
      border-radius: var(--pm-radius);
      background: var(--pm-accent);
      color: #fff;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      justify-self: start;
    }
    [hidden] {
      display: none !important;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="ec-panel">
    <span class="ec-panel__title" id="title"></span>
    <div class="ec-panel__error" id="error">
      <span class="material-symbols-outlined">error</span>
      <span id="errorText"></span>
    </div>
    <table>
      <thead>
        <tr>
          <th>Day</th>
          <th>Start Time</th>
          <th class="ec-panel__actions-header" id="actionsHeader" hidden>Actions</th>
        </tr>
      </thead>
      <tbody id="slots"></tbody>
    </table>
    <div class="ec-panel__add" id="add" hidden>
      <select class="ec-panel__select" id="day" aria-label="Day"></select>
      <input class="ec-panel__time" type="time" id="startTime" aria-label="Start Time" />
      <button type="button" class="ec-panel__add-button" id="addBtn">Add</button>
    </div>
  </div>
`;

/**
 * The practice times of one activity, opened beneath its row. Slots are only
 * ever added and removed — there is no edit affordance here, and none is to be
 * introduced: a slot is changed by removing it and adding its replacement.
 *
 * Both refusals are answered here without a round trip, so the panel never posts
 * a change it already knows will be refused. The endpoints enforce the same two
 * rules independently.
 */
export class PmExtraCurricularPracticeTimes extends HTMLElement {
  private heading: HTMLElement | null = null;
  private errorBanner: HTMLElement | null = null;
  private errorText: HTMLElement | null = null;
  private slotsBody: HTMLElement | null = null;
  private actionsHeader: HTMLElement | null = null;
  private addControl: HTMLElement | null = null;
  private daySelect: HTMLSelectElement | null = null;
  private startTimeInput: HTMLInputElement | null = null;
  private addBtn: HTMLButtonElement | null = null;
  private _extraCurricular: ExtraCurricular | null = null;
  private _showActions = false;

  /**
   * Everything that must happen exactly once lives here rather than in
   * <c>connectedCallback</c>. The table moves this element between parents on
   * every render to keep the day and start time already chosen, so the connected
   * callback runs many times over one panel's life — anything one-time placed
   * there would be done again on each of them. Building the day options there is
   * what gave the select a second and third set of Monday–Sunday.
   *
   * The shadow tree exists from this point on, so the lookups and the listener
   * are safe here, and the listener sits on a child that travels with the
   * element.
   */
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));

    this.heading = this.shadowRoot!.getElementById('title') as HTMLElement;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;
    this.errorText = this.shadowRoot!.getElementById('errorText') as HTMLElement;
    this.slotsBody = this.shadowRoot!.getElementById('slots') as HTMLElement;
    this.actionsHeader = this.shadowRoot!.getElementById('actionsHeader') as HTMLElement;
    this.addControl = this.shadowRoot!.getElementById('add') as HTMLElement;
    this.daySelect = this.shadowRoot!.getElementById('day') as HTMLSelectElement;
    this.startTimeInput = this.shadowRoot!.getElementById('startTime') as HTMLInputElement;
    this.addBtn = this.shadowRoot!.getElementById('addBtn') as HTMLButtonElement;

    // The day select has no "choose one" placeholder in the design — it opens on
    // Monday, so a slot can be added without touching it.
    appendOptions(this.daySelect, DAYS, DAY_LABELS);

    this.addBtn.addEventListener('click', this.handleAdd);
  }

  /** Re-entrant by construction: everything below is safe to repeat. */
  connectedCallback(): void {
    // A property assigned before this element upgraded lands as an own property
    // that shadows the accessor below, so it is replayed through the setter here.
    this.upgradeProperty('extraCurricular');
    this.upgradeProperty('showActions');

    this.render();
  }

  set extraCurricular(value: ExtraCurricular | null) {
    this._extraCurricular = value;
    this.render();
  }

  get extraCurricular(): ExtraCurricular | null {
    return this._extraCurricular;
  }

  /**
   * Whether this viewer may maintain the slots. A Teacher who is not a
   * Coordinator gets the list and nothing else: the Add control and every
   * per-slot Remove are absent rather than disabled, matching how the endpoints
   * answer them.
   */
  set showActions(value: boolean) {
    this._showActions = value;
    this.render();
  }

  get showActions(): boolean {
    return this._showActions;
  }

  showError(message: string): void {
    this.errorText!.textContent = message;
    this.errorBanner!.classList.add('ec-panel__error--visible');
  }

  clearError(): void {
    this.errorText!.textContent = '';
    this.errorBanner!.classList.remove('ec-panel__error--visible');
    this.markSlotControls(false);
  }

  private upgradeProperty(name: string): void {
    if (!Object.hasOwn(this, name)) return;

    const self = this as unknown as Record<string, unknown>;
    const value = self[name];
    delete self[name];
    self[name] = value;
  }

  private render(): void {
    if (!this.slotsBody || !this._extraCurricular) return;

    this.heading!.textContent = practiceTimesHeading(this._extraCurricular.description);
    this.actionsHeader!.hidden = !this._showActions;
    this.addControl!.hidden = !this._showActions;

    this.slotsBody.innerHTML = '';
    for (const slot of this._extraCurricular.practiceTimes) {
      this.slotsBody.appendChild(this.buildSlotRow(slot));
    }
  }

  private buildSlotRow(slot: { practiceTimeId: string; day: DayType; startTime: string }): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.dataset.practiceTimeId = slot.practiceTimeId;

    const dayCell = document.createElement('td');
    dayCell.textContent = DAY_LABELS[slot.day];

    const startTimeCell = document.createElement('td');
    startTimeCell.textContent = startTimeText(slot.startTime);

    row.append(dayCell, startTimeCell);

    if (this._showActions) {
      const actionsCell = document.createElement('td');
      actionsCell.classList.add('ec-panel__actions');

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.classList.add('ec-panel__remove');
      remove.textContent = 'Remove';
      remove.addEventListener('click', () => this.handleRemove(slot.practiceTimeId));

      actionsCell.appendChild(remove);
      row.appendChild(actionsCell);
    }

    return row;
  }

  private handleAdd = (): void => {
    const day = this.daySelect!.value as DayType | '';
    const startTime = this.startTimeInput!.value;

    if (!day || !startTime) {
      this.showError(MISSING_SLOT_ERROR);
      return;
    }

    // Refused here rather than at the server: nothing is sent, and the day and
    // start time stay put so the entry can be corrected.
    const held = this._extraCurricular!.practiceTimes.some(
      (slot) => slot.day === day && startTimeText(slot.startTime) === startTime,
    );
    if (held) {
      this.showError(duplicatePracticeTimeError({ day, startTime }));
      this.markSlotControls(true);
      return;
    }

    this.clearError();
    this.dispatchEvent(
      new CustomEvent('extra-curricular-practice-time-add-requested', {
        bubbles: true,
        composed: true,
        detail: { extraCurricularId: this._extraCurricular!.extraCurricularId, day, startTime },
      }),
    );
  };

  private handleRemove(practiceTimeId: string): void {
    // An activity must keep at least one practice time, so the last one is
    // refused without a request. Remove is still offered on it — the refusal is
    // what states the rule.
    if (this._extraCurricular!.practiceTimes.length === 1) {
      this.showError(NO_PRACTICE_TIME_ERROR);
      return;
    }

    this.clearError();
    this.dispatchEvent(
      new CustomEvent('extra-curricular-practice-time-remove-requested', {
        bubbles: true,
        composed: true,
        detail: { extraCurricularId: this._extraCurricular!.extraCurricularId, practiceTimeId },
      }),
    );
  }

  /** The error outline the design puts on both add controls when a slot is refused. */
  private markSlotControls(inError: boolean): void {
    this.daySelect!.classList.toggle('ec-panel__select--error', inError);
    this.startTimeInput!.classList.toggle('ec-panel__time--error', inError);
  }
}

customElements.define('pm-extra-curricular-practice-times', PmExtraCurricularPracticeTimes);
