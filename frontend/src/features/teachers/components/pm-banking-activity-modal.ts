import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import { activityLabel, formatActivityTimestamp } from '../services/banking-display';
import type { BankingActivityEntry } from '../services/teachers';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    .activity__intro {
      margin: 0 0 16px;
      font-size: 13px;
      color: var(--pm-text-muted);
    }
    table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }
    th {
      text-align: left;
      padding: 8px 10px;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      white-space: nowrap;
      color: var(--pm-text-muted);
      border-bottom: 1px solid var(--pm-border);
    }
    td {
      padding: 10px;
      font-size: 13px;
      color: var(--pm-text);
      border-bottom: 1px solid var(--pm-border);
    }
    /* The three fixed columns are sized to their longest real value so nothing
       wraps; the account column takes the remainder and is the one that
       truncates, since an email address has no bound. */
    .activity__col-when {
      width: 140px;
    }
    .activity__col-action {
      width: 186px;
    }
    .activity__col-last4 {
      width: 72px;
    }
    /* Same truncation as a teacher row's name: the cell clips and the full
       value stays available as the title. */
    .activity__cell {
      display: block;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .activity__scroll {
      max-height: 320px;
      overflow-y: auto;
    }
    .activity__empty {
      margin: 0;
      font-size: 14px;
      color: var(--pm-text-muted);
    }
    [hidden] {
      display: none !important;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card modal__card--large" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal__header">
        <h2 class="modal__title" id="modalTitle">Banking Activity</h2>
        <button type="button" class="modal__close" id="closeBtn" aria-label="Close">close</button>
      </div>
      <p class="activity__intro">
        Every reveal, write and delete is audited. Entries record that a value changed, never the value itself,
        and carry at most the last four digits.
      </p>
      <div class="activity__scroll" id="tableWrapper">
        <table>
          <colgroup>
            <col class="activity__col-when" />
            <col class="activity__col-action" />
            <col />
            <col class="activity__col-last4" />
          </colgroup>
          <thead>
            <tr>
              <th>When</th>
              <th>Action</th>
              <th>Account</th>
              <th>Last 4</th>
            </tr>
          </thead>
          <tbody id="rows"></tbody>
        </table>
      </div>
      <p class="activity__empty" id="empty" hidden>No banking activity recorded.</p>
    </div>
  </div>
`;

/**
 * The recorded history of one teacher's banking details. Renders only what the
 * audit entries hold — a timestamp, an action, the acting account and at most
 * the last four digits — so there is no path by which a full account number
 * could appear here.
 */
export class PmBankingActivityModal extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.shadowRoot!.getElementById('closeBtn')!.addEventListener('click', this.handleClose);
  }

  disconnectedCallback(): void {
    this.shadowRoot!.getElementById('closeBtn')?.removeEventListener('click', this.handleClose);
  }

  show(entries: BankingActivityEntry[]): void {
    const rows = this.shadowRoot!.getElementById('rows') as HTMLElement;
    rows.innerHTML = '';

    for (const entry of entries) {
      const row = document.createElement('tr');
      row.appendChild(cell(formatActivityTimestamp(entry.occurredAt)));
      row.appendChild(cell(activityLabel(entry.eventType)));
      row.appendChild(cell(entry.actorEmail ?? 'Unknown account'));
      row.appendChild(cell(entry.accountNumberLast4 ?? '—'));
      rows.appendChild(row);
    }

    (this.shadowRoot!.getElementById('empty') as HTMLElement).hidden = entries.length > 0;
    (this.shadowRoot!.getElementById('tableWrapper') as HTMLElement).hidden = entries.length === 0;
    this.setAttribute('open', '');
  }

  close(): void {
    this.removeAttribute('open');
  }

  private handleClose = (): void => this.close();
}

function cell(text: string): HTMLTableCellElement {
  const td = document.createElement('td');
  const span = document.createElement('span');
  span.className = 'activity__cell';
  span.textContent = text;
  // A truncated value is still readable on hover rather than lost.
  span.title = text;
  td.appendChild(span);
  return td;
}

customElements.define('pm-banking-activity-modal', PmBankingActivityModal);
