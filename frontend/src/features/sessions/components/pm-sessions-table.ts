import type { SessionResult, AdminSessionResult } from '../services/sessions';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
    }
    .sessions-table__card {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      overflow: hidden;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      text-align: left;
      padding: 12px 16px;
      font-size: 14px;
      color: var(--pm-text);
      border-bottom: 1px solid var(--pm-border);
    }
    th {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pm-text-muted);
    }
    .sessions-table__row--current {
      background: rgba(79, 124, 255, 0.06);
    }
    .sessions-table__badge {
      display: inline-block;
      margin-left: 8px;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      background: rgba(143, 212, 78, 0.1);
      color: #8fd44e;
    }
    .sessions-table__sub {
      display: block;
      color: var(--pm-text-muted);
      font-size: 12px;
      margin-top: 2px;
    }
    .sessions-table__role {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid var(--pm-border);
      color: var(--pm-text-muted);
    }
    .sessions-table__btn {
      border-radius: var(--pm-radius);
      font-size: 12px;
      padding: 6px 12px;
      cursor: pointer;
      background: transparent;
      border: 1px solid var(--pm-danger, #e05252);
      color: var(--pm-danger, #e05252);
    }
    .sessions-table__btn:hover {
      background: rgba(224, 82, 82, 0.1);
    }
    .sessions-table__btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      background: transparent;
    }
    .sessions-table__actions {
      text-align: right;
    }
    .sessions-table__empty {
      padding: 24px 16px;
      color: var(--pm-text-muted);
      font-size: 14px;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="sessions-table__card">
    <table>
      <thead>
        <tr id="headRow">
          <th>Device / Browser</th>
          <th>IP Address</th>
          <th>Created At</th>
          <th>Last Active</th>
          <th class="sessions-table__actions">Actions</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <p class="sessions-table__empty" id="empty" hidden>No active sessions found.</p>
  </div>
`;

export class PmSessionsTable extends HTMLElement {
  private rowsBody: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private headRow: HTMLElement | null = null;
  private _sessions: SessionResult[] = [];
  private _showOwner = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.rowsBody = this.shadowRoot!.getElementById('rows') as HTMLElement;
    this.emptyMessage = this.shadowRoot!.getElementById('empty') as HTMLElement;
    this.headRow = this.shadowRoot!.getElementById('headRow') as HTMLElement;
    this.render();
  }

  set showOwner(value: boolean) {
    this._showOwner = value;
    this.render();
  }

  set sessions(value: SessionResult[]) {
    this._sessions = value;
    this.render();
  }

  get sessions(): SessionResult[] {
    return this._sessions;
  }

  removeSession(tokenId: string): void {
    this._sessions = this._sessions.filter(s => s.tokenId !== tokenId);
    this.render();
  }

  private render(): void {
    if (!this.rowsBody || !this.emptyMessage || !this.headRow) return;

    if (this._showOwner && !this.headRow.querySelector('[data-owner-header]')) {
      const ownerHeader = document.createElement('th');
      ownerHeader.textContent = 'User / Account';
      ownerHeader.setAttribute('data-owner-header', '');
      this.headRow.insertBefore(ownerHeader, this.headRow.firstChild);
    }

    this.rowsBody.innerHTML = '';
    this.emptyMessage.hidden = this._sessions.length > 0;

    for (const session of this._sessions) {
      this.rowsBody.appendChild(this.buildRow(session));
    }
  }

  private buildRow(session: SessionResult): HTMLTableRowElement {
    const row = document.createElement('tr');
    if (session.isCurrent) row.classList.add('sessions-table__row--current');

    if (this._showOwner) {
      const adminSession = session as AdminSessionResult;
      const ownerCell = document.createElement('td');
      const email = document.createElement('span');
      email.textContent = adminSession.userEmail;
      const roles = document.createElement('span');
      roles.classList.add('sessions-table__sub');
      roles.textContent = adminSession.userRoles.join(', ');
      ownerCell.append(email, roles);
      row.appendChild(ownerCell);
    }

    const deviceCell = document.createElement('td');
    deviceCell.textContent = session.deviceLabel ?? 'Unknown device';
    if (session.isCurrent) {
      const badge = document.createElement('span');
      badge.classList.add('sessions-table__badge');
      badge.textContent = 'Current Session';
      deviceCell.appendChild(badge);
    }

    const ipCell = document.createElement('td');
    ipCell.textContent = session.ipAddress ?? 'Unknown';

    const createdCell = document.createElement('td');
    createdCell.textContent = new Date(session.sessionStartedAt).toLocaleString();

    const lastActiveCell = document.createElement('td');
    lastActiveCell.textContent = new Date(session.lastSeenAt).toLocaleString();

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('sessions-table__actions');
    const revokeBtn = document.createElement('button');
    revokeBtn.type = 'button';
    revokeBtn.classList.add('sessions-table__btn');
    revokeBtn.textContent = 'Revoke';
    revokeBtn.disabled = session.isCurrent;
    revokeBtn.addEventListener('click', () => this.handleRevoke(session.tokenId));
    actionsCell.appendChild(revokeBtn);

    row.append(deviceCell, ipCell, createdCell, lastActiveCell, actionsCell);
    return row;
  }

  private handleRevoke(tokenId: string): void {
    this.dispatchEvent(new CustomEvent('session-revoke-requested', {
      bubbles: true,
      composed: true,
      detail: { tokenId },
    }));
  }
}

customElements.define('pm-sessions-table', PmSessionsTable);
