import './pm-own-sessions-modal';
import { getOwnSessions, revokeOwnSession, revokeOwnOtherSessions, SessionError } from '../services/sessions';
import type { PmOwnSessionsModal } from './pm-own-sessions-modal';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
    }
    :host([hidden]) {
      display: none !important;
    }
    .own-sessions-menu__item {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
      padding: 10px 12px;
      border: none;
      border-radius: var(--pm-radius);
      background: transparent;
      color: var(--pm-text);
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      text-align: left;
      cursor: pointer;
    }
    .own-sessions-menu__item:hover {
      background: var(--pm-surface-2);
    }
    .own-sessions-menu__item-icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 20px;
      color: var(--pm-text-muted);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <button type="button" class="own-sessions-menu__item" id="openBtn" role="menuitem">
    <span class="own-sessions-menu__item-icon" aria-hidden="true">devices</span>Active Sessions
  </button>
`;

// Mounted on the document rather than beside the button, for the same reason
// `pm-my-details-menu` does it: the button lives inside the account dropdown,
// which closes on the very click that opens the dialog.
const dialogTemplate = document.createElement('template');
dialogTemplate.innerHTML = `
  <pm-own-sessions-modal id="modal"></pm-own-sessions-modal>
`;

/**
 * The account menu's own-sessions entry point, and the one place the own-session
 * endpoints are called from. The sessions feature owns this; the shared nav bar
 * only offers the slot it hangs in.
 *
 * Unlike `My Details`, there is nothing to gate on — every signed-in user has
 * sessions, so the item is offered to all of them and the list is fetched when
 * it is opened rather than on every page load.
 */
export class PmOwnSessionsMenu extends HTMLElement {
  private openBtn: HTMLButtonElement | null = null;
  private dialogHostElement: HTMLElement | null = null;
  private modal: PmOwnSessionsModal | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.openBtn = this.shadowRoot!.getElementById('openBtn') as HTMLButtonElement;
    this.openBtn.addEventListener('click', this.handleOpen);
    this.mountDialog();
  }

  disconnectedCallback(): void {
    this.openBtn?.removeEventListener('click', this.handleOpen);
    this.dialogHostElement?.removeEventListener('session-revoke-requested', this.handleRevoke);
    this.dialogHostElement?.removeEventListener('own-sessions-revoke-all-requested', this.handleRevokeAll);
    this.dialogHostElement?.remove();
    this.dialogHostElement = null;
  }

  /** The mounted dialog, for tests and for anything that needs to drive it directly. */
  get dialogHost(): HTMLElement | null {
    return this.dialogHostElement;
  }

  private mountDialog(): void {
    if (this.dialogHostElement) return;

    this.dialogHostElement = document.createElement('div');
    this.dialogHostElement.className = 'pm-own-sessions-dialog';
    this.dialogHostElement.appendChild(dialogTemplate.content.cloneNode(true));
    document.body.appendChild(this.dialogHostElement);

    this.modal = this.dialogHostElement.querySelector('#modal') as unknown as PmOwnSessionsModal;

    this.dialogHostElement.addEventListener('session-revoke-requested', this.handleRevoke);
    this.dialogHostElement.addEventListener('own-sessions-revoke-all-requested', this.handleRevokeAll);
  }

  private handleOpen = (): void => {
    this.modal!.show();
    void this.loadSessions();
  };

  private loadSessions = async (): Promise<void> => {
    this.modal!.clearError();
    try {
      this.modal!.sessions = await getOwnSessions();
    } catch (err) {
      this.showError(err);
    }
  };

  private handleRevoke = async (event: Event): Promise<void> => {
    const { tokenId } = (event as CustomEvent<{ tokenId: string }>).detail;
    this.modal!.clearError();
    try {
      await revokeOwnSession(tokenId);
      this.modal!.removeSession(tokenId);
    } catch (err) {
      this.showError(err);
    }
  };

  private handleRevokeAll = async (): Promise<void> => {
    this.modal!.clearError();
    this.modal!.revokeAllPending = true;
    try {
      await revokeOwnOtherSessions();
      await this.loadSessions();
    } catch (err) {
      this.showError(err);
    } finally {
      this.modal!.revokeAllPending = false;
    }
  };

  private showError(err: unknown): void {
    this.modal!.showError(err instanceof SessionError ? err.message : 'An unexpected error occurred');
  }
}

customElements.define('pm-own-sessions-menu', PmOwnSessionsMenu);
