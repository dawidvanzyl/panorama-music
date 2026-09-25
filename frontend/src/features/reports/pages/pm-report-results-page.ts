import '../components/pm-report-results-table';
import '../components/pm-save-report-modal';
import type { PmReportResultsTable } from '../components/pm-report-results-table';
import type { PmSaveReportModal } from '../components/pm-save-report-modal';
import {
  getFields,
  getSavedReport,
  runReport,
  runSavedReport,
  saveReport,
  updateReport,
  ReportsError,
} from '../services/reports';
import { formatReportDate } from '../services/report-date-format';
import { buildPrintHeader } from '../state/report-print-header';
import {
  holdDefinition,
  holdEditingReport,
  holdResult,
  holdSavedReport,
  resultActions,
  takeEditingReport,
  takeHeldDefinition,
  takeHeldFields,
  takeHeldResult,
  type ResultAction,
} from '../state/report-builder-state';
import type { ReportDefinitionModel, ReportFieldsModel, ReportResultModel, SavedReportIdentity } from '../models/report';

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

const _actionDefinitions: Record<ResultAction, { id: string; icon: string; label: string }> = {
  edit: { id: 'edit', icon: 'edit', label: 'Edit report' },
  runAgain: { id: 'runAgain', icon: 'refresh', label: 'Run again' },
  saveReport: { id: 'saveReport', icon: 'save', label: 'Save report' },
  print: { id: 'print', icon: 'print', label: 'Print' },
};

const template = document.createElement('template');
template.innerHTML = `
  <header class="results-page__print-header" id="printHeader">
    <div id="printTitle"></div>
    <div id="printRunLine"></div>
    <div id="printFilters"></div>
  </header>
  <div class="results-page__breadcrumb">
    <a id="backLink">Reports</a> &rsaquo; <span data-testid="results-breadcrumb-name">New report</span>
  </div>
  <div class="results-page__header">
    <div>
      <h1 class="results-page__title" id="title"></h1>
      <p class="results-page__subline" id="subline"></p>
    </div>
    <div class="results-page__actions" id="actions"></div>
  </div>
  <p class="results-page__caption">Filters choose which students appear; each collection lists all of a student's records.</p>
  <div class="results-page__error" id="error" hidden></div>
  <pm-report-results-table id="table"></pm-report-results-table>
  <pm-save-report-modal id="saveModal"></pm-save-report-modal>
`;

export class PmReportResultsPage extends HTMLElement {
  private titleElement: HTMLElement | null = null;
  private breadcrumbName: HTMLElement | null = null;
  private subline: HTMLElement | null = null;
  private table: PmReportResultsTable | null = null;
  private errorBanner: HTMLElement | null = null;
  private actionsContainer: HTMLElement | null = null;
  private printTitle: HTMLElement | null = null;
  private printRunLine: HTMLElement | null = null;
  private printFilters: HTMLElement | null = null;
  private saveModal: PmSaveReportModal | null = null;

  private _reportId: string | null = null;
  private _definition: ReportDefinitionModel | null = null;
  private _result: ReportResultModel | null = null;
  private _fields: ReportFieldsModel | null = null;
  private _running = false;
  private _editing: SavedReportIdentity | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.titleElement = this.shadowRoot!.getElementById('title') as HTMLElement;
    this.breadcrumbName = this.shadowRoot!.querySelector('[data-testid="results-breadcrumb-name"]') as HTMLElement;
    this.subline = this.shadowRoot!.getElementById('subline') as HTMLElement;
    this.table = this.shadowRoot!.getElementById('table') as unknown as PmReportResultsTable;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;
    this.actionsContainer = this.shadowRoot!.getElementById('actions') as HTMLElement;
    this.printTitle = this.shadowRoot!.getElementById('printTitle') as HTMLElement;
    this.printRunLine = this.shadowRoot!.getElementById('printRunLine') as HTMLElement;
    this.printFilters = this.shadowRoot!.getElementById('printFilters') as HTMLElement;
    this.saveModal = this.shadowRoot!.getElementById('saveModal') as unknown as PmSaveReportModal;

    this.shadowRoot!.getElementById('backLink')!.addEventListener('click', () => {
      window.location.hash = '#/reports';
    });
    this.shadowRoot!.addEventListener('save-report-confirmed', this.handleSaveConfirmed as EventListener);

    this._reportId = this.getAttribute('report-id');

    if (this._reportId) {
      void this.loadSaved(this._reportId);
      return;
    }

    // The result lives in memory only — a reload with nothing held sends
    // the Teacher back to the Reports list rather than rendering an empty
    // shell.
    this._definition = takeHeldDefinition();
    this._result = takeHeldResult();
    this._fields = takeHeldFields();
    this._editing = takeEditingReport();
    if (!this._definition || !this._result || !this._fields) {
      window.location.hash = '#/reports';
      return;
    }

    this.render();
  }

  /**
   * Loads the field list and the saved definition before running, so a
   * failed field load records no run. Raw field keys never reach the
   * screen or the print — buildPrintHeader resolves them from this loaded
   * field list, the same as the builder path.
   */
  private async loadSaved(reportId: string): Promise<void> {
    try {
      const [fields, detail] = await Promise.all([getFields(), getSavedReport(reportId)]);
      this._fields = fields;
      this._definition = detail.definition;

      const result = await runSavedReport(reportId);
      this._result = result;
      holdResult(result);
      holdSavedReport(result.savedReport ? { identity: result.savedReport, definition: this._definition } : null);
      this.errorBanner!.hidden = true;
      this.render();
    } catch (error: unknown) {
      const message =
        error instanceof ReportsError && error.status >= 400 && error.status < 500
          ? error.message
          : 'Could not load the saved report. Try again.';
      this.errorBanner!.textContent = message;
      this.errorBanner!.hidden = false;
      this.table!.hidden = true;
      this.actionsContainer!.textContent = '';
    }
  }

  private reportTitle(): string {
    return this._result?.savedReport?.name ?? this._editing?.name ?? 'New report';
  }

  /**
   * The owned report these results are about, if any: the saved report
   * itself when the viewer created it, or the edit builder's unsaved run
   * carrying an owned editing context. Null for a plain unsaved run or a
   * saved report the viewer did not create — Edit report and Save report
   * fall back to their create-new behaviour in that case.
   */
  private ownedTarget(): SavedReportIdentity | null {
    const saved = this._result?.savedReport ?? null;
    return saved?.isOwner ? saved : this._editing;
  }

  /**
   * The id to run against: the held result's saved identity once the report
   * has been saved (from the route, or from Save report on these results),
   * falling back to the route attribute before any result has loaded.
   */
  private savedReportId(): string | null {
    return this._result?.savedReport?.id ?? this._reportId;
  }

  private render(): void {
    if (
      !this._result ||
      !this._definition ||
      !this._fields ||
      !this.titleElement ||
      !this.breadcrumbName ||
      !this.subline ||
      !this.table ||
      !this.actionsContainer ||
      !this.printTitle ||
      !this.printRunLine ||
      !this.printFilters
    ) {
      return;
    }

    const title = this.reportTitle();
    this.titleElement.textContent = title;
    this.breadcrumbName.textContent = title;

    const count = this._result.studentCount;
    const noun = count === 1 ? 'student' : 'students';
    const createdBy = this._result.savedReport?.createdBy ?? null;
    this.subline.textContent =
      `${count} ${noun} · Last run ${formatReportDate(this._result.ranAt)}` +
      (createdBy ? ` · Created by ${createdBy}` : '');

    this.table.columns = this._result.columns;
    this.table.sections = this._result.sections;

    this.renderActions();

    const header = buildPrintHeader({
      title,
      ranAt: this._result.ranAt,
      studentCount: this._result.studentCount,
      creatorEmail: createdBy,
      filters: this._definition.filters,
      fields: this._fields,
    });
    this.printTitle.textContent = header.title;
    this.printRunLine.textContent = header.runLine;
    this.printFilters.textContent = header.filtersLine ?? '';
    this.printFilters.hidden = header.filtersLine === null;
  }

  /** Rebuilds the actions container from `resultActions` on every render — an action not offered is not in the DOM. */
  private renderActions(): void {
    if (!this.actionsContainer || !this._result) return;

    this.actionsContainer.textContent = '';
    for (const action of resultActions(this._result.savedReport)) {
      const definition = _actionDefinitions[action];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'results-page__action';
      button.id = definition.id;
      button.innerHTML = `<span class="material-symbols-outlined" aria-hidden="true" data-icon="${definition.icon}"></span>`;
      button.appendChild(document.createTextNode(definition.label));
      button.disabled = this._running;
      button.addEventListener('click', this.actionHandler(action));
      this.actionsContainer.appendChild(button);
    }
  }

  private actionHandler(action: ResultAction): () => void {
    switch (action) {
      case 'edit':
        return this.handleEditReport;
      case 'runAgain':
        return this.handleRunAgain;
      case 'saveReport':
        return this.handleOpenSaveModal;
      case 'print':
        return () => window.print();
    }
  }

  private handleEditReport = (): void => {
    const target = this.ownedTarget();
    if (!target || !this._definition) {
      window.location.hash = '#/reports/new';
      return;
    }

    holdDefinition(this._definition);
    holdEditingReport(target);
    window.location.hash = `#/reports/${target.id}/edit`;
  };

  private handleRunAgain = (): void => {
    if (this._running || !this._definition) return;
    this._running = true;
    this.render();

    const savedReportId = this.savedReportId();
    const run = savedReportId ? runSavedReport(savedReportId) : runReport(this._definition);

    run
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

  private handleOpenSaveModal = (): void => {
    this.saveModal?.show(this.ownedTarget()?.name ?? '');
  };

  private handleSaveConfirmed = (event: CustomEvent<{ name: string }>): void => {
    if (!this._definition || !this._result) return;
    this.saveModal?.setBusy(true);

    const target = this.ownedTarget();
    const save = target
      ? updateReport(target.id, event.detail.name, this._definition)
      : saveReport(event.detail.name, this._definition);

    save
      .then((identity) => {
        this._result = { ...this._result!, savedReport: identity };
        holdResult(this._result);
        holdSavedReport({ identity, definition: this._definition! });
        this._editing = null;
        this.saveModal?.setBusy(false);
        this.saveModal?.close();
        this.render();
      })
      .catch((error: unknown) => {
        this.saveModal?.setBusy(false);
        const message =
          error instanceof ReportsError && error.status >= 400 && error.status < 500
            ? error.message
            : 'Could not save the report. Try again.';
        this.saveModal?.showError(message);
      });
  };
}

customElements.define('pm-report-results-page', PmReportResultsPage);
