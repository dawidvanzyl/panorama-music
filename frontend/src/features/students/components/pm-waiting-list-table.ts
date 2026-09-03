import type { WaitingListGroupResult } from '../services/waiting-list';
import {
  LESSON_TYPE_LABELS,
  DURATION_TYPE_LABELS,
  OCCURRENCE_TYPE_LABELS,
  INSTRUMENT_TYPE_LABELS,
} from './enrollment-options';

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' });
}

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
    }
    .wl-table__group {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 24px;
    }
    .wl-table__group + .wl-table__group {
      margin-top: 16px;
    }
    .wl-table__group-header {
      display: flex;
      align-items: center;
      gap: 8px;
      background: transparent;
      border: none;
      padding: 0;
      cursor: pointer;
      width: 100%;
      text-align: left;
    }
    .wl-table__chevron {
      display: block;
      color: var(--pm-text-muted);
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
      font-family: 'Material Symbols Outlined', system-ui, sans-serif;
      font-size: 20px;
      line-height: 1;
    }
    .wl-table__group-title {
      font-size: 1.125rem;
      font-weight: 600;
      letter-spacing: -0.01em;
      color: var(--pm-text);
      margin: 0;
    }
    .wl-table__group-count {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text-muted);
    }
    table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
      margin-top: 16px;
    }
    th, td {
      box-sizing: border-box;
      text-align: left;
      padding: 12px 4px;
      font-size: 14px;
      color: var(--pm-text);
      border-bottom: 1px solid var(--pm-border);
    }
    th {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pm-text-muted);
      padding-top: 0;
    }
    .wl-table__position-header,
    .wl-table__position {
      width: 48px;
    }
    .wl-table__student-name {
      display: block;
      font-size: 14px;
      color: var(--pm-text);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .wl-table__student-meta {
      display: block;
      font-size: 12px;
      color: var(--pm-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .wl-table__notes {
      color: var(--pm-text-muted);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .wl-table__actions-header,
    .wl-table__actions {
      text-align: right;
      width: 190px;
    }
    .wl-table__read-only {
      font-size: 13px;
      color: var(--pm-text-muted);
      display: block;
      text-align: right;
    }
    .wl-table__btn {
      border: 1px solid transparent;
      border-radius: var(--pm-radius);
      padding: 6px 12px;
      font-size: 12px;
      font-family: inherit;
      font-weight: 600;
      cursor: pointer;
    }
    .wl-table__btn + .wl-table__btn {
      margin-left: 6px;
    }
    .wl-table__btn--primary {
      background: var(--pm-accent);
      color: #fff;
    }
    .wl-table__btn--secondary {
      background: transparent;
      border-color: var(--pm-accent);
      color: var(--pm-accent);
    }
    .wl-table__btn--danger {
      background: var(--pm-danger, #e05252);
      border-color: var(--pm-danger, #e05252);
      color: #fff;
    }
    .wl-table__empty {
      color: var(--pm-text-muted);
      font-size: 14px;
      text-align: center;
      margin: 0;
      padding: 24px 0;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div id="groups"></div>
  <p class="wl-table__empty" id="empty" hidden>No students are currently on the waiting list.</p>
`;

export class PmWaitingListTable extends HTMLElement {
  private groupsContainer: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private _groups: WaitingListGroupResult[] = [];
  private _showActions = false;
  /** Occurrence types currently collapsed. Every group starts expanded. */
  private collapsed = new Set<string>();

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.groupsContainer = this.shadowRoot!.getElementById('groups') as HTMLElement;
    this.emptyMessage = this.shadowRoot!.getElementById('empty') as HTMLElement;

    this.upgradeProperty('groups');
    this.upgradeProperty('showActions');

    this.render();
  }

  set groups(value: WaitingListGroupResult[]) {
    this._groups = value;
    this.render();
  }

  get groups(): WaitingListGroupResult[] {
    return this._groups;
  }

  /**
   * Whether this viewer may maintain the list. A Teacher gets the read-only
   * marker in place of the row actions, and no Capture Student button — that
   * part is the page's concern, not this table's.
   */
  set showActions(value: boolean) {
    this._showActions = value;
    this.render();
  }

  get showActions(): boolean {
    return this._showActions;
  }

  private upgradeProperty(name: string): void {
    if (!Object.hasOwn(this, name)) return;

    const self = this as unknown as Record<string, unknown>;
    const value = self[name];
    delete self[name];
    self[name] = value;
  }

  private render(): void {
    if (!this.groupsContainer || !this.emptyMessage) return;

    const hasAnyEntries = this._groups.some((group) => group.entries.length > 0);
    this.emptyMessage.hidden = hasAnyEntries;

    this.groupsContainer.innerHTML = '';
    if (!hasAnyEntries) return;

    for (const group of this._groups) {
      if (group.entries.length === 0) continue;
      this.groupsContainer.appendChild(this.buildGroup(group));
    }
  }

  private buildGroup(group: WaitingListGroupResult): HTMLElement {
    const expanded = !this.collapsed.has(group.occurrenceType);

    const wrapper = document.createElement('div');
    wrapper.classList.add('wl-table__group');
    wrapper.dataset.occurrenceType = group.occurrenceType;

    const header = document.createElement('button');
    header.type = 'button';
    header.classList.add('wl-table__group-header');
    header.dataset.expanded = String(expanded);
    header.addEventListener('click', () => this.toggleGroup(group.occurrenceType));

    const chevron = document.createElement('span');
    chevron.classList.add('wl-table__chevron');
    chevron.textContent = expanded ? 'expand_more' : 'chevron_right';

    const title = document.createElement('h2');
    title.classList.add('wl-table__group-title');
    title.textContent = OCCURRENCE_TYPE_LABELS[group.occurrenceType];

    const count = document.createElement('span');
    count.classList.add('wl-table__group-count');
    count.textContent = `· ${group.count} waiting`;

    header.append(chevron, title, count);
    wrapper.appendChild(header);

    if (expanded) {
      wrapper.appendChild(this.buildTable(group));
    }

    return wrapper;
  }

  private buildTable(group: WaitingListGroupResult): HTMLTableElement {
    const table = document.createElement('table');

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    const positionHeader = document.createElement('th');
    positionHeader.classList.add('wl-table__position-header');
    positionHeader.textContent = '#';
    const studentHeader = document.createElement('th');
    studentHeader.textContent = 'Student';
    const notesHeader = document.createElement('th');
    notesHeader.textContent = 'Notes';
    const actionsHeader = document.createElement('th');
    actionsHeader.classList.add('wl-table__actions-header');
    actionsHeader.textContent = 'Actions';
    headerRow.append(positionHeader, studentHeader, notesHeader, actionsHeader);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    for (const entry of group.entries) {
      tbody.appendChild(this.buildRow(entry));
    }
    table.appendChild(tbody);

    return table;
  }

  private buildRow(entry: WaitingListGroupResult['entries'][number]): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.dataset.waitingListEntryId = entry.waitingListEntryId;

    const positionCell = document.createElement('td');
    positionCell.classList.add('wl-table__position');
    positionCell.textContent = String(entry.position);

    const studentCell = document.createElement('td');
    const name = document.createElement('span');
    name.classList.add('wl-table__student-name');
    name.textContent = `${entry.firstName} ${entry.lastName}`;
    const meta = document.createElement('span');
    meta.classList.add('wl-table__student-meta');
    meta.textContent =
      `${LESSON_TYPE_LABELS[entry.lessonType]} · ${DURATION_TYPE_LABELS[entry.durationType]} · ` +
      `${INSTRUMENT_TYPE_LABELS[entry.instrumentType]} · Added ${formatDate(entry.addedAt)}`;
    studentCell.append(name, meta);

    const notesCell = document.createElement('td');
    notesCell.classList.add('wl-table__notes');
    notesCell.title = entry.notes ?? '';
    notesCell.textContent = entry.notes || '—';

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('wl-table__actions');
    if (this._showActions) {
      actionsCell.appendChild(this.buildActions());
    } else {
      const readOnly = document.createElement('span');
      readOnly.classList.add('wl-table__read-only');
      readOnly.textContent = 'Read only';
      actionsCell.appendChild(readOnly);
    }

    row.append(positionCell, studentCell, notesCell, actionsCell);
    return row;
  }

  /**
   * Enrol, Edit and Delete are shown as the design calls for, but wired to
   * nothing yet — capturing, editing and enrolling off the list are later M9
   * stories, and this one is read-only.
   */
  private buildActions(): HTMLElement {
    const container = document.createElement('div');

    const enrolBtn = document.createElement('button');
    enrolBtn.type = 'button';
    enrolBtn.classList.add('wl-table__btn', 'wl-table__btn--primary');
    enrolBtn.textContent = 'Enrol';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.classList.add('wl-table__btn', 'wl-table__btn--secondary');
    editBtn.textContent = 'Edit';

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.classList.add('wl-table__btn', 'wl-table__btn--danger');
    deleteBtn.textContent = 'Delete';

    container.append(enrolBtn, editBtn, deleteBtn);
    return container;
  }

  private toggleGroup(occurrenceType: string): void {
    if (this.collapsed.has(occurrenceType)) {
      this.collapsed.delete(occurrenceType);
    } else {
      this.collapsed.add(occurrenceType);
    }
    this.render();
  }
}

customElements.define('pm-waiting-list-table', PmWaitingListTable);
