import '../components/pm-sessions-table';
import { getOwnSessions, revokeOwnSession, revokeOwnOtherSessions, SessionError } from '../services/sessions';
import type { PmSessionsTable } from '../components/pm-sessions-table';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      flex: 1;
      padding: 24px;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .sessions-page__container {
      max-width: 1000px;
      margin: 0 auto;
    }
    .sessions-page__header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      gap: 16px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    .sessions-page__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--pm-text);
      margin-bottom: 4px;
    }
    .sessions-page__subtitle {
      color: var(--pm-text-muted);
      font-size: 14px;
      max-width: 40em;
    }
    .sessions-page__revoke-all {
      background: var(--pm-accent);
      border: 1px solid var(--pm-accent);
      color: #fff;
      border-radius: var(--pm-radius);
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
    }
    .sessions-page__revoke-all:hover {
      filter: brightness(1.1);
    }
    .sessions-page__revoke-all:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .sessions-page__error {
      margin-bottom: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
      font-size: 13px;
      display: none;
    }
    .sessions-page__error--visible {
      display: block;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="sessions-page__container">
    <div class="sessions-page__header">
      <div>
        <h1 class="sessions-page__title">Active Sessions</h1>
        <p class="sessions-page__subtitle">Manage your active login sessions across different devices and locations to ensure your account remains secure.</p>
      </div>
      <button type="button" class="sessions-page__revoke-all" id="revokeAllBtn">Revoke all other sessions</button>
    </div>
    <div class="sessions-page__error" id="error"></div>
    <pm-sessions-table id="sessionsTable"></pm-sessions-table>
  </div>
`;

export class PmSessionsPage extends HTMLElement {
  private sessionsTable: PmSessionsTable | null = null;
  private errorBanner: HTMLElement | null = null;
  private revokeAllBtn: HTMLButtonElement | null = null;

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

    this.revokeAllBtn.addEventListener('click', this.handleRevokeAll);
    this.shadowRoot!.addEventListener('session-revoke-requested', this.handleRevoke);

    void this.loadSessions();
  }

  disconnectedCallback(): void {
    this.revokeAllBtn?.removeEventListener('click', this.handleRevokeAll);
    this.shadowRoot!.removeEventListener('session-revoke-requested', this.handleRevoke);
  }

  private loadSessions = async (): Promise<void> => {
    this.clearError();
    try {
      this.sessionsTable!.sessions = await getOwnSessions();
    } catch (err) {
      this.showError(err);
    }
  };

  private handleRevoke = async (event: Event): Promise<void> => {
    const { tokenId } = (event as CustomEvent<{ tokenId: string }>).detail;
    this.clearError();
    try {
      await revokeOwnSession(tokenId);
      this.sessionsTable!.removeSession(tokenId);
    } catch (err) {
      this.showError(err);
    }
  };

  private handleRevokeAll = async (): Promise<void> => {
    this.clearError();
    this.revokeAllBtn!.disabled = true;
    try {
      await revokeOwnOtherSessions();
      await this.loadSessions();
    } catch (err) {
      this.showError(err);
    } finally {
      this.revokeAllBtn!.disabled = false;
    }
  };

  private showError(err: unknown): void {
    this.errorBanner!.textContent = err instanceof SessionError ? err.message : 'An unexpected error occurred';
    this.errorBanner!.classList.add('sessions-page__error--visible');
  }

  private clearError(): void {
    this.errorBanner!.classList.remove('sessions-page__error--visible');
  }
}

customElements.define('pm-sessions-page', PmSessionsPage);
