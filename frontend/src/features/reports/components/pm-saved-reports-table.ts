import { formatLastRun } from '../services/report-date-format';
import type { SavedReportSummary } from '../models/report';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
    }
    .saved-reports-table__card {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      color: var(--pm-text);
    }
    thead th {
      text-align: left;
      padding: 10px 16px;
      background: var(--pm-surface-2);
      font-weight: 700;
      border-bottom: 1px solid var(--pm-border);
    }
    tbody td {
      padding: 10px 16px;
      border-bottom: 1px solid var(--pm-border);
    }
    tbody tr:last-child td {
      border-bottom: none;
    }
    .saved-reports-table__muted {
      color: var(--pm-text-muted);
      width: 210px;
    }
    .saved-reports-table__last-run {
      color: var(--pm-text-muted);
      width: 200px;
    }
    .saved-reports-table__actions {
      text-align: right;
    }
    .saved-reports-table__run {
      display: inline-flex;
      align-items: center;
      height: 28px;
      padding: 0 12px;
      background: transparent;
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 12px;
      font-family: inherit;
      cursor: pointer;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="saved-reports-table__card">
    <table data-testid="saved-reports-table">
      <thead>
        <tr>
          <th>Report name</th>
          <th class="saved-reports-table__muted">Created by</th>
          <th class="saved-reports-table__last-run">Last run</th>
          <th></th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
  </div>
`;

export class PmSavedReportsTable extends HTMLElement {
  private rowsBody: HTMLElement | null = null;
  private _reports: SavedReportSummary[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.rowsBody = this.shadowRoot!.getElementById('rows') as HTMLElement;
    this.render();
  }

  set reports(reports: SavedReportSummary[]) {
    this._reports = reports;
    this.render();
  }

  private render(): void {
    if (!this.rowsBody) return;

    this.rowsBody.textContent = '';
    for (const report of this._reports) {
      const row = document.createElement('tr');
      row.dataset.testid = 'saved-report-row';
      row.dataset.reportId = report.id;

      const nameCell = document.createElement('td');
      nameCell.dataset.testid = 'saved-report-name';
      nameCell.textContent = report.name;
      row.appendChild(nameCell);

      const createdByCell = document.createElement('td');
      createdByCell.className = 'saved-reports-table__muted';
      createdByCell.dataset.testid = 'saved-report-created-by';
      createdByCell.textContent = report.createdBy;
      row.appendChild(createdByCell);

      const lastRunCell = document.createElement('td');
      lastRunCell.className = 'saved-reports-table__last-run';
      lastRunCell.dataset.testid = 'saved-report-last-run';
      lastRunCell.textContent = formatLastRun(report.lastRunAt);
      row.appendChild(lastRunCell);

      const actionsCell = document.createElement('td');
      actionsCell.className = 'saved-reports-table__actions';
      const runButton = document.createElement('button');
      runButton.type = 'button';
      runButton.className = 'saved-reports-table__run';
      runButton.textContent = 'Run';
      runButton.addEventListener('click', () => {
        this.dispatchEvent(
          new CustomEvent('saved-report-run-requested', {
            bubbles: true,
            composed: true,
            detail: { id: report.id },
          }),
        );
      });
      actionsCell.appendChild(runButton);
      row.appendChild(actionsCell);

      this.rowsBody.appendChild(row);
    }
  }
}

customElements.define('pm-saved-reports-table', PmSavedReportsTable);
