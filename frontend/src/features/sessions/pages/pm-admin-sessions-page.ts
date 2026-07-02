import '../components/pm-sessions-table';
import { getAllSessions, revokeSession, revokeAllSessions, SessionError, type AdminSessionResult } from '../services/sessions';
import type { PmSessionsTable } from '../components/pm-sessions-table';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      flex: 1;
      padding: 24px;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .admin-sessions-page__container {
      max-width: 1200px;
      margin: 0 auto;
    }
    .admin-sessions-page__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .admin-sessions-page__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--pm-text);
      margin-bottom: 4px;
    }
    .admin-sessions-page__subtitle {
      color: var(--pm-text-muted);
      font-size: 14px;
      max-width: 40em;
    }
    .admin-sessions-page__revoke-all {
      background: transparent;
      border: 1px solid var(--pm-danger, #e05252);
      color: var(--pm-danger, #e05252);
      border-radius: var(--pm-radius);
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .admin-sessions-page__revoke-all:hover {
      background: rgba(224, 82, 82, 0.1);
    }
    .admin-sessions-page__revoke-all:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .admin-sessions-page__error {
      margin-bottom: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
      font-size: 13px;
      display: none;
    }
    .admin-sessions-page__error--visible {
      display: block;
    }
    .admin-sessions-page__filter {
      margin-bottom: 16px;
    }
    .admin-sessions-page__filter-input {
      width: 100%;
      max-width: 320px;
      padding: 8px 12px;
      border-radius: var(--pm-radius);
      border: 1px solid var(--pm-border);
      background: var(--pm-surface);
      color: var(--pm-text);
      font-size: 14px;
      font-family: inherit;
    }
    .admin-sessions-page__filter-input::placeholder {
      color: var(--pm-text-muted);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="admin-sessions-page__container">
    <div class="admin-sessions-page__header">
      <div>
        <h1 class="admin-sessions-page__title">Global Session Management</h1>
        <p class="admin-sessions-page__subtitle">Oversee and manage all active user sessions across the entire system.</p>
      </div>
      <button type="button" class="admin-sessions-page__revoke-all" id="revokeAllBtn">Revoke All (Global)</button>
    </div>
    <div class="admin-sessions-page__error" id="error"></div>
    <div class="admin-sessions-page__filter">
      <input
        type="search"
        class="admin-sessions-page__filter-input"
        id="filterInput"
        placeholder="Filter by user email…"
        aria-label="Filter sessions by user email"
      />
    </div>
    <pm-sessions-table id="sessionsTable"></pm-sessions-table>
  </div>
`;

export class PmAdminSessionsPage extends HTMLElement {
  private sessionsTable: PmSessionsTable | null = null;
  private errorBanner: HTMLElement | null = null;
  private revokeAllBtn: HTMLButtonElement | null = null;
  private filterInput: HTMLInputElement | null = null;
  private allSessions: AdminSessionResult[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.sessionsTable = this.shadowRoot!.getElementById('sessionsTable') as unknown as PmSessionsTable;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;
    this.revokeAllBtn = this.shadowRoot!.getElementById('revokeAllBtn') as HTMLButtonElement;
    this.filterInput = this.shadowRoot!.getElementById('filterInput') as HTMLInputElement;
    this.sessionsTable.showOwner = true;

    this.revokeAllBtn.addEventListener('click', this.handleRevokeAll);
    this.filterInput.addEventListener('input', this.applyFilter);
    this.shadowRoot!.addEventListener('session-revoke-requested', this.handleRevoke);

    void this.loadSessions();
  }

  disconnectedCallback(): void {
    this.revokeAllBtn?.removeEventListener('click', this.handleRevokeAll);
    this.filterInput?.removeEventListener('input', this.applyFilter);
    this.shadowRoot!.removeEventListener('session-revoke-requested', this.handleRevoke);
  }

  private loadSessions = async (): Promise<void> => {
    this.clearError();
    try {
      this.allSessions = await getAllSessions();
      this.applyFilter();
    } catch (err) {
      this.showError(err);
    }
  };

  private applyFilter = (): void => {
    const query = this.filterInput!.value.trim().toLowerCase();
    this.sessionsTable!.sessions = query
      ? this.allSessions.filter(s => s.userEmail.toLowerCase().includes(query))
      : this.allSessions;
  };

  private handleRevoke = async (event: Event): Promise<void> => {
    const { tokenId } = (event as CustomEvent<{ tokenId: string }>).detail;
    this.clearError();
    try {
      await revokeSession(tokenId);
      this.allSessions = this.allSessions.filter(s => s.tokenId !== tokenId);
      this.applyFilter();
    } catch (err) {
      this.showError(err);
    }
  };

  private handleRevokeAll = async (): Promise<void> => {
    if (!window.confirm('This will immediately terminate every other active session across the entire system. Are you absolutely sure?')) {
      return;
    }

    this.clearError();
    this.revokeAllBtn!.disabled = true;
    try {
      await revokeAllSessions();
      await this.loadSessions();
    } catch (err) {
      this.showError(err);
    } finally {
      this.revokeAllBtn!.disabled = false;
    }
  };

  private showError(err: unknown): void {
    this.errorBanner!.textContent = err instanceof SessionError ? err.message : 'An unexpected error occurred';
    this.errorBanner!.classList.add('admin-sessions-page__error--visible');
  }

  private clearError(): void {
    this.errorBanner!.classList.remove('admin-sessions-page__error--visible');
  }
}

customElements.define('pm-admin-sessions-page', PmAdminSessionsPage);
