import type { AuditEventSummary } from '../services/audit';

// Date.toISOString() always forces UTC ("Z") — there's no built-in way to get
// an ISO 8601 string in the viewer's own local timezone, so it's built here
// from local getters plus the local UTC offset.
function toLocalIso8601(isoUtc: string): string {
  const date = new Date(isoUtc);
  const pad = (n: number): string => String(n).padStart(2, '0');

  const offsetMinutes = -date.getTimezoneOffset();
  const offsetSign = offsetMinutes >= 0 ? '+' : '-';
  const offsetHours = pad(Math.floor(Math.abs(offsetMinutes) / 60));
  const offsetMins = pad(Math.abs(offsetMinutes) % 60);

  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}` +
    `${offsetSign}${offsetHours}:${offsetMins}`
  );
}

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .audit-table__card {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      overflow: hidden;
    }
    .audit-table__scroll {
      overflow-x: auto;
    }
    table {
      width: 100%;
      min-width: 1140px;
      border-collapse: collapse;
      table-layout: fixed;
    }
    th, td {
      text-align: left;
      padding: 10px 16px;
      font-size: 13px;
      color: var(--pm-text);
      border-bottom: 1px solid var(--pm-border);
      white-space: nowrap;
    }
    .audit-table__truncate {
      overflow: hidden;
      text-overflow: ellipsis;
    }
    th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pm-text-muted);
      background: var(--pm-surface-2);
    }
    .audit-table__outcome {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
    }
    .audit-table__outcome--success {
      background: rgba(143, 212, 78, 0.1);
      color: #8fd44e;
    }
    .audit-table__outcome--failure {
      background: rgba(224, 82, 82, 0.1);
      color: var(--pm-danger);
    }
    .audit-table__empty {
      padding: 32px 16px;
      text-align: center;
      color: var(--pm-text-muted);
      font-size: 14px;
    }
    .audit-table__footer {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px 16px;
      border-top: 1px solid var(--pm-border);
    }
    .audit-table__footer-label {
      font-size: 12px;
      color: var(--pm-text-muted);
    }
    .audit-table__footer-nav {
      display: flex;
      gap: 8px;
    }
    .audit-table__page-btn {
      padding: 6px 12px;
      border-radius: var(--pm-radius);
      border: 1px solid var(--pm-border);
      background: transparent;
      color: var(--pm-text);
      font-size: 13px;
      cursor: pointer;
    }
    .audit-table__page-btn:hover:not(:disabled) {
      background: var(--pm-surface-2);
    }
    .audit-table__page-btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="audit-table__card">
    <div class="audit-table__scroll">
      <table>
        <colgroup>
          <col style="width: 190px" />
          <col style="width: 180px" />
          <col style="width: 180px" />
          <col style="width: 220px" />
          <col style="width: 90px" />
          <col style="width: 130px" />
          <col style="width: 150px" />
        </colgroup>
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Actor</th>
            <th>Target</th>
            <th>Event Type</th>
            <th>Outcome</th>
            <th>Reason</th>
            <th>Source IP</th>
          </tr>
        </thead>
        <tbody id="rows"></tbody>
      </table>
    </div>
    <p class="audit-table__empty" id="empty" hidden>No audit events match the current filters.</p>
    <div class="audit-table__footer" id="footer" hidden>
      <span class="audit-table__footer-label" id="footerLabel"></span>
      <div class="audit-table__footer-nav">
        <button type="button" class="audit-table__page-btn" id="prevBtn">Previous</button>
        <button type="button" class="audit-table__page-btn" id="nextBtn">Next</button>
      </div>
    </div>
  </div>
`;

export class PmAuditEventTable extends HTMLElement {
  private rowsBody: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private footer: HTMLElement | null = null;
  private footerLabel: HTMLElement | null = null;
  private prevBtn: HTMLButtonElement | null = null;
  private nextBtn: HTMLButtonElement | null = null;

  private _items: AuditEventSummary[] = [];
  private _totalCount = 0;
  private _page = 1;
  private _pageSize = 25;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.rowsBody = this.shadowRoot!.getElementById('rows') as HTMLElement;
    this.emptyMessage = this.shadowRoot!.getElementById('empty') as HTMLElement;
    this.footer = this.shadowRoot!.getElementById('footer') as HTMLElement;
    this.footerLabel = this.shadowRoot!.getElementById('footerLabel') as HTMLElement;
    this.prevBtn = this.shadowRoot!.getElementById('prevBtn') as HTMLButtonElement;
    this.nextBtn = this.shadowRoot!.getElementById('nextBtn') as HTMLButtonElement;

    this.prevBtn.addEventListener('click', this.handlePrev);
    this.nextBtn.addEventListener('click', this.handleNext);
    this.render();
  }

  disconnectedCallback(): void {
    this.prevBtn?.removeEventListener('click', this.handlePrev);
    this.nextBtn?.removeEventListener('click', this.handleNext);
  }

  setPage(items: AuditEventSummary[], totalCount: number, page: number, pageSize: number): void {
    this._items = items;
    this._totalCount = totalCount;
    this._page = page;
    this._pageSize = pageSize;
    this.render();
  }

  private get totalPages(): number {
    return Math.max(1, Math.ceil(this._totalCount / this._pageSize));
  }

  private render(): void {
    if (!this.rowsBody || !this.emptyMessage || !this.footer || !this.footerLabel || !this.prevBtn || !this.nextBtn) return;

    this.rowsBody.innerHTML = '';
    const hasItems = this._items.length > 0;
    this.emptyMessage.hidden = hasItems;
    this.footer.hidden = !hasItems;

    for (const item of this._items) {
      this.rowsBody.appendChild(this.buildRow(item));
    }

    if (hasItems) {
      const start = (this._page - 1) * this._pageSize + 1;
      const end = Math.min(this._page * this._pageSize, this._totalCount);
      this.footerLabel.textContent = `Showing ${start}-${end} of ${this._totalCount}`;
      this.prevBtn.disabled = this._page <= 1;
      this.nextBtn.disabled = this._page >= this.totalPages;
    } else {
      // Cleared, not left stale, so a hidden-but-still-in-DOM footer can
      // never be mistaken for a still-populated result set.
      this.footerLabel.textContent = '';
    }
  }

  private buildRow(item: AuditEventSummary): HTMLTableRowElement {
    const row = document.createElement('tr');

    const timestampCell = document.createElement('td');
    timestampCell.textContent = toLocalIso8601(item.occurredAt);

    const actorCell = document.createElement('td');
    actorCell.classList.add('audit-table__truncate');
    actorCell.textContent = item.actorEmail ?? '—';
    if (item.actorEmail) actorCell.title = item.actorEmail;

    const targetCell = document.createElement('td');
    targetCell.classList.add('audit-table__truncate');
    targetCell.textContent = item.targetDisplay ?? '—';
    if (item.targetDisplay) targetCell.title = item.targetDisplay;

    const eventTypeCell = document.createElement('td');
    eventTypeCell.classList.add('audit-table__truncate');
    eventTypeCell.textContent = item.eventType;
    eventTypeCell.title = item.eventType;

    const outcomeCell = document.createElement('td');
    const outcomeBadge = document.createElement('span');
    outcomeBadge.classList.add(
      'audit-table__outcome',
      item.outcome === 'success' ? 'audit-table__outcome--success' : 'audit-table__outcome--failure',
    );
    outcomeBadge.textContent = item.outcome === 'success' ? 'Success' : 'Failure';
    outcomeCell.appendChild(outcomeBadge);

    const reasonCell = document.createElement('td');
    reasonCell.textContent = item.reason ?? '—';

    const sourceIpCell = document.createElement('td');
    sourceIpCell.textContent = item.sourceIp;

    row.append(timestampCell, actorCell, targetCell, eventTypeCell, outcomeCell, reasonCell, sourceIpCell);
    return row;
  }

  private handlePrev = (): void => {
    if (this._page <= 1) return;
    this.dispatchEvent(new CustomEvent<{ page: number }>('audit-page-changed', {
      bubbles: true,
      composed: true,
      detail: { page: this._page - 1 },
    }));
  };

  private handleNext = (): void => {
    if (this._page >= this.totalPages) return;
    this.dispatchEvent(new CustomEvent<{ page: number }>('audit-page-changed', {
      bubbles: true,
      composed: true,
      detail: { page: this._page + 1 },
    }));
  };
}

customElements.define('pm-audit-event-table', PmAuditEventTable);
