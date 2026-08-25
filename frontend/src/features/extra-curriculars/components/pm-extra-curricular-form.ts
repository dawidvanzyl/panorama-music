import {
  DAYS,
  DAY_LABELS,
  MISSING_ERROR,
  MISSING_SLOT_ERROR,
  NO_PRACTICE_TIME_ERROR,
  PHASES,
  PHASE_LABELS,
  duplicatePracticeTimeError,
  practiceTimeText,
} from '../services/extra-curricular-display';
import { appendOptions } from '../../../components/select-options';
import type { DayType, PhaseType, PracticeTimeInput } from '../services/extra-curriculars';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      font-family: 'Inter', system-ui, sans-serif;
    }
    .ec-form__body {
      padding: 24px;
    }
    .ec-form__row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      align-items: start;
    }
    .ec-form__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .ec-form__label {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text-muted);
    }
    .ec-form__input,
    .ec-form__select {
      box-sizing: border-box;
      width: 100%;
      height: 44px;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
      font-family: inherit;
      outline: none;
    }
    .ec-form__input:focus,
    .ec-form__select:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px var(--pm-accent);
    }
    .ec-form__divider {
      border: none;
      border-top: 1px solid var(--pm-border);
      margin: 24px 0;
    }
    .ec-form__section-heading {
      display: flex;
      align-items: baseline;
      gap: 12px;
      margin-bottom: 16px;
    }
    .ec-form__section-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--pm-text);
      margin: 0;
    }
    .ec-form__hint {
      font-size: 11px;
      color: var(--pm-text-muted);
    }
    .ec-form__slot-row {
      display: grid;
      grid-template-columns: 1fr 1fr auto;
      gap: 20px;
      align-items: end;
    }
    .ec-form__add {
      height: 44px;
      padding: 0 20px;
      background: transparent;
      border: 1px solid var(--pm-accent);
      border-radius: var(--pm-radius);
      color: var(--pm-accent);
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
    }
    .ec-form__add:hover {
      background: rgba(79, 124, 255, 0.1);
    }
    .ec-form__chips {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-top: 16px;
    }
    .ec-form__chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: 9999px;
      color: var(--pm-text);
      font-size: 13px;
    }
    .ec-form__chip-remove {
      background: transparent;
      border: none;
      padding: 0;
      color: var(--pm-text-muted);
      font-size: 14px;
      line-height: 1;
      font-family: inherit;
      cursor: pointer;
    }
    .ec-form__chip-remove:hover {
      color: var(--pm-danger);
    }
    .ec-form__empty {
      margin-top: 16px;
      color: var(--pm-text-muted);
      font-size: 13px;
    }
    .ec-form__error {
      display: none;
      align-items: center;
      gap: 8px;
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      border-radius: var(--pm-radius);
      padding: 10px 14px;
      margin-top: 16px;
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-danger);
    }
    .ec-form__error--visible {
      display: flex;
    }
    .ec-form__footer {
      display: flex;
      justify-content: flex-end;
      padding: 16px 24px;
      border-top: 1px solid var(--pm-border);
    }
    .ec-form__submit {
      height: 44px;
      padding: 0 24px;
      border: none;
      border-radius: var(--pm-radius);
      background: var(--pm-accent);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
    }
    .ec-form__submit:hover {
      filter: brightness(1.1);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="ec-form__body">
    <div class="ec-form__row">
      <div class="ec-form__field">
        <label class="ec-form__label" for="description">Description</label>
        <input class="ec-form__input" type="text" id="description" placeholder="e.g. Marimba Band" />
      </div>
      <div class="ec-form__field">
        <label class="ec-form__label" for="phase">Phase</label>
        <select class="ec-form__select" id="phase">
          <option value="">Select a phase</option>
        </select>
      </div>
    </div>

    <hr class="ec-form__divider" />

    <div class="ec-form__section-heading">
      <h2 class="ec-form__section-title">Practice Times</h2>
      <span class="ec-form__hint">At least one weekly slot is required.</span>
    </div>

    <div class="ec-form__slot-row">
      <div class="ec-form__field">
        <label class="ec-form__label" for="day">Day</label>
        <select class="ec-form__select" id="day"></select>
      </div>
      <div class="ec-form__field">
        <label class="ec-form__label" for="startTime">Start Time</label>
        <input class="ec-form__input" type="time" id="startTime" />
      </div>
      <button type="button" class="ec-form__add" id="addBtn">Add Practice Time</button>
    </div>

    <div class="ec-form__chips" id="chips"></div>
    <p class="ec-form__empty" id="noSlots">No practice times added.</p>

    <div class="ec-form__error" id="error"></div>
  </div>
  <div class="ec-form__footer">
    <button type="button" class="ec-form__submit" id="createBtn">Create Activity</button>
  </div>
`;

export class PmExtraCurricularForm extends HTMLElement {
  private descriptionInput: HTMLInputElement | null = null;
  private phaseSelect: HTMLSelectElement | null = null;
  private daySelect: HTMLSelectElement | null = null;
  private startTimeInput: HTMLInputElement | null = null;
  private addBtn: HTMLButtonElement | null = null;
  private createBtn: HTMLButtonElement | null = null;
  private chipList: HTMLElement | null = null;
  private noSlotsMessage: HTMLElement | null = null;
  private errorSlot: HTMLElement | null = null;
  /** The slots staged so far. Nothing is sent until Create Activity is pressed. */
  private stagedSlots: PracticeTimeInput[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.descriptionInput = this.shadowRoot!.getElementById('description') as HTMLInputElement;
    this.phaseSelect = this.shadowRoot!.getElementById('phase') as HTMLSelectElement;
    this.daySelect = this.shadowRoot!.getElementById('day') as HTMLSelectElement;
    this.startTimeInput = this.shadowRoot!.getElementById('startTime') as HTMLInputElement;
    this.addBtn = this.shadowRoot!.getElementById('addBtn') as HTMLButtonElement;
    this.createBtn = this.shadowRoot!.getElementById('createBtn') as HTMLButtonElement;
    this.chipList = this.shadowRoot!.getElementById('chips') as HTMLElement;
    this.noSlotsMessage = this.shadowRoot!.getElementById('noSlots') as HTMLElement;
    this.errorSlot = this.shadowRoot!.getElementById('error') as HTMLElement;

    appendOptions(this.phaseSelect, PHASES, PHASE_LABELS);
    // The day select has no "choose one" placeholder in the design — it opens on
    // Monday, so a slot can be staged without touching it.
    appendOptions(this.daySelect, DAYS, DAY_LABELS);

    this.addBtn.addEventListener('click', this.handleAddSlot);
    this.createBtn.addEventListener('click', this.handleCreate);

    this.renderChips();
  }

  disconnectedCallback(): void {
    this.addBtn?.removeEventListener('click', this.handleAddSlot);
    this.createBtn?.removeEventListener('click', this.handleCreate);
  }

  /** Clears the entered values and staged slots, leaving the form open for the next activity. */
  reset(): void {
    if (!this.descriptionInput) return;
    this.descriptionInput.value = '';
    this.phaseSelect!.value = '';
    this.startTimeInput!.value = '';
    this.daySelect!.selectedIndex = 0;
    this.stagedSlots = [];
    this.clearError();
    this.renderChips();
  }

  showError(message: string): void {
    this.errorSlot!.textContent = message;
    this.errorSlot!.classList.add('ec-form__error--visible');
  }

  clearError(): void {
    this.errorSlot!.textContent = '';
    this.errorSlot!.classList.remove('ec-form__error--visible');
  }

  private renderChips(): void {
    if (!this.chipList) return;

    this.chipList.innerHTML = '';
    this.noSlotsMessage!.hidden = this.stagedSlots.length > 0;

    for (const slot of this.stagedSlots) {
      this.chipList.appendChild(this.buildChip(slot));
    }
  }

  private buildChip(slot: PracticeTimeInput): HTMLElement {
    const chip = document.createElement('span');
    chip.classList.add('ec-form__chip');
    // A slot is identified to a human by its day and time, which is also what
    // makes it unique within the form — so it is what addresses the chip.
    chip.dataset.slot = practiceTimeText(slot);

    const label = document.createElement('span');
    label.textContent = practiceTimeText(slot);

    const remove = document.createElement('button');
    remove.type = 'button';
    remove.classList.add('ec-form__chip-remove');
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove ${practiceTimeText(slot)}`);
    remove.addEventListener('click', () => this.handleRemoveSlot(slot));

    chip.append(label, remove);
    return chip;
  }

  private handleAddSlot = (): void => {
    const day = this.daySelect!.value as DayType | '';
    const startTime = this.startTimeInput!.value;

    if (!day || !startTime) {
      this.showError(MISSING_SLOT_ERROR);
      return;
    }

    const slot: PracticeTimeInput = { day, startTime };
    if (this.stagedSlots.some((staged) => staged.day === day && staged.startTime === startTime)) {
      // A refusal, not a reset: the description, phase and the slots already
      // staged all stay exactly as they were.
      this.showError(duplicatePracticeTimeError(slot));
      return;
    }

    this.stagedSlots = [...this.stagedSlots, slot];
    // The day and start time are left holding what was just staged, so the next
    // slot is usually a single change away.
    this.clearError();
    this.renderChips();
  };

  private handleRemoveSlot(slot: PracticeTimeInput): void {
    this.stagedSlots = this.stagedSlots.filter(
      (staged) => !(staged.day === slot.day && staged.startTime === slot.startTime),
    );
    this.clearError();
    this.renderChips();
  }

  private handleCreate = (): void => {
    const description = this.descriptionInput!.value.trim();
    const phase = this.phaseSelect!.value as PhaseType | '';

    if (!description || !phase) {
      this.showError(MISSING_ERROR);
      return;
    }
    if (this.stagedSlots.length === 0) {
      // Refused here rather than at the server: nothing is sent, and the values
      // already entered stay put so the activity can be completed.
      this.showError(NO_PRACTICE_TIME_ERROR);
      return;
    }

    this.clearError();
    this.dispatchEvent(
      new CustomEvent('extra-curricular-form-submitted', {
        bubbles: true,
        composed: true,
        detail: { description, phase, practiceTimes: this.stagedSlots },
      }),
    );
  };
}

customElements.define('pm-extra-curricular-form', PmExtraCurricularForm);
