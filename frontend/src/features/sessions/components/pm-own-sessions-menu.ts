import './pm-own-sessions-modal';
import './pm-revoke-session-modal';
import './pm-revoke-other-sessions-modal';
import { getOwnSessions, revokeOwnSession, revokeOwnOtherSessions, SessionError } from '../services/sessions';
import type { PmOwnSessionsModal } from './pm-own-sessions-modal';
import type { PmRevokeSessionModal } from './pm-revoke-session-modal';
import type { PmRevokeOtherSessionsModal } from './pm-revoke-other-sessions-modal';

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

  <button type="button" class="own-sessions-menu__item" id="openBtn">
    <span class="own-sessions-menu__item-icon" aria-hidden="true">devices</span>Active Sessions
  </button>
`;

// Mounted on the document rather than beside the button, for the same reason
// `pm-my-details-menu` does it: the button lives inside the account dropdown,
// which closes on the very click that opens the dialog.
const dialogTemplate = document.createElement('template');
dialogTemplate.innerHTML = `
  <pm-own-sessions-modal id="modal"></pm-own-sessions-modal>
  <pm-revoke-session-modal id="revokeSessionModal" stacked></pm-revoke-session-modal>
  <pm-revoke-other-sessions-modal id="revokeOtherSessionsModal" stacked></pm-revoke-other-sessions-modal>
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
  private revokeSessionModal: PmRevokeSessionModal | null = null;
  private revokeOtherSessionsModal: PmRevokeOtherSessionsModal | null = null;

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
    this.dialogHostElement?.removeEventListener('session-revoke-clicked', this.handleRevokeClicked);
    this.dialogHostElement?.removeEventListener('own-sessions-revoke-all-clicked', this.handleRevokeAllClicked);
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

    this.revokeSessionModal = this.dialogHostElement.querySelector(
      '#revokeSessionModal',
    ) as unknown as PmRevokeSessionModal;
    this.revokeOtherSessionsModal = this.dialogHostElement.querySelector(
      '#revokeOtherSessionsModal',
    ) as unknown as PmRevokeOtherSessionsModal;

    this.dialogHostElement.addEventListener('session-revoke-clicked', this.handleRevokeClicked);
    this.dialogHostElement.addEventListener('own-sessions-revoke-all-clicked', this.handleRevokeAllClicked);
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

  private handleRevokeClicked = (event: Event): void => {
    const { tokenId, deviceLabel } = (event as CustomEvent<{ tokenId: string; deviceLabel: string }>).detail;
    this.revokeSessionModal!.show(tokenId, deviceLabel);
  };

  private handleRevokeAllClicked = (): void => {
    this.revokeOtherSessionsModal!.show();
  };

  private handleRevoke = async (event: Event): Promise<void> => {
    const { tokenId } = (event as CustomEvent<{ tokenId: string }>).detail;
    try {
      await revokeOwnSession(tokenId);
      this.revokeSessionModal!.close();
      this.modal!.removeSession(tokenId);
    } catch (err) {
      this.revokeSessionModal!.setBusy(false);
      this.revokeSessionModal!.showError(this.messageOf(err));
    }
  };

  private handleRevokeAll = async (): Promise<void> => {
    this.modal!.revokeAllPending = true;
    try {
      await revokeOwnOtherSessions();
      this.revokeOtherSessionsModal!.close();
      await this.loadSessions();
    } catch (err) {
      this.revokeOtherSessionsModal!.setBusy(false);
      this.revokeOtherSessionsModal!.showError(this.messageOf(err));
    } finally {
      this.modal!.revokeAllPending = false;
    }
  };

  private messageOf(err: unknown): string {
    return err instanceof SessionError ? err.message : 'An unexpected error occurred';
  }

  private showError(err: unknown): void {
    this.modal!.showError(this.messageOf(err));
  }
}

customElements.define('pm-own-sessions-menu', PmOwnSessionsMenu);
