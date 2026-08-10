import './pm-sessions-table';
import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import type { PmSessionsTable } from './pm-sessions-table';
import type { SessionResult } from '../services/sessions';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    /* Wider than the shared 420px default: the sessions table carries five
       columns, and anything narrower wraps every row onto three lines. Sized to
       match the student wizard — the same width calculation, so the two widest
       dialogs in the application line up rather than each picking a number. */
    .modal__card {
      box-sizing: border-box;
      max-width: none;
      width: calc(100% - var(--pm-sidebar-width, 240px) - (2 * var(--pm-content-padding, 1cm)));
      max-height: calc(100vh - 64px);
      overflow-y: auto;
    }
    .modal__header {
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .own-sessions__heading {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 4px;
    }
    .modal__title {
      color: var(--pm-text);
    }
    .own-sessions__subtitle {
      color: var(--pm-text-muted);
      font-size: 14px;
      max-width: 40em;
    }
    .own-sessions__close {
      display: flex;
      padding: 4px;
      border: none;
      background: none;
      color: var(--pm-text-muted);
      cursor: pointer;
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 22px;
    }
    .own-sessions__error {
      margin-bottom: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
      font-size: 13px;
      display: none;
    }
    .own-sessions__error--visible {
      display: block;
    }
    .own-sessions__actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }
    .own-sessions__revoke-all {
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
    .own-sessions__revoke-all:hover:not(:disabled) {
      filter: brightness(1.1);
    }
    .own-sessions__revoke-all:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card" role="dialog" aria-modal="true" aria-labelledby="modalTitle">
      <div class="modal__header">
        <div class="own-sessions__heading">
          <h2 class="modal__title" id="modalTitle">Active Sessions</h2>
          <p class="own-sessions__subtitle">Manage your active login sessions across different devices and locations to ensure your account remains secure.</p>
        </div>
        <button type="button" class="own-sessions__close" id="closeBtn" aria-label="Close">close</button>
      </div>
      <div class="own-sessions__error" id="error"></div>
      <pm-sessions-table id="sessionsTable"></pm-sessions-table>
      <div class="own-sessions__actions">
        <button type="button" class="own-sessions__revoke-all" id="revokeAllBtn">Revoke all other sessions</button>
      </div>
    </div>
  </div>
`;

/**
 * The caller's own sessions, as a dialog. It renders and nothing more: the
 * revoke actions leave here as events and are answered by whatever opened it,
 * which is what keeps the session endpoints in one place rather than in every
 * component that shows a session.
 */
export class PmOwnSessionsModal extends HTMLElement {
  private sessionsTable: PmSessionsTable | null = null;
  private errorBanner: HTMLElement | null = null;
  private revokeAllBtn: HTMLButtonElement | null = null;
  private closeBtn: HTMLButtonElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.sessionsTable = this.shadowRoot!.getElementById('sessionsTable') as unknown as PmSessionsTable;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;
    this.revokeAllBtn = this.shadowRoot!.getElementById('revokeAllBtn') as HTMLButtonElement;
    this.closeBtn = this.shadowRoot!.getElementById('closeBtn') as HTMLButtonElement;

    this.revokeAllBtn.addEventListener('click', this.handleRevokeAll);
    this.closeBtn.addEventListener('click', this.handleClose);
  }

  disconnectedCallback(): void {
    this.revokeAllBtn?.removeEventListener('click', this.handleRevokeAll);
    this.closeBtn?.removeEventListener('click', this.handleClose);
  }

  show(): void {
    this.clearError();
    // The routed page this replaces was rebuilt on every navigation and so
    // always opened empty. Kept that way deliberately: the dialog outlives its
    // openings, and showing the previous fetch's rows would present sessions
    // that may already have been revoked as though they were current.
    this.sessions = [];
    this.setAttribute('open', '');
  }

  close(): void {
    this.removeAttribute('open');
  }

  set sessions(value: SessionResult[]) {
    this.sessionsTable!.sessions = value;
  }

  removeSession(tokenId: string): void {
    this.sessionsTable!.removeSession(tokenId);
  }

  /** Held disabled while a revoke-all is in flight, so it cannot be fired twice. */
  set revokeAllPending(pending: boolean) {
    this.revokeAllBtn!.disabled = pending;
  }

  showError(message: string): void {
    this.errorBanner!.textContent = message;
    this.errorBanner!.classList.add('own-sessions__error--visible');
  }

  clearError(): void {
    this.errorBanner!.classList.remove('own-sessions__error--visible');
  }

  private handleClose = (): void => {
    this.close();
  };

  private handleRevokeAll = (): void => {
    this.dispatchEvent(
      new CustomEvent('own-sessions-revoke-all-requested', {
        bubbles: true,
        composed: true,
      }),
    );
  };
}

customElements.define('pm-own-sessions-modal', PmOwnSessionsModal);
