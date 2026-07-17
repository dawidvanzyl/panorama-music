import { AUDIT_EVENT_TYPE_GROUPS } from '../services/audit';

export interface AuditFilterValues {
  actor: string;
  eventType: string;
  from: string;
  to: string;
}

// The <input type="date"> value is a bare "yyyy-mm-dd" with no timezone —
// it names a day in the viewer's own local calendar. Converting it to the
// UTC instant that begins/ends that local day (rather than sending the bare
// string, which the server would otherwise treat as a UTC calendar day)
// keeps filtering consistent with how the table displays timestamps: in
// the viewer's local timezone.
function localDayStartUtcIso(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 0, 0, 0, 0).toISOString();
}

function localDayEndUtcIso(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .filter-bar__card {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 16px;
      margin-bottom: 16px;
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: flex-end;
    }
    .filter-bar__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      min-width: 180px;
      flex: 1;
    }
    .filter-bar__label {
      font-size: 12px;
      color: var(--pm-text-muted);
    }
    .filter-bar__input,
    .filter-bar__select {
      padding: 8px 12px;
      border-radius: var(--pm-radius);
      border: 1px solid var(--pm-border);
      background: var(--pm-surface-2);
      color: var(--pm-text);
      font-size: 14px;
      font-family: inherit;
    }
    .filter-bar__actions {
      display: flex;
      gap: 8px;
    }
    .filter-bar__btn {
      padding: 8px 16px;
      border-radius: var(--pm-radius);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .filter-bar__btn--clear {
      background: transparent;
      border: 1px solid var(--pm-border);
      color: var(--pm-text);
    }
    .filter-bar__btn--clear:hover {
      background: var(--pm-surface-2);
    }
    .filter-bar__btn--apply {
      background: var(--pm-accent);
      border: 1px solid var(--pm-accent);
      color: #fff;
    }
    .filter-bar__btn--apply:hover {
      background: var(--pm-accent-hover);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="filter-bar__card">
    <div class="filter-bar__field">
      <label class="filter-bar__label" for="actor">Actor Email</label>
      <input type="text" id="actor" class="filter-bar__input" placeholder="Search email…" />
    </div>
    <div class="filter-bar__field">
      <label class="filter-bar__label" for="eventType">Event Type</label>
      <select id="eventType" class="filter-bar__select">
        <option value="">All Events</option>
      </select>
    </div>
    <div class="filter-bar__field">
      <label class="filter-bar__label" for="from">From</label>
      <input type="date" id="from" class="filter-bar__input" />
    </div>
    <div class="filter-bar__field">
      <label class="filter-bar__label" for="to">To</label>
      <input type="date" id="to" class="filter-bar__input" />
    </div>
    <div class="filter-bar__actions">
      <button type="button" class="filter-bar__btn filter-bar__btn--clear" id="clearBtn">Clear</button>
      <button type="button" class="filter-bar__btn filter-bar__btn--apply" id="applyBtn">Apply</button>
    </div>
  </div>
`;

export class PmAuditFilterBar extends HTMLElement {
  private actorInput: HTMLInputElement | null = null;
  private eventTypeSelect: HTMLSelectElement | null = null;
  private fromInput: HTMLInputElement | null = null;
  private toInput: HTMLInputElement | null = null;
  private applyBtn: HTMLButtonElement | null = null;
  private clearBtn: HTMLButtonElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.actorInput = this.shadowRoot!.getElementById('actor') as HTMLInputElement;
    this.eventTypeSelect = this.shadowRoot!.getElementById('eventType') as HTMLSelectElement;
    this.fromInput = this.shadowRoot!.getElementById('from') as HTMLInputElement;
    this.toInput = this.shadowRoot!.getElementById('to') as HTMLInputElement;
    this.applyBtn = this.shadowRoot!.getElementById('applyBtn') as HTMLButtonElement;
    this.clearBtn = this.shadowRoot!.getElementById('clearBtn') as HTMLButtonElement;

    this.populateEventTypes();
    this.applyBtn.addEventListener('click', this.handleApply);
    this.clearBtn.addEventListener('click', this.handleClear);
  }

  disconnectedCallback(): void {
    this.applyBtn?.removeEventListener('click', this.handleApply);
    this.clearBtn?.removeEventListener('click', this.handleClear);
  }

  private populateEventTypes(): void {
    for (const group of AUDIT_EVENT_TYPE_GROUPS) {
      const optgroup = document.createElement('optgroup');
      optgroup.label = group.context;
      for (const option of group.options) {
        const el = document.createElement('option');
        el.value = option.value;
        el.textContent = option.label;
        optgroup.appendChild(el);
      }
      this.eventTypeSelect!.appendChild(optgroup);
    }
  }

  private handleApply = (): void => {
    this.emitFilterChanged();
  };

  private handleClear = (): void => {
    this.actorInput!.value = '';
    this.eventTypeSelect!.value = '';
    this.fromInput!.value = '';
    this.toInput!.value = '';
    this.emitFilterChanged();
  };

  private emitFilterChanged(): void {
    const fromValue = this.fromInput!.value;
    const toValue = this.toInput!.value;
    const detail: AuditFilterValues = {
      actor: this.actorInput!.value.trim(),
      eventType: this.eventTypeSelect!.value,
      from: fromValue ? localDayStartUtcIso(fromValue) : '',
      to: toValue ? localDayEndUtcIso(toValue) : '',
    };
    this.dispatchEvent(
      new CustomEvent<AuditFilterValues>('audit-filter-changed', {
        bubbles: true,
        composed: true,
        detail,
      }),
    );
  }
}

customElements.define('pm-audit-filter-bar', PmAuditFilterBar);
