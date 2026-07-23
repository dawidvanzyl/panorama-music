import './pm-sibling-list';
import './pm-student-search-select';
import type { StudentResult } from '../services/students';
import type { PmSiblingList } from './pm-sibling-list';
import type { PmStudentSearchSelect } from './pm-student-search-select';

type Mode = 'inactive' | 'create' | 'edit';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .siblings-step__placeholder {
      color: var(--pm-text-muted);
      font-size: 14px;
    }
    .siblings-step__section {
      display: none;
      flex-direction: column;
      gap: 16px;
    }
    .siblings-step__section--visible {
      display: flex;
    }
    .siblings-step__message {
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      font-size: 13px;
      display: none;
    }
    .siblings-step__message--error {
      display: block;
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <p class="siblings-step__placeholder" id="placeholder" hidden></p>
  <div class="siblings-step__section" id="section">
    <pm-student-search-select id="searchSelect"></pm-student-search-select>
    <div class="siblings-step__message" id="message"></div>
    <pm-sibling-list id="siblingList"></pm-sibling-list>
  </div>
`;

export class PmSiblingsStep extends HTMLElement {
  private placeholder: HTMLElement | null = null;
  private section: HTMLElement | null = null;
  private message: HTMLElement | null = null;
  private searchSelect: PmStudentSearchSelect | null = null;
  private siblingList: PmSiblingList | null = null;
  private _mode: Mode = 'inactive';
  private _studentId: string | null = null;
  private _createCandidates: StudentResult[] = [];
  private _pendingSiblings: StudentResult[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.placeholder = this.shadowRoot!.getElementById('placeholder') as HTMLElement;
    this.section = this.shadowRoot!.getElementById('section') as HTMLElement;
    this.message = this.shadowRoot!.getElementById('message') as HTMLElement;
    this.searchSelect = this.shadowRoot!.getElementById('searchSelect') as unknown as PmStudentSearchSelect;
    this.siblingList = this.shadowRoot!.getElementById('siblingList') as unknown as PmSiblingList;

    this.shadowRoot!.addEventListener('sibling-add-clicked', this.handleAddClicked);
    this.shadowRoot!.addEventListener('sibling-remove-clicked', this.handleRemoveClicked);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener('sibling-add-clicked', this.handleAddClicked);
    this.shadowRoot!.removeEventListener('sibling-remove-clicked', this.handleRemoveClicked);
  }

  /**
   * Create mode: the student doesn't have an id yet, so siblings picked here are
   * staged locally (see `pendingSiblingIds`) rather than sent to the API immediately.
   * `candidates` is the full student roster, since a brand-new student can't have
   * any siblings linked yet to filter out.
   */
  activateForCreate(candidates: StudentResult[]): void {
    this._mode = 'create';
    this._studentId = null;
    this._createCandidates = [...candidates];
    this._pendingSiblings = [];
    this.clearError();
    this.siblingList!.siblings = [];

    if (candidates.length === 0) {
      this.placeholder!.textContent = 'No other students exist yet to add as a sibling.';
      this.placeholder!.hidden = false;
      this.section!.classList.remove('siblings-step__section--visible');
      return;
    }

    this.placeholder!.hidden = true;
    this.section!.classList.add('siblings-step__section--visible');
    this.searchSelect!.candidates = this._createCandidates;
  }

  /**
   * Edit mode: sibling management is available for the given student. The real
   * siblings/candidates arrive asynchronously (see `siblings`/`candidates` setters,
   * populated by the page after an API round trip) — clear any leftover state from
   * a previous student here so nothing stale flashes on screen while that's in flight.
   */
  activate(studentId: string): void {
    this._mode = 'edit';
    this._studentId = studentId;
    this.clearError();
    this.placeholder!.hidden = true;
    this.section!.classList.add('siblings-step__section--visible');
    this.siblingList!.siblings = [];
    this.searchSelect!.candidates = [];
  }

  /** Studentids staged during create mode, to be linked once the student is saved. */
  get pendingSiblingIds(): string[] {
    return this._pendingSiblings.map((s) => s.studentId);
  }

  set siblings(value: StudentResult[]) {
    this.siblingList!.siblings = value;
  }

  set candidates(value: StudentResult[]) {
    this.searchSelect!.candidates = value;
  }

  showError(message: string): void {
    this.message!.textContent = message;
    this.message!.classList.add('siblings-step__message--error');
  }

  clearError(): void {
    this.message!.textContent = '';
    this.message!.className = 'siblings-step__message';
  }

  private handleAddClicked = (event: Event): void => {
    const { siblingId } = (event as CustomEvent<{ siblingId: string }>).detail;

    if (this._mode === 'edit' && this._studentId) {
      this.dispatchEvent(
        new CustomEvent('sibling-add-requested', {
          bubbles: true,
          composed: true,
          detail: { studentId: this._studentId, siblingId },
        }),
      );
      return;
    }

    if (this._mode === 'create') this.addPendingSibling(siblingId);
  };

  private handleRemoveClicked = (event: Event): void => {
    const { siblingId } = (event as CustomEvent<{ siblingId: string }>).detail;

    if (this._mode === 'edit' && this._studentId) {
      this.dispatchEvent(
        new CustomEvent('sibling-remove-requested', {
          bubbles: true,
          composed: true,
          detail: { studentId: this._studentId, siblingId },
        }),
      );
      return;
    }

    if (this._mode === 'create') this.removePendingSibling(siblingId);
  };

  private addPendingSibling(siblingId: string): void {
    const index = this._createCandidates.findIndex((c) => c.studentId === siblingId);
    if (index === -1) return;

    const [candidate] = this._createCandidates.splice(index, 1);
    this._pendingSiblings.push(candidate);
    this.siblingList!.siblings = this._pendingSiblings;
    this.searchSelect!.candidates = this._createCandidates;
  }

  private removePendingSibling(siblingId: string): void {
    const index = this._pendingSiblings.findIndex((s) => s.studentId === siblingId);
    if (index === -1) return;

    const [removed] = this._pendingSiblings.splice(index, 1);
    this._createCandidates.push(removed);
    this.siblingList!.siblings = this._pendingSiblings;
    this.searchSelect!.candidates = this._createCandidates;
  }
}

customElements.define('pm-siblings-step', PmSiblingsStep);
