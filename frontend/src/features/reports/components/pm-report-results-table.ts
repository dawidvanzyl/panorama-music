import type { ReportResultColumn, ReportResultSection } from '../models/report';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
    }
    .results-table__card {
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
      padding: 8px 16px;
    }
    tbody.results-table__section + tbody.results-table__section {
      border-top: 2px solid var(--pm-border);
    }
    .results-table__empty {
      padding: 24px 16px;
      color: var(--pm-text-muted);
      font-size: 13px;
      text-align: center;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="results-table__card">
    <div class="results-table__empty" id="empty" hidden>No students match the current filters.</div>
    <table id="table" hidden>
      <thead><tr id="headerRow"></tr></thead>
    </table>
  </div>
`;

export class PmReportResultsTable extends HTMLElement {
  private emptyMessage: HTMLElement | null = null;
  private table: HTMLTableElement | null = null;
  private headerRow: HTMLElement | null = null;

  private _columns: ReportResultColumn[] = [];
  private _sections: ReportResultSection[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.emptyMessage = this.shadowRoot!.getElementById('empty') as HTMLElement;
    this.table = this.shadowRoot!.getElementById('table') as HTMLTableElement;
    this.headerRow = this.shadowRoot!.getElementById('headerRow') as HTMLElement;
    this.render();
  }

  set columns(columns: ReportResultColumn[]) {
    this._columns = columns;
    this.render();
  }

  set sections(sections: ReportResultSection[]) {
    this._sections = sections;
    this.render();
  }

  private render(): void {
    if (!this.emptyMessage || !this.table || !this.headerRow) return;

    const hasResults = this._sections.length > 0;
    this.emptyMessage.hidden = hasResults;
    this.table.hidden = !hasResults;
    if (!hasResults) return;

    this.headerRow.textContent = '';
    for (const column of this._columns) {
      const th = document.createElement('th');
      th.textContent = column.header;
      this.headerRow.appendChild(th);
    }

    // Every existing <tbody> section is removed and rebuilt; the <thead> is
    // left in place.
    for (const tbody of [...this.table.querySelectorAll('tbody')]) tbody.remove();

    for (const section of this._sections) {
      const tbody = document.createElement('tbody');
      tbody.className = 'results-table__section';
      for (const cells of section.rows) {
        const tr = document.createElement('tr');
        for (const cell of cells) {
          const td = document.createElement('td');
          td.textContent = cell;
          tr.appendChild(td);
        }
        tbody.appendChild(tr);
      }
      this.table.appendChild(tbody);
    }
  }
}

customElements.define('pm-report-results-table', PmReportResultsTable);
