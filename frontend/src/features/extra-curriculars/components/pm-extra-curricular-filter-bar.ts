import { DAYS, DAY_LABELS, PHASES, PHASE_LABELS } from '../services/extra-curricular-display';
import { appendOptions } from '../../../components/select-options';
import type { DayType, PhaseType } from '../services/extra-curriculars';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
    }
    .ec-filter-bar__card {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 16px 24px;
    }
    .ec-filter-bar__search {
      box-sizing: border-box;
      width: 240px;
      height: 38px;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
      font-family: inherit;
      outline: none;
    }
    .ec-filter-bar__select {
      height: 38px;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
      font-family: inherit;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="ec-filter-bar__card">
    <input
      class="ec-filter-bar__search"
      type="search"
      id="description"
      placeholder="Search description"
      aria-label="Description filter"
    />
    <select class="ec-filter-bar__select" id="phase" aria-label="Phase filter">
      <option value="">All Phases</option>
    </select>
    <select class="ec-filter-bar__select" id="day" aria-label="Day filter">
      <option value="">All Days</option>
    </select>
  </div>
`;

export class PmExtraCurricularFilterBar extends HTMLElement {
  private descriptionInput: HTMLInputElement | null = null;
  private phaseSelect: HTMLSelectElement | null = null;
  private daySelect: HTMLSelectElement | null = null;

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

    appendOptions(this.phaseSelect, PHASES, PHASE_LABELS);
    appendOptions(this.daySelect, DAYS, DAY_LABELS);

    this.descriptionInput.addEventListener('input', this.handleChange);
    this.phaseSelect.addEventListener('change', this.handleChange);
    this.daySelect.addEventListener('change', this.handleChange);
  }

  disconnectedCallback(): void {
    this.descriptionInput?.removeEventListener('input', this.handleChange);
    this.phaseSelect?.removeEventListener('change', this.handleChange);
    this.daySelect?.removeEventListener('change', this.handleChange);
  }

  /** Returns every control to its "all" state without announcing a filter change. */
  reset(): void {
    if (!this.descriptionInput) return;
    this.descriptionInput.value = '';
    this.phaseSelect!.value = '';
    this.daySelect!.value = '';
  }

  private handleChange = (): void => {
    this.dispatchEvent(
      new CustomEvent('extra-curricular-filter-changed', {
        bubbles: true,
        composed: true,
        detail: {
          description: this.descriptionInput!.value || undefined,
          phase: (this.phaseSelect!.value || undefined) as PhaseType | undefined,
          day: (this.daySelect!.value || undefined) as DayType | undefined,
        },
      }),
    );
  };
}

customElements.define('pm-extra-curricular-filter-bar', PmExtraCurricularFilterBar);
