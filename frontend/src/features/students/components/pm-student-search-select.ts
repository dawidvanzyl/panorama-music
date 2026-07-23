import type { StudentResult } from '../services/students';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .search-select__row {
      display: flex;
      gap: 8px;
    }
    .search-select__input-wrap {
      position: relative;
      flex: 1;
      min-width: 160px;
    }
    .search-select__input {
      box-sizing: border-box;
      width: 100%;
      height: 40px;
      padding: 0 36px 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
    }
    .search-select__clear-btn {
      position: absolute;
      top: 50%;
      right: 6px;
      transform: translateY(-50%);
      display: flex;
      align-items: center;
      justify-content: center;
      width: 22px;
      height: 22px;
      padding: 0;
      border: none;
      background: transparent;
      cursor: pointer;
    }
    .search-select__clear-btn[hidden] {
      display: none;
    }
    .search-select__clear-icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-variation-settings: 'FILL' 1;
      font-size: 20px;
      line-height: 1;
      color: #fff;
    }
    .search-select__add-btn {
      height: 40px;
      padding: 0 20px;
      border: none;
      border-radius: var(--pm-radius);
      background: var(--pm-accent);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .search-select__add-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .search-select__results {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-top: 8px;
      max-height: 160px;
      overflow-y: auto;
    }
    .search-select__result {
      display: block;
      width: 100%;
      box-sizing: border-box;
      text-align: left;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 8px 12px;
      font-size: 14px;
      color: var(--pm-text);
      cursor: pointer;
    }
    .search-select__result:hover {
      background: var(--pm-surface);
    }
    .search-select__empty {
      margin: 4px 0 0;
      font-size: 13px;
      color: var(--pm-text-muted);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="search-select__row">
    <div class="search-select__input-wrap">
      <input class="search-select__input" id="query" type="text" placeholder="Search students..." />
      <button class="search-select__clear-btn" id="clearBtn" type="button" hidden aria-label="Clear search">
        <span class="search-select__clear-icon">cancel</span>
      </button>
    </div>
    <button class="search-select__add-btn" id="addBtn" type="button" disabled>Add</button>
  </div>
  <div class="search-select__results" id="results"></div>
`;

export class PmStudentSearchSelect extends HTMLElement {
  private queryInput: HTMLInputElement | null = null;
  private clearBtn: HTMLButtonElement | null = null;
  private resultsList: HTMLElement | null = null;
  private addBtn: HTMLButtonElement | null = null;
  private _candidates: StudentResult[] = [];
  private _selectedId: string | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.queryInput = this.shadowRoot!.getElementById('query') as HTMLInputElement;
    this.clearBtn = this.shadowRoot!.getElementById('clearBtn') as HTMLButtonElement;
    this.resultsList = this.shadowRoot!.getElementById('results') as HTMLElement;
    this.addBtn = this.shadowRoot!.getElementById('addBtn') as HTMLButtonElement;

    this.queryInput.addEventListener('input', this.renderResults);
    this.clearBtn.addEventListener('click', this.handleClear);
    this.addBtn.addEventListener('click', this.handleAdd);
  }

  disconnectedCallback(): void {
    this.queryInput?.removeEventListener('input', this.renderResults);
    this.clearBtn?.removeEventListener('click', this.handleClear);
    this.addBtn?.removeEventListener('click', this.handleAdd);
  }

  set candidates(value: StudentResult[]) {
    this._candidates = value;
    this.reset();
  }

  get candidates(): StudentResult[] {
    return this._candidates;
  }

  reset(): void {
    if (!this.queryInput) return;
    this.queryInput.value = '';
    this.renderResults();
  }

  private renderResults = (): void => {
    if (!this.resultsList || !this.queryInput) return;

    this.clearBtn!.hidden = this.queryInput.value.length === 0;

    const query = this.queryInput.value.trim().toLowerCase();

    this._selectedId = null;
    this.resultsList.innerHTML = '';

    if (!query) {
      this.updateAddButtonState();
      return;
    }

    const matches = this._candidates.filter((c) => `${c.firstName} ${c.lastName}`.toLowerCase().includes(query));

    if (matches.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'search-select__empty';
      empty.textContent = 'No matching students.';
      this.resultsList.appendChild(empty);
    }

    for (const candidate of matches) {
      const result = document.createElement('button');
      result.type = 'button';
      result.className = 'search-select__result';
      result.dataset.studentId = candidate.studentId;
      result.textContent = `${candidate.firstName} ${candidate.lastName}`;
      result.addEventListener('click', () => this.selectCandidate(candidate));
      this.resultsList.appendChild(result);
    }

    this.updateAddButtonState();
  };

  private selectCandidate(candidate: StudentResult): void {
    this._selectedId = candidate.studentId;
    this.queryInput!.value = `${candidate.firstName} ${candidate.lastName}`;
    this.clearBtn!.hidden = false;
    this.resultsList!.innerHTML = '';

    this.updateAddButtonState();
  }

  private updateAddButtonState(): void {
    this.addBtn!.disabled = !this._selectedId;
  }

  private handleClear = (): void => {
    if (!this.queryInput) return;
    this.queryInput.value = '';
    this.queryInput.focus();
    this.renderResults();
  };

  private handleAdd = (): void => {
    const siblingId = this._selectedId;
    if (!siblingId) return;

    this.dispatchEvent(
      new CustomEvent('sibling-add-clicked', {
        bubbles: true,
        composed: true,
        detail: { siblingId },
      }),
    );
  };
}

customElements.define('pm-student-search-select', PmStudentSearchSelect);
