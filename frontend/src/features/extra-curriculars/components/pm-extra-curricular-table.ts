import { PHASE_LABELS, practiceTimesText } from '../services/extra-curricular-display';
import type { ExtraCurricular } from '../services/extra-curriculars';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
    }
    .ec-table__card {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 24px;
    }
    table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
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
    .ec-table__expander-header,
    .ec-table__expander {
      width: 40px;
    }
    td.ec-table__practice-times {
      color: var(--pm-text-muted);
    }
    .ec-table__actions-header,
    .ec-table__actions {
      text-align: right;
      width: 160px;
    }
    .ec-table__badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 9999px;
      font-size: 12px;
      font-weight: 600;
    }
    .ec-table__badge--junior {
      background: rgba(79, 124, 255, 0.15);
      color: var(--pm-accent);
    }
    .ec-table__badge--senior {
      background: rgba(143, 212, 78, 0.15);
      color: var(--pm-success);
    }
    .ec-table__empty {
      color: var(--pm-text-muted);
      font-size: 14px;
      margin: 16px 0 0;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="ec-table__card">
    <table>
      <thead>
        <tr>
          <th class="ec-table__expander-header"></th>
          <th>Description</th>
          <th>Phase</th>
          <th>Practice Times</th>
          <th class="ec-table__actions-header" id="actionsHeader" hidden>Actions</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <p class="ec-table__empty" id="empty" hidden>No extra-curricular activities found.</p>
  </div>
`;

export class PmExtraCurricularTable extends HTMLElement {
  private rowsBody: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private actionsHeader: HTMLElement | null = null;
  private _extraCurriculars: ExtraCurricular[] = [];
  private _showActions = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.rowsBody = this.shadowRoot!.getElementById('rows') as HTMLElement;
    this.emptyMessage = this.shadowRoot!.getElementById('empty') as HTMLElement;
    this.actionsHeader = this.shadowRoot!.getElementById('actionsHeader') as HTMLElement;

    // A property assigned before this element upgraded lands as an own property
    // that shadows the accessor below, so it is replayed through the setter here.
    this.upgradeProperty('extraCurriculars');
    this.upgradeProperty('showActions');

    this.render();
  }

  set extraCurriculars(value: ExtraCurricular[]) {
    this._extraCurriculars = value;
    this.render();
  }

  get extraCurriculars(): ExtraCurricular[] {
    return this._extraCurriculars;
  }

  /**
   * Whether the actions column exists at all. It holds nothing yet — edit and
   * delete arrive with #278 — but it is a maintainer's column, so a read-only
   * viewer gets no column rather than an empty one.
   */
  set showActions(value: boolean) {
    this._showActions = value;
    this.render();
  }

  private upgradeProperty(name: string): void {
    if (!Object.hasOwn(this, name)) return;

    const self = this as unknown as Record<string, unknown>;
    const value = self[name];
    delete self[name];
    self[name] = value;
  }

  private render(): void {
    if (!this.rowsBody || !this.emptyMessage || !this.actionsHeader) return;

    this.actionsHeader.hidden = !this._showActions;
    this.emptyMessage.hidden = this._extraCurriculars.length > 0;
    this.rowsBody.innerHTML = '';

    for (const extraCurricular of this._extraCurriculars) {
      this.rowsBody.appendChild(this.buildRow(extraCurricular));
    }
  }

  private buildRow(extraCurricular: ExtraCurricular): HTMLTableRowElement {
    const row = document.createElement('tr');
    // The description is free text and not unique, so the row carries the
    // activity's identifier — that is what addresses exactly one row.
    row.dataset.extraCurricularId = extraCurricular.extraCurricularId;

    // The expander is populated by #276, which adds practice-time maintenance
    // beneath the row. The column is here so the table's shape does not change
    // under it.
    const expanderCell = document.createElement('td');
    expanderCell.classList.add('ec-table__expander');

    const descriptionCell = document.createElement('td');
    descriptionCell.textContent = extraCurricular.description;

    const phaseCell = document.createElement('td');
    phaseCell.appendChild(this.buildPhaseBadge(extraCurricular));

    const practiceTimesCell = document.createElement('td');
    practiceTimesCell.classList.add('ec-table__practice-times');
    practiceTimesCell.textContent = practiceTimesText(extraCurricular);

    row.append(expanderCell, descriptionCell, phaseCell, practiceTimesCell);

    if (this._showActions) {
      const actionsCell = document.createElement('td');
      actionsCell.classList.add('ec-table__actions');
      row.appendChild(actionsCell);
    }

    return row;
  }

  private buildPhaseBadge(extraCurricular: ExtraCurricular): HTMLElement {
    const badge = document.createElement('span');
    badge.classList.add(
      'ec-table__badge',
      extraCurricular.phase === 'Junior' ? 'ec-table__badge--junior' : 'ec-table__badge--senior',
    );
    badge.textContent = PHASE_LABELS[extraCurricular.phase];
    return badge;
  }
}

customElements.define('pm-extra-curricular-table', PmExtraCurricularTable);
