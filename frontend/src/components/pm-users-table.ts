import { regenerateInvite, AdminError, type AdminUserSummary } from '../services/admin';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      font-family: 'Inter', system-ui, sans-serif;
    }
    .users-table__card {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 24px;
      margin-top: 24px;
    }
    .users-table__title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--pm-text);
      margin-bottom: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      text-align: left;
      padding: 10px 12px;
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
    .users-table__status {
      display: inline-block;
      padding: 2px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .users-table__status--active {
      background: rgba(143, 212, 78, 0.1);
      color: #8fd44e;
    }
    .users-table__status--pending {
      background: rgba(79, 124, 255, 0.1);
      color: var(--pm-accent);
    }
    .users-table__regenerate {
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      background: var(--pm-surface-2);
      color: var(--pm-text);
      font-size: 12px;
      padding: 6px 12px;
      cursor: pointer;
    }
    .users-table__regenerate:hover {
      background: var(--pm-border);
    }
    .users-table__regenerate:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .users-table__invite-url {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      word-break: break-all;
      color: var(--pm-text-muted);
    }
    .users-table__error {
      display: block;
      margin-top: 6px;
      font-size: 12px;
      color: var(--pm-danger);
    }
    .users-table__empty {
      color: var(--pm-text-muted);
      font-size: 14px;
    }
  </style>

  <div class="users-table__card">
    <h2 class="users-table__title">Users</h2>
    <table>
      <thead>
        <tr>
          <th>Email</th>
          <th>Roles</th>
          <th>Status</th>
          <th>Invite</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <p class="users-table__empty" id="empty" hidden>No users found.</p>
  </div>
`;

export class PmUsersTable extends HTMLElement {
  private rowsBody: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private _users: AdminUserSummary[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.rowsBody = this.shadowRoot!.getElementById('rows') as HTMLElement;
    this.emptyMessage = this.shadowRoot!.getElementById('empty') as HTMLElement;
    this.render();
  }

  set users(value: AdminUserSummary[]) {
    this._users = value;
    this.render();
  }

  get users(): AdminUserSummary[] {
    return this._users;
  }

  private render(): void {
    if (!this.rowsBody || !this.emptyMessage) return;

    this.rowsBody.innerHTML = '';
    this.emptyMessage.hidden = this._users.length > 0;

    for (const user of this._users) {
      const row = document.createElement('tr');

      const emailCell = document.createElement('td');
      emailCell.textContent = user.email;

      const rolesCell = document.createElement('td');
      rolesCell.textContent = user.roles.join(', ');

      const statusCell = document.createElement('td');
      const statusBadge = document.createElement('span');
      statusBadge.classList.add('users-table__status', user.isActive ? 'users-table__status--active' : 'users-table__status--pending');
      statusBadge.textContent = user.isActive ? 'Active' : 'Pending';
      statusCell.appendChild(statusBadge);

      const inviteCell = document.createElement('td');
      const regenerateBtn = document.createElement('button');
      regenerateBtn.type = 'button';
      regenerateBtn.classList.add('users-table__regenerate');
      regenerateBtn.textContent = 'Regenerate Invite';
      regenerateBtn.addEventListener('click', () => this.handleRegenerate(user.userId, inviteCell, regenerateBtn));
      inviteCell.appendChild(regenerateBtn);

      row.append(emailCell, rolesCell, statusCell, inviteCell);
      this.rowsBody.appendChild(row);
    }
  }

  private handleRegenerate = async (userId: string, inviteCell: HTMLElement, button: HTMLButtonElement): Promise<void> => {
    button.disabled = true;
    inviteCell.querySelector('.users-table__invite-url')?.remove();
    inviteCell.querySelector('.users-table__error')?.remove();

    try {
      const result = await regenerateInvite(userId);
      const inviteUrl = document.createElement('span');
      inviteUrl.classList.add('users-table__invite-url');
      inviteUrl.textContent = result.inviteUrl;
      inviteCell.appendChild(inviteUrl);
    } catch (err) {
      const error = document.createElement('span');
      error.classList.add('users-table__error');
      error.textContent = err instanceof AdminError ? err.message : 'An unexpected error occurred';
      inviteCell.appendChild(error);
    } finally {
      button.disabled = false;
    }
  };
}

customElements.define('pm-users-table', PmUsersTable);
