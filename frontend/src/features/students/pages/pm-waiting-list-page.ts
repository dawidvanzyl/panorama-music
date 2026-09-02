import '../components/pm-waiting-list-table';
import { hasAnyRole } from '../../../services/token-storage';
import { getWaitingList, WaitingListError } from '../services/waiting-list';
import type { PmWaitingListTable } from '../components/pm-waiting-list-table';

/** Who may capture a student and act on a row. A Teacher gets a read-only page. */
const MAINTAINER_ROLES = ['Coordinator'];

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: flex;
      flex-direction: column;
      gap: 16px;
      flex: 1;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .waiting-list-page__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .waiting-list-page__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--pm-text);
      margin: 0;
    }
    .waiting-list-page__capture-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 24px;
      border: none;
      border-radius: 9999px;
      background: var(--pm-accent);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .waiting-list-page__capture-btn:hover {
      filter: brightness(1.1);
    }
    .waiting-list-page__error {
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
      font-size: 13px;
      display: none;
    }
    .waiting-list-page__error--visible {
      display: block;
    }
    [hidden] {
      display: none !important;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="waiting-list-page__header">
    <h1 class="waiting-list-page__title">Waiting List</h1>
    <button type="button" class="waiting-list-page__capture-btn" id="captureBtn" hidden>Capture Student</button>
  </div>
  <div class="waiting-list-page__error" id="error"></div>
  <pm-waiting-list-table id="table"></pm-waiting-list-table>
`;

export class PmWaitingListPage extends HTMLElement {
  private table: PmWaitingListTable | null = null;
  private captureBtn: HTMLButtonElement | null = null;
  private errorBanner: HTMLElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.table = this.shadowRoot!.getElementById('table') as unknown as PmWaitingListTable;
    this.captureBtn = this.shadowRoot!.getElementById('captureBtn') as HTMLButtonElement;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;

    // A Teacher gets a read-only page: the table renders as it does for
    // anyone, and the capture action is absent rather than disabled —
    // matching how the endpoint answers them.
    const canMaintain = hasAnyRole(MAINTAINER_ROLES);
    this.captureBtn.hidden = !canMaintain;
    this.table.showActions = canMaintain;

    void this.loadWaitingList();
  }

  private async loadWaitingList(): Promise<void> {
    this.clearError();
    try {
      this.table!.groups = await getWaitingList();
    } catch (err) {
      this.showError(err);
    }
  }

  private showError(err: unknown): void {
    this.errorBanner!.textContent = err instanceof WaitingListError ? err.message : 'An unexpected error occurred';
    this.errorBanner!.classList.add('waiting-list-page__error--visible');
  }

  private clearError(): void {
    this.errorBanner!.textContent = '';
    this.errorBanner!.classList.remove('waiting-list-page__error--visible');
  }
}

customElements.define('pm-waiting-list-page', PmWaitingListPage);
