import type { StudentResult } from '../services/students';
import { gradeLabel } from './student-options';

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
    .sibling-list__actions {
      text-align: right;
    }
    .sibling-list__remove-btn {
      background: transparent;
      border: none;
      color: var(--pm-danger, #e05252);
      font-size: 12px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: var(--pm-radius);
    }
    .sibling-list__remove-btn:hover {
      background: rgba(224, 82, 82, 0.1);
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
          <th class="sibling-list__actions">Actions</th>
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
  private _siblings: StudentResult[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.rowsBody = this.shadowRoot!.getElementById('rows') as HTMLElement;
    this.emptyMessage = this.shadowRoot!.getElementById('empty') as HTMLElement;
    this.render();
  }

  set siblings(value: StudentResult[]) {
    this._siblings = value;
    this.render();
  }

  get siblings(): StudentResult[] {
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

  private buildRow(sibling: StudentResult): HTMLTableRowElement {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = `${sibling.firstName} ${sibling.lastName}`;

    const gradeCell = document.createElement('td');
    gradeCell.textContent = gradeLabel(sibling.grade);

    const classCell = document.createElement('td');
    classCell.textContent = sibling.class ?? '—';

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('sibling-list__actions');

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.classList.add('sibling-list__remove-btn');
    removeBtn.textContent = 'Remove';
    removeBtn.addEventListener('click', () => this.handleRemove(sibling));
    actionsCell.appendChild(removeBtn);

    row.append(nameCell, gradeCell, classCell, actionsCell);
    return row;
  }

  private handleRemove(sibling: StudentResult): void {
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
