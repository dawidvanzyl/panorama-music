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
    <input class="filter-bar__name" id="name" type="text" placeholder="Search teachers..." />
    <select class="filter-bar__select" id="status">
      <option value="">All Status</option>
      <option value="active">Active</option>
      <option value="deactivated">Deactivated</option>
    </select>
    <select class="filter-bar__select" id="type">
      <option value="">All Types</option>
      <option value="private">Private</option>
      <option value="school-paid">School-paid</option>
    </select>
    <select class="filter-bar__select" id="account">
      <option value="">All Accounts</option>
      <option value="linked">Linked</option>
      <option value="not-linked">Not Linked</option>
    </select>
  </div>
`;

export class PmTeacherFilterBar extends HTMLElement {
  private nameInput: HTMLInputElement | null = null;
  private statusSelect: HTMLSelectElement | null = null;
  private typeSelect: HTMLSelectElement | null = null;
  private accountSelect: HTMLSelectElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.nameInput = this.shadowRoot!.getElementById('name') as HTMLInputElement;
    this.statusSelect = this.shadowRoot!.getElementById('status') as HTMLSelectElement;
    this.typeSelect = this.shadowRoot!.getElementById('type') as HTMLSelectElement;
    this.accountSelect = this.shadowRoot!.getElementById('account') as HTMLSelectElement;

    this.nameInput.addEventListener('input', this.handleChange);
    this.statusSelect.addEventListener('change', this.handleChange);
    this.typeSelect.addEventListener('change', this.handleChange);
    this.accountSelect.addEventListener('change', this.handleChange);
  }

  disconnectedCallback(): void {
    this.nameInput?.removeEventListener('input', this.handleChange);
    this.statusSelect?.removeEventListener('change', this.handleChange);
    this.typeSelect?.removeEventListener('change', this.handleChange);
    this.accountSelect?.removeEventListener('change', this.handleChange);
  }

  private handleChange = (): void => {
    this.dispatchEvent(
      new CustomEvent('filter-changed', {
        bubbles: true,
        composed: true,
        detail: {
          name: this.nameInput!.value || undefined,
          status: this.statusSelect!.value || undefined,
          type: this.typeSelect!.value || undefined,
          account: this.accountSelect!.value || undefined,
        },
      }),
    );
  };
}

customElements.define('pm-teacher-filter-bar', PmTeacherFilterBar);
