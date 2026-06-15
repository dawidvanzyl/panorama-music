import '../components/pm-create-user-form';
import '../components/pm-users-table';
import { getUsers, AdminError } from '../services/admin';
import type { PmUsersTable } from '../components/pm-users-table';

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
`;

export class PmAdminUsersPage extends HTMLElement {
  private usersTable: PmUsersTable | null = null;
  private errorBanner: HTMLElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.usersTable = this.shadowRoot!.getElementById('usersTable') as unknown as PmUsersTable;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;

    this.addEventListener('user-created', this.loadUsers);
    void this.loadUsers();
  }

  disconnectedCallback(): void {
    this.removeEventListener('user-created', this.loadUsers);
  }

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
