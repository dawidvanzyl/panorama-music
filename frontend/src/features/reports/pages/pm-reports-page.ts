import '../components/pm-saved-reports-table';
import type { PmSavedReportsTable } from '../components/pm-saved-reports-table';
import { clearBuilderState } from '../state/report-builder-state';
import { listSavedReports } from '../services/reports';
import type { SavedReportSummary } from '../models/report';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      flex: 1;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
      font-family: 'Material Symbols Outlined', system-ui, sans-serif;
      font-size: 18px;
      line-height: 1;
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
      display: inline-flex;
      align-items: center;
      gap: 6px;
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
    .reports-page__error {
      margin-bottom: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
      font-size: 13px;
    }
    .reports-page__retry {
      margin-left: 12px;
      background: none;
      border: none;
      color: var(--pm-danger);
      text-decoration: underline;
      cursor: pointer;
      font: inherit;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="reports-page__container">
    <div class="reports-page__header">
      <div>
        <h1 class="reports-page__title">Reports</h1>
      </div>
      <button type="button" class="reports-page__create" id="create">
        <span class="material-symbols-outlined">add</span>
        Create report
      </button>
    </div>
    <p class="reports-page__subtitle">Saved student reports.</p>
    <div class="reports-page__error" id="error" data-testid="saved-reports-error" hidden></div>
    <div class="reports-page__empty" id="empty" hidden>No saved reports yet.</div>
    <pm-saved-reports-table id="table" hidden></pm-saved-reports-table>
  </div>
`;

export class PmReportsPage extends HTMLElement {
  private table: PmSavedReportsTable | null = null;
  private emptyMessage: HTMLElement | null = null;
  private errorBanner: HTMLElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.table = this.shadowRoot!.getElementById('table') as unknown as PmSavedReportsTable;
    this.emptyMessage = this.shadowRoot!.getElementById('empty') as HTMLElement;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;

    this.shadowRoot!.getElementById('create')!.addEventListener('click', () => {
      clearBuilderState();
      window.location.hash = '#/reports/new';
    });
    this.shadowRoot!.addEventListener('saved-report-run-requested', this.handleRunRequested as EventListener);

    void this.load();
  }

  private async load(): Promise<void> {
    this.table!.hidden = true;
    this.emptyMessage!.hidden = true;
    this.errorBanner!.hidden = true;

    try {
      const reports = await listSavedReports();
      this.render(reports);
    } catch {
      this.showError();
    }
  }

  private render(reports: SavedReportSummary[]): void {
    if (reports.length === 0) {
      this.emptyMessage!.hidden = false;
      this.table!.hidden = true;
      return;
    }

    this.table!.reports = reports;
    this.table!.hidden = false;
    this.emptyMessage!.hidden = true;
  }

  private showError(): void {
    this.errorBanner!.textContent = 'Could not load saved reports. Try again.';
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'reports-page__retry';
    retry.textContent = 'Retry';
    retry.addEventListener('click', () => void this.load());
    this.errorBanner!.appendChild(retry);
    this.errorBanner!.hidden = false;
  }

  private handleRunRequested = (event: CustomEvent<{ id: string }>): void => {
    window.location.hash = `#/reports/${event.detail.id}`;
  };
}

customElements.define('pm-reports-page', PmReportsPage);
