import './pm-extra-curricular-practice-times';
import { PHASE_LABELS, practiceTimesText } from '../services/extra-curricular-display';
import type { ExtraCurricular } from '../services/extra-curriculars';
import type { PmExtraCurricularPracticeTimes } from './pm-extra-curricular-practice-times';

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
    .ec-table__chevron {
      display: block;
      background: transparent;
      border: none;
      padding: 0;
      color: var(--pm-text-muted);
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
      font-family: 'Material Symbols Outlined', system-ui, sans-serif;
      font-size: 20px;
      line-height: 1;
      cursor: pointer;
    }
    .ec-table__chevron--expanded {
      color: var(--pm-text);
    }
    td.ec-table__panel {
      padding: 0 4px 16px;
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
  /** The activity whose practice-times panel is open, if any. */
  private expandedId: string | null = null;
  /**
   * The open panel itself, kept across renders rather than rebuilt. A rebuild
   * would clear the day and start time the user had already chosen every time
   * the catalogue reloaded.
   */
  private panel: PmExtraCurricularPracticeTimes | null = null;

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
   * Whether this viewer may maintain the catalogue. The row's actions column
   * holds nothing yet — edit and delete arrive with #278 — but it is a
   * maintainer's column, so a read-only viewer gets no column rather than an
   * empty one. The expanded panel follows the same flag for its own controls.
   */
  set showActions(value: boolean) {
    this._showActions = value;
    this.render();
  }

  get showActions(): boolean {
    return this._showActions;
  }

  /**
   * Puts a refusal the server answered with onto the open panel, beside the
   * controls that produced it. The panel answers its own two rules without a
   * request; this is for everything else.
   */
  showPanelError(message: string): void {
    this.panel?.showError(message);
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

    // An activity narrowed out of the list by a filter, or deleted elsewhere,
    // takes its open panel with it rather than leaving one orphaned.
    if (!this._extraCurriculars.some((activity) => activity.extraCurricularId === this.expandedId)) {
      this.collapse();
    }

    this.rowsBody.innerHTML = '';

    for (const extraCurricular of this._extraCurriculars) {
      this.rowsBody.appendChild(this.buildRow(extraCurricular));

      if (extraCurricular.extraCurricularId === this.expandedId) {
        this.rowsBody.appendChild(this.buildPanelRow(extraCurricular));
      }
    }
  }

  /**
   * The panel row: a full-width cell beneath the activity's own row, holding the
   * panel element. It carries no description text of its own, so a locator that
   * filters rows by an activity's description still addresses exactly one row.
   */
  private buildPanelRow(extraCurricular: ExtraCurricular): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.dataset.practiceTimesPanelFor = extraCurricular.extraCurricularId;

    const cell = document.createElement('td');
    cell.classList.add('ec-table__panel');
    cell.colSpan = this._showActions ? 5 : 4;

    this.panel ??= document.createElement(
      'pm-extra-curricular-practice-times',
    ) as unknown as PmExtraCurricularPracticeTimes;
    this.panel.showActions = this._showActions;
    this.panel.extraCurricular = extraCurricular;

    cell.appendChild(this.panel);
    row.appendChild(cell);
    return row;
  }

  private toggleExpanded(extraCurricularId: string): void {
    if (this.expandedId === extraCurricularId) {
      this.collapse();
    } else {
      // One panel at a time: a second one open below the first would put two
      // activities' slots on screen with only their headings to tell them apart.
      this.collapse();
      this.expandedId = extraCurricularId;
    }

    this.render();
  }

  private collapse(): void {
    this.expandedId = null;
    this.panel = null;
  }

  private buildRow(extraCurricular: ExtraCurricular): HTMLTableRowElement {
    const row = document.createElement('tr');
    // The description is free text and not unique, so the row carries the
    // activity's identifier — that is what addresses exactly one row.
    row.dataset.extraCurricularId = extraCurricular.extraCurricularId;

    const expanded = this.expandedId === extraCurricular.extraCurricularId;

    const expanderCell = document.createElement('td');
    expanderCell.classList.add('ec-table__expander');
    expanderCell.appendChild(this.buildExpander(extraCurricular, expanded));

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

  /**
   * The chevron that opens and closes the row's practice-times panel. Its glyph
   * is what says which state the row is in — `chevron_right` closed,
   * `expand_more` open — so the collapsed state is visible rather than inferred
   * from the panel's absence.
   */
  private buildExpander(extraCurricular: ExtraCurricular, expanded: boolean): HTMLElement {
    const chevron = document.createElement('button');
    chevron.type = 'button';
    chevron.classList.add('ec-table__chevron');
    chevron.classList.toggle('ec-table__chevron--expanded', expanded);
    chevron.dataset.expanded = String(expanded);
    chevron.textContent = expanded ? 'expand_more' : 'chevron_right';
    chevron.setAttribute(
      'aria-label',
      `${expanded ? 'Collapse' : 'Expand'} practice times for ${extraCurricular.description}`,
    );
    chevron.addEventListener('click', () => this.toggleExpanded(extraCurricular.extraCurricularId));
    return chevron;
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
