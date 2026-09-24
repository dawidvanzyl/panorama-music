import '../components/pm-report-results-table';
import type { PmReportResultsTable } from '../components/pm-report-results-table';
import { runReport, ReportsError } from '../services/reports';
import { formatReportDate } from '../services/report-date-format';
import { holdResult, takeHeldDefinition, takeHeldResult } from '../state/report-builder-state';
import type { ReportDefinitionModel, ReportResultModel } from '../models/report';

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
      font-size: 16px;
      line-height: 1;
    }
    .results-page__breadcrumb {
      font-size: 12px;
      color: var(--pm-text-muted);
      margin-bottom: 8px;
    }
    .results-page__breadcrumb a {
      color: var(--pm-accent);
      text-decoration: none;
      cursor: pointer;
    }
    .results-page__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 4px;
    }
    .results-page__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--pm-text);
      margin: 0;
    }
    .results-page__subline {
      color: var(--pm-text-muted);
      font-size: 13px;
      margin: 0 0 8px;
    }
    .results-page__caption {
      font-style: italic;
      color: var(--pm-text-muted);
      font-size: 12px;
      margin: 0 0 16px;
    }
    .results-page__actions {
      display: flex;
      gap: 8px;
    }
    .results-page__action {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      height: 34px;
      padding: 0 14px;
      background: transparent;
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 13px;
      font-family: inherit;
      cursor: pointer;
    }
    .results-page__error {
      margin-bottom: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
      font-size: 13px;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="results-page__breadcrumb"><a id="backLink">Reports</a> &rsaquo; New report</div>
  <div class="results-page__header">
    <div>
      <h1 class="results-page__title">New report</h1>
      <p class="results-page__subline" id="subline"></p>
    </div>
    <div class="results-page__actions">
      <button type="button" class="results-page__action" id="edit">
        <span class="material-symbols-outlined">edit</span>
        Edit report
      </button>
      <button type="button" class="results-page__action" id="runAgain">
        <span class="material-symbols-outlined">refresh</span>
        Run again
      </button>
    </div>
  </div>
  <p class="results-page__caption">Filters choose which students appear; each collection lists all of a student's records.</p>
  <div class="results-page__error" id="error" hidden></div>
  <pm-report-results-table id="table"></pm-report-results-table>
`;

export class PmReportResultsPage extends HTMLElement {
  private subline: HTMLElement | null = null;
  private table: PmReportResultsTable | null = null;
  private errorBanner: HTMLElement | null = null;
  private runAgainButton: HTMLButtonElement | null = null;

  private _definition: ReportDefinitionModel | null = null;
  private _result: ReportResultModel | null = null;
  private _running = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.subline = this.shadowRoot!.getElementById('subline') as HTMLElement;
    this.table = this.shadowRoot!.getElementById('table') as unknown as PmReportResultsTable;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;
    this.runAgainButton = this.shadowRoot!.getElementById('runAgain') as HTMLButtonElement;

    this.shadowRoot!.getElementById('backLink')!.addEventListener('click', () => {
      window.location.hash = '#/reports';
    });
    this.shadowRoot!.getElementById('edit')!.addEventListener('click', () => {
      window.location.hash = '#/reports/new';
    });
    this.runAgainButton.addEventListener('click', this.handleRunAgain);

    // The result lives in memory only — a reload with nothing held sends
    // the Teacher back to the Reports list rather than rendering an empty
    // shell.
    this._definition = takeHeldDefinition();
    this._result = takeHeldResult();
    if (!this._definition || !this._result) {
      window.location.hash = '#/reports';
      return;
    }

    this.render();
  }

  private render(): void {
    if (!this._result || !this.subline || !this.table || !this.runAgainButton) return;

    const count = this._result.studentCount;
    const noun = count === 1 ? 'student' : 'students';
    this.subline.textContent = `${count} ${noun} · Last run ${formatReportDate(this._result.ranAt)}`;

    this.table.columns = this._result.columns;
    this.table.sections = this._result.sections;

    this.runAgainButton.disabled = this._running;
  }

  private handleRunAgain = (): void => {
    if (this._running || !this._definition) return;
    this._running = true;
    this.render();

    runReport(this._definition)
      .then((result) => {
        this._running = false;
        this._result = result;
        holdResult(result);
        this.errorBanner!.hidden = true;
        this.render();
      })
      .catch((error: unknown) => {
        this._running = false;
        const message =
          error instanceof ReportsError && error.status >= 400 && error.status < 500
            ? error.message
            : 'Could not run the report. Try again.';
        this.errorBanner!.textContent = message;
        this.errorBanner!.hidden = false;
        this.render();
      });
  };
}

customElements.define('pm-report-results-page', PmReportResultsPage);
