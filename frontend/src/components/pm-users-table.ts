import { regenerateInvite, updateUserRoles, AdminError, type GetUserResult } from '../services/admin';
import { getUserId } from '../services/token-storage';

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
    .users-table__status--deactivated {
      background: rgba(224, 82, 82, 0.1);
      color: var(--pm-danger, #e05252);
    }
    .users-table__btn {
      border-radius: var(--pm-radius);
      font-size: 12px;
      padding: 6px 12px;
      cursor: pointer;
    }
    .users-table__btn--edit {
      background: transparent;
      border: 1px solid var(--pm-accent);
      color: var(--pm-accent);
    }
    .users-table__btn--edit:hover {
      background: rgba(79, 124, 255, 0.1);
    }
    .users-table__btn--deactivate {
      background: transparent;
      border: 1px solid var(--pm-danger, #e05252);
      color: var(--pm-danger, #e05252);
    }
    .users-table__btn--deactivate:hover {
      background: rgba(224, 82, 82, 0.1);
    }
    .users-table__btn--activate {
      background: transparent;
      border: 1px solid #8fd44e;
      color: #8fd44e;
    }
    .users-table__btn--activate:hover {
      background: rgba(143, 212, 78, 0.1);
    }
    .users-table__btn--delete {
      background: var(--pm-danger, #e05252);
      border: 1px solid var(--pm-danger, #e05252);
      color: #fff;
    }
    .users-table__btn--delete:hover {
      opacity: 0.9;
    }
    .users-table__btn--save {
      background: var(--pm-accent);
      border: 1px solid var(--pm-accent);
      color: #fff;
    }
    .users-table__btn--save:hover {
      filter: brightness(1.1);
    }
    .users-table__btn--cancel {
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      color: var(--pm-text);
    }
    .users-table__btn--cancel:hover {
      background: var(--pm-border);
    }
    .users-table__btn:disabled {
      opacity: 0.65;
      cursor: not-allowed;
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
    .users-table__role-badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 9999px;
      font-size: 11px;
      font-weight: 600;
      border: 1px solid var(--pm-border);
      color: var(--pm-text-muted);
      margin-right: 4px;
    }
    .users-table__role-checkboxes {
      display: flex;
      gap: 12px;
    }
    .users-table__role-option {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 13px;
      color: var(--pm-text);
      cursor: pointer;
    }
    .users-table__actions {
      display: flex;
      gap: 6px;
      justify-content: flex-end;
      align-items: center;
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
          <th style="text-align:right">Actions</th>
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
  private _users: GetUserResult[] = [];
  private _editingUserId: string | null = null;

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

  set users(value: GetUserResult[]) {
    this._users = value;
    this._editingUserId = null;
    this.render();
  }

  get users(): GetUserResult[] {
    return this._users;
  }

  private render(): void {
    if (!this.rowsBody || !this.emptyMessage) return;

    this.rowsBody.innerHTML = '';
    this.emptyMessage.hidden = this._users.length > 0;

    for (const user of this._users) {
      const isEditing = this._editingUserId === user.userId;
      const row = this.buildRow(user, isEditing);
      this.rowsBody.appendChild(row);
    }
  }

  private buildRow(user: GetUserResult, isEditing: boolean): HTMLTableRowElement {
    const row = document.createElement('tr');

    const emailCell = document.createElement('td');
    emailCell.textContent = user.email;

    const rolesCell = document.createElement('td');
    if (isEditing) {
      rolesCell.appendChild(this.buildRoleCheckboxes(user.roles));
    } else {
      rolesCell.appendChild(this.buildRoleBadges(user.roles));
    }

    const statusCell = document.createElement('td');
    const statusBadge = document.createElement('span');
    const statusClass = user.isActive
      ? 'users-table__status--active'
      : user.hasCompletedRegistration
        ? 'users-table__status--deactivated'
        : 'users-table__status--pending';
    const statusText = user.isActive ? 'Active' : user.hasCompletedRegistration ? 'Deactivated' : 'Pending';
    statusBadge.classList.add('users-table__status', statusClass);
    statusBadge.textContent = statusText;
    statusCell.appendChild(statusBadge);

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('users-table__actions');

    if (isEditing) {
      const saveBtn = document.createElement('button');
      saveBtn.type = 'button';
      saveBtn.classList.add('users-table__btn', 'users-table__btn--save');
      saveBtn.textContent = 'Save';
      saveBtn.addEventListener('click', () => this.handleSave(user.userId, rolesCell, saveBtn, cancelBtn));

      const cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.classList.add('users-table__btn', 'users-table__btn--cancel');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.addEventListener('click', () => this.handleCancel());

      actionsCell.append(saveBtn, cancelBtn);
    } else if (user.isActive && !user.isProtected && user.userId !== getUserId()) {
      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.classList.add('users-table__btn', 'users-table__btn--edit');
      editBtn.textContent = 'Edit';
      editBtn.addEventListener('click', () => this.handleEdit(user.userId));
      actionsCell.appendChild(editBtn);

      const deactivateBtn = document.createElement('button');
      deactivateBtn.type = 'button';
      deactivateBtn.classList.add('users-table__btn', 'users-table__btn--deactivate');
      deactivateBtn.textContent = 'Deactivate';
      deactivateBtn.addEventListener('click', () => this.handleDeactivate(user.userId, user.email));
      actionsCell.appendChild(deactivateBtn);
    } else if (user.isActive) {
      const placeholder = document.createElement('button');
      placeholder.type = 'button';
      placeholder.classList.add('users-table__btn', 'users-table__btn--edit');
      placeholder.textContent = 'Edit';
      placeholder.style.visibility = 'hidden';
      actionsCell.appendChild(placeholder);

      const deactivatePlaceholder = document.createElement('button');
      deactivatePlaceholder.type = 'button';
      deactivatePlaceholder.classList.add('users-table__btn', 'users-table__btn--deactivate');
      deactivatePlaceholder.textContent = 'Deactivate';
      deactivatePlaceholder.style.visibility = 'hidden';
      actionsCell.appendChild(deactivatePlaceholder);
    } else if (!user.isActive && !user.hasCompletedRegistration) {
      const regenerateBtn = document.createElement('button');
      regenerateBtn.type = 'button';
      regenerateBtn.classList.add('users-table__regenerate');
      regenerateBtn.textContent = 'Regenerate Invite';
      regenerateBtn.addEventListener('click', () => this.handleRegenerate(user.userId, actionsCell, regenerateBtn));
      actionsCell.appendChild(regenerateBtn);
    } else {
      const activateBtn = document.createElement('button');
      activateBtn.type = 'button';
      activateBtn.classList.add('users-table__btn', 'users-table__btn--activate');
      activateBtn.textContent = 'Activate';
      activateBtn.addEventListener('click', () => this.handleActivate(user.userId));
      actionsCell.appendChild(activateBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.classList.add('users-table__btn', 'users-table__btn--delete');
      deleteBtn.textContent = 'Delete';
      deleteBtn.addEventListener('click', () => this.handleDelete(user.userId, user.email));
      actionsCell.appendChild(deleteBtn);
    }

    row.append(emailCell, rolesCell, statusCell, actionsCell);
    return row;
  }

  private buildRoleBadges(roles: string[]): HTMLElement {
    const wrap = document.createElement('span');
    for (const role of roles) {
      const badge = document.createElement('span');
      badge.classList.add('users-table__role-badge');
      badge.textContent = role;
      wrap.appendChild(badge);
    }
    return wrap;
  }

  private buildRoleCheckboxes(currentRoles: string[]): HTMLElement {
    const wrap = document.createElement('div');
    wrap.classList.add('users-table__role-checkboxes');

    for (const role of ['Teacher', 'Admin']) {
      const label = document.createElement('label');
      label.classList.add('users-table__role-option');

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = role;
      checkbox.checked = currentRoles.includes(role);

      label.append(checkbox, document.createTextNode(role));
      wrap.appendChild(label);
    }

    return wrap;
  }

  private getCheckedRoles(rolesCell: HTMLElement): string[] {
    return Array.from(rolesCell.querySelectorAll<HTMLInputElement>('input[type="checkbox"]:checked'))
      .map(cb => cb.value);
  }

  removeUser(userId: string): void {
    this._users = this._users.filter(u => u.userId !== userId);
    this.render();
  }

  private handleEdit(userId: string): void {
    this._editingUserId = userId;
    this.render();
  }

  private handleDeactivate(userId: string, email: string): void {
    this.dispatchEvent(new CustomEvent('user-deactivate-requested', {
      bubbles: true,
      composed: true,
      detail: { userId, email },
    }));
  }

  private handleActivate(userId: string): void {
    this.dispatchEvent(new CustomEvent('user-activate-requested', {
      bubbles: true,
      composed: true,
      detail: { userId },
    }));
  }

  private handleDelete(userId: string, email: string): void {
    this.dispatchEvent(new CustomEvent('user-delete-requested', {
      bubbles: true,
      composed: true,
      detail: { userId, email },
    }));
  }

  private handleCancel(): void {
    this._editingUserId = null;
    this.render();
  }

  private handleSave = async (
    userId: string,
    rolesCell: HTMLElement,
    saveBtn: HTMLButtonElement,
    cancelBtn: HTMLButtonElement,
  ): Promise<void> => {
    const roles = this.getCheckedRoles(rolesCell);
    rolesCell.querySelector('.users-table__error')?.remove();

    if (roles.length === 0) {
      const error = document.createElement('span');
      error.classList.add('users-table__error');
      error.textContent = 'At least one role must be selected.';
      rolesCell.appendChild(error);
      return;
    }

    saveBtn.disabled = true;
    cancelBtn.disabled = true;

    try {
      const updated = await updateUserRoles(userId, roles);
      const userIndex = this._users.findIndex(u => u.userId === userId);
      if (userIndex !== -1) {
        this._users[userIndex] = { ...this._users[userIndex], roles: updated.roles };
      }
      this._editingUserId = null;
      this.render();
    } catch (err) {
      const error = document.createElement('span');
      error.classList.add('users-table__error');
      error.textContent = err instanceof AdminError ? err.message : 'An unexpected error occurred';
      rolesCell.appendChild(error);
      saveBtn.disabled = false;
      cancelBtn.disabled = false;
    }
  };

  private handleRegenerate = async (userId: string, actionsCell: HTMLElement, button: HTMLButtonElement): Promise<void> => {
    button.disabled = true;
    actionsCell.querySelector('.users-table__invite-url')?.remove();
    actionsCell.querySelector('.users-table__error')?.remove();

    try {
      const result = await regenerateInvite(userId);
      const inviteUrl = document.createElement('span');
      inviteUrl.classList.add('users-table__invite-url');
      inviteUrl.textContent = result.inviteUrl;
      actionsCell.appendChild(inviteUrl);
    } catch (err) {
      const error = document.createElement('span');
      error.classList.add('users-table__error');
      error.textContent = err instanceof AdminError ? err.message : 'An unexpected error occurred';
      actionsCell.appendChild(error);
    } finally {
      button.disabled = false;
    }
  };
}

customElements.define('pm-users-table', PmUsersTable);
