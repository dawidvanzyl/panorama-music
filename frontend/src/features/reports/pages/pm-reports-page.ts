import { clearBuilderState } from '../state/report-builder-state';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      flex: 1;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .reports-page__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }
    .reports-page__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--pm-text);
      margin: 0;
    }
    .reports-page__subtitle {
      color: var(--pm-text-muted);
      font-size: 13px;
      margin: 0 0 24px;
    }
    .reports-page__create {
      height: 38px;
      padding: 0 16px;
      background: var(--pm-accent);
      border: none;
      border-radius: var(--pm-radius);
      color: white;
      font-size: 13px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
    }
    .reports-page__create:hover {
      background: var(--pm-accent-hover);
    }
    .reports-page__empty {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 32px;
      text-align: center;
      color: var(--pm-text-muted);
      font-size: 13px;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="reports-page__container">
    <div class="reports-page__header">
      <div>
        <h1 class="reports-page__title">Reports</h1>
      </div>
      <button type="button" class="reports-page__create" id="create">+ Create report</button>
    </div>
    <p class="reports-page__subtitle">Saved student reports.</p>
    <div class="reports-page__empty" id="empty">No saved reports yet.</div>
  </div>
`;

export class PmReportsPage extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('create')!.addEventListener('click', () => {
      clearBuilderState();
      window.location.hash = '#/reports/new';
    });
  }
}

customElements.define('pm-reports-page', PmReportsPage);
