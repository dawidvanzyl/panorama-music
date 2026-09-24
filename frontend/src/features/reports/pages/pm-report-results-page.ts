import '../components/pm-report-results-table';
import type { PmReportResultsTable } from '../components/pm-report-results-table';
import { runReport, ReportsError } from '../services/reports';
import { formatReportDate } from '../services/report-date-format';
import { buildPrintHeader } from '../state/report-print-header';
import { holdResult, takeHeldDefinition, takeHeldFields, takeHeldResult } from '../state/report-builder-state';
import type { ReportDefinitionModel, ReportFieldsModel, ReportResultModel } from '../models/report';

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
    .material-symbols-outlined::before {
      content: attr(data-icon);
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
    .results-page__print-header {
      display: none;
    }
    @media print {
      .results-page__breadcrumb,
      .results-page__header,
      .results-page__error {
        display: none;
      }
      .results-page__print-header {
        display: block;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 2px solid var(--pm-border);
      }
      #printTitle {
        font-size: 18px;
        font-weight: 700;
        color: var(--pm-text);
        margin-bottom: 4px;
      }
      #printRunLine,
      #printFilters {
        font-size: 12px;
        color: var(--pm-text-muted);
      }
      #printFilters {
        margin-top: 4px;
      }
      #printFilters[hidden] {
        display: none;
      }
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <header class="results-page__print-header" id="printHeader">
    <div id="printTitle"></div>
    <div id="printRunLine"></div>
    <div id="printFilters"></div>
  </header>
  <div class="results-page__breadcrumb"><a id="backLink">Reports</a> &rsaquo; New report</div>
  <div class="results-page__header">
    <div>
      <h1 class="results-page__title" id="title"></h1>
      <p class="results-page__subline" id="subline"></p>
    </div>
    <div class="results-page__actions">
      <button type="button" class="results-page__action" id="edit">
        <span class="material-symbols-outlined" aria-hidden="true" data-icon="edit"></span>
        Edit report
      </button>
      <button type="button" class="results-page__action" id="runAgain">
        <span class="material-symbols-outlined" aria-hidden="true" data-icon="refresh"></span>
        Run again
      </button>
      <button type="button" class="results-page__action" id="print">
        <span class="material-symbols-outlined" aria-hidden="true" data-icon="print"></span>
        Print
      </button>
    </div>
  </div>
  <p class="results-page__caption">Filters choose which students appear; each collection lists all of a student's records.</p>
  <div class="results-page__error" id="error" hidden></div>
  <pm-report-results-table id="table"></pm-report-results-table>
`;

export class PmReportResultsPage extends HTMLElement {
  private titleElement: HTMLElement | null = null;
  private subline: HTMLElement | null = null;
  private table: PmReportResultsTable | null = null;
  private errorBanner: HTMLElement | null = null;
  private runAgainButton: HTMLButtonElement | null = null;
  private printButton: HTMLButtonElement | null = null;
  private printTitle: HTMLElement | null = null;
  private printRunLine: HTMLElement | null = null;
  private printFilters: HTMLElement | null = null;

  private _definition: ReportDefinitionModel | null = null;
  private _result: ReportResultModel | null = null;
  private _fields: ReportFieldsModel | null = null;
  private _running = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.titleElement = this.shadowRoot!.getElementById('title') as HTMLElement;
    this.subline = this.shadowRoot!.getElementById('subline') as HTMLElement;
    this.table = this.shadowRoot!.getElementById('table') as unknown as PmReportResultsTable;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;
    this.runAgainButton = this.shadowRoot!.getElementById('runAgain') as HTMLButtonElement;
    this.printButton = this.shadowRoot!.getElementById('print') as HTMLButtonElement;
    this.printTitle = this.shadowRoot!.getElementById('printTitle') as HTMLElement;
    this.printRunLine = this.shadowRoot!.getElementById('printRunLine') as HTMLElement;
    this.printFilters = this.shadowRoot!.getElementById('printFilters') as HTMLElement;

    this.shadowRoot!.getElementById('backLink')!.addEventListener('click', () => {
      window.location.hash = '#/reports';
    });
    this.shadowRoot!.getElementById('edit')!.addEventListener('click', () => {
      window.location.hash = '#/reports/new';
    });
    this.runAgainButton.addEventListener('click', this.handleRunAgain);
    this.printButton.addEventListener('click', () => {
      window.print();
    });

    // The result lives in memory only — a reload with nothing held sends
    // the Teacher back to the Reports list rather than rendering an empty
    // shell.
    this._definition = takeHeldDefinition();
    this._result = takeHeldResult();
    this._fields = takeHeldFields();
    if (!this._definition || !this._result || !this._fields) {
      window.location.hash = '#/reports';
      return;
    }

    this.render();
  }

  private reportTitle(): string {
    return 'New report';
  }

  private render(): void {
    if (
      !this._result ||
      !this._definition ||
      !this._fields ||
      !this.titleElement ||
      !this.subline ||
      !this.table ||
      !this.runAgainButton ||
      !this.printTitle ||
      !this.printRunLine ||
      !this.printFilters
    ) {
      return;
    }

    this.titleElement.textContent = this.reportTitle();

    const count = this._result.studentCount;
    const noun = count === 1 ? 'student' : 'students';
    this.subline.textContent = `${count} ${noun} · Last run ${formatReportDate(this._result.ranAt)}`;

    this.table.columns = this._result.columns;
    this.table.sections = this._result.sections;

    this.runAgainButton.disabled = this._running;

    const header = buildPrintHeader({
      title: this.reportTitle(),
      ranAt: this._result.ranAt,
      studentCount: this._result.studentCount,
      creatorEmail: null,
      filters: this._definition.filters,
      fields: this._fields,
    });
    this.printTitle.textContent = header.title;
    this.printRunLine.textContent = header.runLine;
    this.printFilters.textContent = header.filtersLine ?? '';
    this.printFilters.hidden = header.filtersLine === null;
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
