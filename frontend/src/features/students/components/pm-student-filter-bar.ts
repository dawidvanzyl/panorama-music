import { GRADES, PHASES, CLASSES, populateSelectOptions } from './student-options';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
    }
    .filter-bar__card {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 16px 24px;
    }
    .filter-bar__name {
      flex: 1;
      min-width: 200px;
      height: 38px;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
    }
    .filter-bar__select {
      height: 38px;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="filter-bar__card">
    <input class="filter-bar__name" id="name" type="text" placeholder="Search students..." />
    <select class="filter-bar__select" id="grade">
      <option value="">All Grades</option>
    </select>
    <select class="filter-bar__select" id="phase">
      <option value="">All Phases</option>
    </select>
    <select class="filter-bar__select" id="class">
      <option value="">All Classes</option>
    </select>
  </div>
`;

export class PmStudentFilterBar extends HTMLElement {
  private nameInput: HTMLInputElement | null = null;
  private gradeSelect: HTMLSelectElement | null = null;
  private phaseSelect: HTMLSelectElement | null = null;
  private classSelect: HTMLSelectElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.nameInput = this.shadowRoot!.getElementById('name') as HTMLInputElement;
    this.gradeSelect = this.shadowRoot!.getElementById('grade') as HTMLSelectElement;
    this.phaseSelect = this.shadowRoot!.getElementById('phase') as HTMLSelectElement;
    this.classSelect = this.shadowRoot!.getElementById('class') as HTMLSelectElement;

    populateSelectOptions(this.gradeSelect, GRADES);
    populateSelectOptions(this.phaseSelect, PHASES);
    populateSelectOptions(this.classSelect, CLASSES);

    this.nameInput.addEventListener('input', this.handleChange);
    this.gradeSelect.addEventListener('change', this.handleChange);
    this.phaseSelect.addEventListener('change', this.handleChange);
    this.classSelect.addEventListener('change', this.handleChange);
  }

  disconnectedCallback(): void {
    this.nameInput?.removeEventListener('input', this.handleChange);
    this.gradeSelect?.removeEventListener('change', this.handleChange);
    this.phaseSelect?.removeEventListener('change', this.handleChange);
    this.classSelect?.removeEventListener('change', this.handleChange);
  }

  private handleChange = (): void => {
    this.dispatchEvent(
      new CustomEvent('filter-changed', {
        bubbles: true,
        composed: true,
        detail: {
          name: this.nameInput!.value || undefined,
          grade: this.gradeSelect!.value || undefined,
          phase: this.phaseSelect!.value || undefined,
          class: this.classSelect!.value || undefined,
        },
      }),
    );
  };
}

customElements.define('pm-student-filter-bar', PmStudentFilterBar);
