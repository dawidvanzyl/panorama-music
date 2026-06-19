import '../components/pm-create-user-form';
import '../components/pm-users-table';
import '../components/pm-deactivate-user-modal';
import '../components/pm-delete-user-modal';
import { getUsers, activateUser, clearUsersCache, AdminError } from '../services/admin';
import type { PmUsersTable } from '../components/pm-users-table';
import type { PmDeactivateUserModal } from '../components/pm-deactivate-user-modal';
import type { PmDeleteUserModal } from '../components/pm-delete-user-modal';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: block;
      flex: 1;
      padding: 24px;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .admin-users__container {
      max-width: 960px;
      margin: 0 auto;
    }
    .admin-users__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--pm-text);
      margin-bottom: 24px;
    }
    .admin-users__error {
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
      font-size: 13px;
      display: none;
    }
    .admin-users__error--visible {
      display: block;
    }
  </style>

  <div class="admin-users__container">
    <h1 class="admin-users__title">User Management</h1>
    <pm-create-user-form></pm-create-user-form>
    <div class="admin-users__error" id="error"></div>
    <pm-users-table id="usersTable"></pm-users-table>
  </div>
  <pm-deactivate-user-modal id="deactivateModal"></pm-deactivate-user-modal>
  <pm-delete-user-modal id="deleteModal"></pm-delete-user-modal>
`;

export class PmAdminUsersPage extends HTMLElement {
  private usersTable: PmUsersTable | null = null;
  private deactivateModal: PmDeactivateUserModal | null = null;
  private deleteModal: PmDeleteUserModal | null = null;
  private errorBanner: HTMLElement | null = null;
  private _activatingUserId: string | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.usersTable = this.shadowRoot!.getElementById('usersTable') as unknown as PmUsersTable;
    this.deactivateModal = this.shadowRoot!.getElementById('deactivateModal') as unknown as PmDeactivateUserModal;
    this.deleteModal = this.shadowRoot!.getElementById('deleteModal') as unknown as PmDeleteUserModal;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;

    this.addEventListener('user-created', this.loadUsers);
    this.shadowRoot!.addEventListener('user-activate-requested', this.handleActivateRequested);
    this.shadowRoot!.addEventListener('user-deactivate-requested', this.handleDeactivateRequested);
    this.shadowRoot!.addEventListener('user-deactivated', this.handleUserDeactivated);
    this.shadowRoot!.addEventListener('user-delete-requested', this.handleDeleteRequested);
    this.shadowRoot!.addEventListener('user-deleted', this.handleUserDeleted);
    clearUsersCache();
    void this.loadUsers();
  }

  disconnectedCallback(): void {
    this.removeEventListener('user-created', this.loadUsers);
    this.shadowRoot!.removeEventListener('user-activate-requested', this.handleActivateRequested);
    this.shadowRoot!.removeEventListener('user-deactivate-requested', this.handleDeactivateRequested);
    this.shadowRoot!.removeEventListener('user-deactivated', this.handleUserDeactivated);
    this.shadowRoot!.removeEventListener('user-delete-requested', this.handleDeleteRequested);
    this.shadowRoot!.removeEventListener('user-deleted', this.handleUserDeleted);
  }

  private handleActivateRequested = async (event: Event): Promise<void> => {
    const { userId } = (event as CustomEvent<{ userId: string }>).detail;
    if (this._activatingUserId === userId) return;
    this._activatingUserId = userId;
    this.errorBanner!.classList.remove('admin-users__error--visible');
    try {
      await activateUser(userId);
      void this.loadUsers();
    } catch (err) {
      this.errorBanner!.textContent = err instanceof AdminError ? err.message : 'An unexpected error occurred';
      this.errorBanner!.classList.add('admin-users__error--visible');
    } finally {
      this._activatingUserId = null;
    }
  };

  private handleDeactivateRequested = (event: Event): void => {
    const { userId, email } = (event as CustomEvent<{ userId: string; email: string }>).detail;
    this.deactivateModal!.show(userId, email);
  };

  private handleUserDeactivated = (): void => {
    void this.loadUsers();
  };

  private handleDeleteRequested = (event: Event): void => {
    const { userId, email } = (event as CustomEvent<{ userId: string; email: string }>).detail;
    this.deleteModal!.show(userId, email);
  };

  private handleUserDeleted = (event: Event): void => {
    const { userId } = (event as CustomEvent<{ userId: string }>).detail;
    this.usersTable!.removeUser(userId);
  };

  private loadUsers = async (): Promise<void> => {
    this.errorBanner!.classList.remove('admin-users__error--visible');

    try {
      this.usersTable!.users = await getUsers();
    } catch (err) {
      this.errorBanner!.textContent = err instanceof AdminError ? err.message : 'An unexpected error occurred';
      this.errorBanner!.classList.add('admin-users__error--visible');
    }
  };
}

customElements.define('pm-admin-users-page', PmAdminUsersPage);
