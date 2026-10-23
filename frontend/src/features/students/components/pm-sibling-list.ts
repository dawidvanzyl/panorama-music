import type { SiblingStudentResult } from '../services/students';
import { buildPopulationIcon, populationIconStyles } from './student-population';
import { gradeLabel } from './student-options';
import { compactButtonStyles } from '../../../components/compact-button-styles';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .sibling-list__scroll {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      text-align: left;
      padding: 8px 10px;
      font-size: 13px;
      color: var(--pm-text);
      border-bottom: 1px solid var(--pm-border);
    }
    th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pm-text-muted);
    }
    .sibling-list__name {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .sibling-list__empty {
      color: var(--pm-text-muted);
      font-size: 13px;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="sibling-list__scroll">
    <table>
      <thead>
        <tr>
          <th>Name</th>
          <th>Grade</th>
          <th>Class</th>
          <th class="compact-actions-col">Actions</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <p class="sibling-list__empty" id="empty" hidden>No siblings linked.</p>
  </div>
`;

export class PmSiblingList extends HTMLElement {
  private rowsBody: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private _siblings: SiblingStudentResult[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [compactButtonStyles, populationIconStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.rowsBody = this.shadowRoot!.getElementById('rows') as HTMLElement;
    this.emptyMessage = this.shadowRoot!.getElementById('empty') as HTMLElement;
    this.render();
  }

  set siblings(value: SiblingStudentResult[]) {
    this._siblings = value;
    this.render();
  }

  get siblings(): SiblingStudentResult[] {
    return this._siblings;
  }

  private render(): void {
    if (!this.rowsBody || !this.emptyMessage) return;

    this.rowsBody.innerHTML = '';
    this.emptyMessage.hidden = this._siblings.length > 0;

    for (const sibling of this._siblings) {
      this.rowsBody.appendChild(this.buildRow(sibling));
    }
  }

  private buildRow(sibling: SiblingStudentResult): HTMLTableRowElement {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    const name = document.createElement('span');
    name.className = 'sibling-list__name';
    // Each row's icon is that sibling's own state. A group can hold an enrolled
    // child and a waiting one at once, so the wizard's mode says nothing about
    // which this is.
    name.append(
      buildPopulationIcon(sibling.population),
      document.createTextNode(`${sibling.firstName} ${sibling.lastName}`),
    );
    nameCell.appendChild(name);

    const gradeCell = document.createElement('td');
    gradeCell.textContent = gradeLabel(sibling.grade);

    const classCell = document.createElement('td');
    classCell.textContent = sibling.class ?? '—';

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('compact-actions-col');
    const actions = document.createElement('div');
    actions.classList.add('compact-actions');
    actions.dataset.testid = 'row-actions';

    const unlinkBtn = document.createElement('button');
    unlinkBtn.type = 'button';
    unlinkBtn.classList.add('compact-btn', 'sibling-list__unlink-btn');
    unlinkBtn.textContent = 'Unlink';
    unlinkBtn.addEventListener('click', () => this.handleRemove(sibling));
    actions.appendChild(unlinkBtn);
    actionsCell.appendChild(actions);

    row.append(nameCell, gradeCell, classCell, actionsCell);
    return row;
  }

  private handleRemove(sibling: SiblingStudentResult): void {
    this.dispatchEvent(
      new CustomEvent('sibling-remove-clicked', {
        bubbles: true,
        composed: true,
        detail: { siblingId: sibling.studentId },
      }),
    );
  }
}

customElements.define('pm-sibling-list', PmSiblingList);
