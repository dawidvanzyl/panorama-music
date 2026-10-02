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
    .results-table__sibling-badge {
      display: inline-block;
      margin-left: 5px;
      padding: 1px 6px;
      border-radius: 999px;
      background: rgba(79, 124, 255, 0.14);
      color: var(--pm-accent);
      font-size: 10px;
      font-weight: 600;
      line-height: 1.4;
      white-space: nowrap;
      vertical-align: middle;
      letter-spacing: 0.02em;
    }
    @media print {
      .results-table__card {
        overflow: visible;
        border: none;
        border-radius: 0;
      }
      table {
        width: 100%;
        font-size: 11px;
      }
      thead {
        display: table-header-group;
      }
      thead th {
        border-bottom: 2px solid var(--pm-border);
        padding: 6px 8px;
      }
      tbody td {
        padding: 4px 8px;
        border-bottom: 1px solid var(--pm-border);
      }
      th,
      td {
        white-space: normal;
        overflow-wrap: anywhere;
        vertical-align: top;
      }
      tbody.results-table__section {
        break-inside: avoid;
      }
      .results-table__sibling-badge {
        border: 1px solid var(--pm-accent);
      }
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

    const studentColumnIndex = this._columns.findIndex((column) => column.key === 'student.name');

    // Every existing <tbody> section is removed and rebuilt; the <thead> is
    // left in place.
    for (const tbody of [...this.table.querySelectorAll('tbody')]) tbody.remove();

    for (const section of this._sections) {
      const tbody = document.createElement('tbody');
      tbody.className = 'results-table__section';
      section.rows.forEach((cells, rowIndex) => {
        const tr = document.createElement('tr');
        cells.forEach((cell, cellIndex) => {
          const td = document.createElement('td');
          td.textContent = cell;
          if (rowIndex === 0 && cellIndex === studentColumnIndex && section.siblingBadge) {
            const badge = document.createElement('span');
            badge.className = 'results-table__sibling-badge';
            badge.dataset.testid = 'sibling-badge';
            badge.textContent = section.siblingBadge;
            td.appendChild(badge);
          }
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      this.table.appendChild(tbody);
    }
  }
}

customElements.define('pm-report-results-table', PmReportResultsTable);
