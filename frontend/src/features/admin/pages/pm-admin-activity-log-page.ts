import '../components/pm-audit-filter-bar';
import '../components/pm-audit-event-table';
import { getAuditEvents, AuditError, type AuditEventFilters } from '../services/audit';
import type { AuditFilterValues } from '../components/pm-audit-filter-bar';
import type { PmAuditEventTable } from '../components/pm-audit-event-table';

const _pageSize = 25;

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      flex: 1;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .activity-log__title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--pm-text);
      margin: 0 0 4px;
    }
    .activity-log__subtitle {
      color: var(--pm-text-muted);
      font-size: 14px;
      margin: 0 0 24px;
    }
    .activity-log__error {
      margin-bottom: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
      font-size: 13px;
      display: none;
    }
    .activity-log__error--visible {
      display: block;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="activity-log__container">
    <h1 class="activity-log__title">Activity Log</h1>
    <p class="activity-log__subtitle">Track and monitor system-wide activity for security and compliance.</p>
    <div class="activity-log__error" id="error"></div>
    <pm-audit-filter-bar id="filterBar"></pm-audit-filter-bar>
    <pm-audit-event-table id="eventTable"></pm-audit-event-table>
  </div>
`;

export class PmAdminActivityLogPage extends HTMLElement {
  private eventTable: PmAuditEventTable | null = null;
  private errorBanner: HTMLElement | null = null;

  private _filters: AuditFilterValues = { actor: '', eventType: '', from: '', to: '' };
  private _page = 1;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.eventTable = this.shadowRoot!.getElementById('eventTable') as unknown as PmAuditEventTable;
    this.errorBanner = this.shadowRoot!.getElementById('error') as HTMLElement;

    this.shadowRoot!.addEventListener('audit-filter-changed', this.handleFilterChanged);
    this.shadowRoot!.addEventListener('audit-page-changed', this.handlePageChanged);

    void this.loadEvents();
  }

  disconnectedCallback(): void {
    this.shadowRoot!.removeEventListener('audit-filter-changed', this.handleFilterChanged);
    this.shadowRoot!.removeEventListener('audit-page-changed', this.handlePageChanged);
  }

  private handleFilterChanged = (event: Event): void => {
    this._filters = (event as CustomEvent<AuditFilterValues>).detail;
    this._page = 1;
    void this.loadEvents();
  };

  private handlePageChanged = (event: Event): void => {
    this._page = (event as CustomEvent<{ page: number }>).detail.page;
    void this.loadEvents();
  };

  private loadEvents = async (): Promise<void> => {
    this.clearError();

    const request: AuditEventFilters = {
      actor: this._filters.actor || undefined,
      eventType: this._filters.eventType || undefined,
      from: this._filters.from || undefined,
      to: this._filters.to || undefined,
      page: this._page,
      pageSize: _pageSize,
    };

    try {
      const result = await getAuditEvents(request);
      this.eventTable!.setPage(result.items, result.totalCount, result.page, result.pageSize);
    } catch (err) {
      this.showError(err);
    }
  };

  private showError(err: unknown): void {
    this.errorBanner!.textContent = err instanceof AuditError ? err.message : 'An unexpected error occurred';
    this.errorBanner!.classList.add('activity-log__error--visible');
  }

  private clearError(): void {
    this.errorBanner!.classList.remove('activity-log__error--visible');
  }
}

customElements.define('pm-admin-activity-log-page', PmAdminActivityLogPage);
