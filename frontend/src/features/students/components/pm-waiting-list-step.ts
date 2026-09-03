import { addPlaceholderOption, populateSelectOptions } from './student-options';
import { INSTRUMENT_TYPES, INSTRUMENT_TYPE_LABELS } from './enrollment-options';
import {
  OCCURRENCE_TYPE_LABELS,
  LESSON_TYPE_LABELS,
  DURATION_TYPE_LABELS,
  type OccurrenceType,
  type LessonType,
  type DurationType,
  type InstrumentType,
} from '../../../services/lesson-structure';
import { formatAddedAt } from './waiting-list-display';
import type { WaitingListEntryInput, LessonStructure } from '../services/waiting-list';

/** An existing entry as the tab shows it, with the added date-time it is fixed at. */
export interface WaitingListStepValues {
  occurrenceType: OccurrenceType;
  lessonType: LessonType;
  durationType: DurationType;
  instrumentType: InstrumentType;
  notes: string | null;
  addedAt: string;
}

const OCCURRENCE_TYPES = Object.keys(OCCURRENCE_TYPE_LABELS) as OccurrenceType[];
const LESSON_TYPES = Object.keys(LESSON_TYPE_LABELS) as LessonType[];
const DURATION_TYPES = Object.keys(DURATION_TYPE_LABELS) as DurationType[];

/** Notes' documented maximum — matches the design mockup's own textarea and the server's own rule. */
export const NOTES_MAX_LENGTH = 500;

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
    }
    .waiting-list-step__grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
    }
    .waiting-list-step__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .waiting-list-step__field--wide {
      grid-column: 1 / -1;
    }
    .waiting-list-step__label {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text);
    }
    .waiting-list-step__input,
    .waiting-list-step__select,
    .waiting-list-step__textarea {
      box-sizing: border-box;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
      font-family: inherit;
    }
    .waiting-list-step__input,
    .waiting-list-step__select {
      height: 44px;
    }
    .waiting-list-step__textarea {
      padding: 10px 12px;
      resize: vertical;
    }
    .waiting-list-step__readonly {
      box-sizing: border-box;
      height: 44px;
      display: flex;
      align-items: center;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text-muted);
      font-size: 14px;
    }
    [hidden] {
      display: none !important;
    }
    .waiting-list-step__hint {
      font-size: 12px;
      color: var(--pm-text-muted);
      margin: 12px 0 0;
    }
    .waiting-list-step__message {
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      font-size: 13px;
      display: none;
    }
    .waiting-list-step__message--error {
      display: block;
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <form id="form">
    <div class="waiting-list-step__grid">
      <div class="waiting-list-step__field">
        <label class="waiting-list-step__label" for="occurrenceType">Occurrence Type</label>
        <select class="waiting-list-step__select" id="occurrenceType" required></select>
      </div>
      <div class="waiting-list-step__field">
        <label class="waiting-list-step__label" for="lessonType">Lesson Type</label>
        <select class="waiting-list-step__select" id="lessonType" required></select>
      </div>
      <div class="waiting-list-step__field">
        <label class="waiting-list-step__label" for="durationType">Duration Type</label>
        <select class="waiting-list-step__select" id="durationType" required></select>
      </div>
      <div class="waiting-list-step__field">
        <label class="waiting-list-step__label" for="instrumentType">Instrument Type</label>
        <select class="waiting-list-step__select" id="instrumentType" required></select>
      </div>
      <div class="waiting-list-step__field" id="addedAtField" hidden>
        <label class="waiting-list-step__label" id="addedAtLabel">Date Added</label>
        <div class="waiting-list-step__readonly" id="addedAt" aria-labelledby="addedAtLabel"></div>
      </div>
      <div class="waiting-list-step__field waiting-list-step__field--wide">
        <label class="waiting-list-step__label" for="notes">Notes</label>
        <textarea class="waiting-list-step__textarea" id="notes" rows="4" maxlength="${NOTES_MAX_LENGTH}"></textarea>
      </div>
    </div>
    <p class="waiting-list-step__hint" id="captureHint">Date added is set automatically to today and cannot be edited.</p>
  </form>
  <div class="waiting-list-step__message" id="message"></div>
`;

export class PmWaitingListStep extends HTMLElement {
  private form: HTMLFormElement | null = null;
  private occurrenceTypeSelect: HTMLSelectElement | null = null;
  private lessonTypeSelect: HTMLSelectElement | null = null;
  private durationTypeSelect: HTMLSelectElement | null = null;
  private instrumentTypeSelect: HTMLSelectElement | null = null;
  private notesTextarea: HTMLTextAreaElement | null = null;
  private message: HTMLElement | null = null;
  private addedAtField: HTMLElement | null = null;
  private addedAtValue: HTMLElement | null = null;
  private captureHint: HTMLElement | null = null;

  private _lessonStructures: LessonStructure[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.form = this.shadowRoot!.getElementById('form') as HTMLFormElement;
    this.occurrenceTypeSelect = this.shadowRoot!.getElementById('occurrenceType') as HTMLSelectElement;
    this.lessonTypeSelect = this.shadowRoot!.getElementById('lessonType') as HTMLSelectElement;
    this.durationTypeSelect = this.shadowRoot!.getElementById('durationType') as HTMLSelectElement;
    this.instrumentTypeSelect = this.shadowRoot!.getElementById('instrumentType') as HTMLSelectElement;
    this.notesTextarea = this.shadowRoot!.getElementById('notes') as HTMLTextAreaElement;
    this.message = this.shadowRoot!.getElementById('message') as HTMLElement;
    this.addedAtField = this.shadowRoot!.getElementById('addedAtField') as HTMLElement;
    this.addedAtValue = this.shadowRoot!.getElementById('addedAt') as HTMLElement;
    this.captureHint = this.shadowRoot!.getElementById('captureHint') as HTMLElement;

    populateSelectOptions(this.occurrenceTypeSelect, OCCURRENCE_TYPES, (v) => OCCURRENCE_TYPE_LABELS[v]);
    populateSelectOptions(this.lessonTypeSelect, LESSON_TYPES, (v) => LESSON_TYPE_LABELS[v]);
    populateSelectOptions(this.durationTypeSelect, DURATION_TYPES, (v) => DURATION_TYPE_LABELS[v]);
    populateSelectOptions(this.instrumentTypeSelect, INSTRUMENT_TYPES, (v) => INSTRUMENT_TYPE_LABELS[v]);
    this.reset();
  }

  /** The seeded combinations the occurrence/lesson/duration choice is resolved against on save. */
  set lessonStructures(value: LessonStructure[]) {
    this._lessonStructures = value;
  }

  reset(): void {
    this.clearError();
    this.form!.reset();
    for (const select of this.selects()) {
      addPlaceholderOption(select.element, select.label);
      select.element.value = '';
    }
    // Capture has no date added to show yet — the server assigns one when the
    // entry is created — so the field is absent and the hint says so instead.
    this.addedAtField!.hidden = true;
    this.addedAtValue!.textContent = '';
    this.captureHint!.hidden = false;
  }

  /**
   * Seeds the tab from an entry being corrected. Date Added is rendered as
   * static text with no control of any kind: it is the queue's ordering key,
   * so there is deliberately nothing here to type in, pick from or clear —
   * not a disabled input that a submission could still carry a value for.
   */
  setValues(values: WaitingListStepValues): void {
    this.clearError();
    for (const select of this.selects()) {
      addPlaceholderOption(select.element, select.label);
    }
    this.occurrenceTypeSelect!.value = values.occurrenceType;
    this.lessonTypeSelect!.value = values.lessonType;
    this.durationTypeSelect!.value = values.durationType;
    this.instrumentTypeSelect!.value = values.instrumentType;
    this.notesTextarea!.value = values.notes ?? '';

    this.addedAtValue!.textContent = formatAddedAt(values.addedAt);
    this.addedAtField!.hidden = false;
    this.captureHint!.hidden = true;
  }

  getValues(): WaitingListEntryInput {
    const structure = this._lessonStructures.find(
      (s) =>
        s.occurrenceType === this.occurrenceTypeSelect!.value &&
        s.lessonType === this.lessonTypeSelect!.value &&
        s.durationType === this.durationTypeSelect!.value,
    );
    // The four selects are populated from the same seeded vocabulary the
    // structures themselves are drawn from, so a chosen triple with no match
    // would mean the lookup never loaded — a programming error, not a state a
    // user can reach through the form.
    if (!structure) throw new Error('No seeded lesson structure matches the chosen combination.');

    return {
      lessonStructureId: structure.lessonStructureId,
      instrumentType: this.instrumentTypeSelect!.value as WaitingListEntryInput['instrumentType'],
      notes: this.notesTextarea!.value.trim() || null,
    };
  }

  reportValidity(): boolean {
    return this.form!.reportValidity();
  }

  showError(message: string): void {
    this.message!.textContent = message;
    this.message!.classList.add('waiting-list-step__message--error');
  }

  clearError(): void {
    this.message!.textContent = '';
    this.message!.className = 'waiting-list-step__message';
  }

  private selects(): Array<{ element: HTMLSelectElement; label: string }> {
    return [
      { element: this.occurrenceTypeSelect!, label: 'Occurrence Type' },
      { element: this.lessonTypeSelect!, label: 'Lesson Type' },
      { element: this.durationTypeSelect!, label: 'Duration Type' },
      { element: this.instrumentTypeSelect!, label: 'Instrument Type' },
    ];
  }
}

customElements.define('pm-waiting-list-step', PmWaitingListStep);
