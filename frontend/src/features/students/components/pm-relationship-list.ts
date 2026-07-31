import type { GuardianRelationship } from '../services/guardians';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 8px 16px 16px;
    }
    table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }
    .relationship-list__col-actions {
      width: 190px;
    }
    th, td {
      text-align: left;
      padding: 10px;
      font-size: 13px;
      color: var(--pm-text);
      border-bottom: 1px solid var(--pm-border);
      overflow-wrap: break-word;
    }
    th {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pm-text-muted);
    }
    .relationship-list__actions {
      text-align: right;
      white-space: nowrap;
    }
    .relationship-list__btn {
      background: transparent;
      border: 1px solid currentColor;
      font-size: 12px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: var(--pm-radius);
      font-family: inherit;
    }
    .relationship-list__btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .relationship-list__btn--edit {
      color: var(--pm-accent);
    }
    .relationship-list__btn--edit:hover:not(:disabled) {
      background: rgba(79, 124, 255, 0.1);
    }
    .relationship-list__btn--delete {
      border: none;
      background: var(--pm-danger, #e05252);
      color: #fff;
    }
    .relationship-list__btn--delete:hover:not(:disabled) {
      opacity: 0.85;
    }
    .relationship-list__btn--cancel {
      color: var(--pm-text);
    }
    .relationship-list__btn--cancel:hover {
      background: var(--pm-surface-2);
    }
    .relationship-list__btn--save {
      border: none;
      background: var(--pm-accent);
      color: #fff;
    }
    .relationship-list__actions .relationship-list__btn + .relationship-list__btn {
      margin-left: 8px;
    }
    .relationship-list__edit-input {
      box-sizing: border-box;
      width: 100%;
      height: 28px;
      padding: 0 6px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 13px;
      font-family: inherit;
    }
    .relationship-list__empty {
      color: var(--pm-text-muted);
      font-size: 13px;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <table>
    <colgroup>
      <col />
      <col class="relationship-list__col-actions" />
    </colgroup>
    <thead>
      <tr>
        <th>Name</th>
        <th class="relationship-list__actions">Actions</th>
      </tr>
    </thead>
    <tbody id="rows"></tbody>
  </table>
  <p class="relationship-list__empty" id="empty" hidden>No guardian relationships defined yet.</p>
`;

export class PmRelationshipList extends HTMLElement {
  private rowsBody: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private _relationships: GuardianRelationship[] = [];
  private _editingRelationshipId: string | null = null;

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

  set relationships(value: GuardianRelationship[]) {
    this._relationships = value;
    this._editingRelationshipId = null;
    this.render();
  }

  get relationships(): GuardianRelationship[] {
    return this._relationships;
  }

  private render(): void {
    if (!this.rowsBody || !this.emptyMessage) return;

    this.rowsBody.innerHTML = '';
    this.emptyMessage.hidden = this._relationships.length > 0;

    for (const relationship of this._relationships) {
      const isEditing = relationship.guardianRelationshipId === this._editingRelationshipId;
      this.rowsBody.appendChild(isEditing ? this.buildEditableRow(relationship) : this.buildRow(relationship));
    }
  }

  private buildRow(relationship: GuardianRelationship): HTMLTableRowElement {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = relationship.name;

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('relationship-list__actions');

    const isAnotherRowEditing = this._editingRelationshipId !== null;

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.classList.add('relationship-list__btn', 'relationship-list__btn--edit');
    editBtn.textContent = 'Edit';
    editBtn.disabled = isAnotherRowEditing;
    editBtn.addEventListener('click', () => this.handleEditClicked(relationship));
    actionsCell.appendChild(editBtn);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.classList.add('relationship-list__btn', 'relationship-list__btn--delete');
    deleteBtn.textContent = 'Delete';
    deleteBtn.disabled = isAnotherRowEditing;
    deleteBtn.addEventListener('click', () => this.handleDelete(relationship));
    actionsCell.appendChild(deleteBtn);

    row.append(nameCell, actionsCell);
    return row;
  }

  private buildEditableRow(relationship: GuardianRelationship): HTMLTableRowElement {
    const row = document.createElement('tr');

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.classList.add('relationship-list__edit-input');
    nameInput.value = relationship.name;
    nameInput.required = true;
    nameInput.maxLength = 50;

    const nameCell = document.createElement('td');
    nameCell.appendChild(nameInput);

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('relationship-list__actions');

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.classList.add('relationship-list__btn', 'relationship-list__btn--cancel');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.handleEditCancelled());
    actionsCell.appendChild(cancelBtn);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.classList.add('relationship-list__btn', 'relationship-list__btn--save');
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => this.handleEditSaved(relationship.guardianRelationshipId, nameInput));
    actionsCell.appendChild(saveBtn);

    row.append(nameCell, actionsCell);
    return row;
  }

  private handleEditClicked(relationship: GuardianRelationship): void {
    this._editingRelationshipId = relationship.guardianRelationshipId;
    this.render();
  }

  private handleEditCancelled(): void {
    this._editingRelationshipId = null;
    this.render();
  }

  private handleEditSaved(guardianRelationshipId: string, nameInput: HTMLInputElement): void {
    if (!nameInput.reportValidity()) return;

    this.dispatchEvent(
      new CustomEvent('relationship-edit-saved', {
        bubbles: true,
        composed: true,
        detail: { guardianRelationshipId, name: nameInput.value.trim() },
      }),
    );
  }

  private handleDelete(relationship: GuardianRelationship): void {
    this.dispatchEvent(
      new CustomEvent('relationship-delete-clicked', {
        bubbles: true,
        composed: true,
        detail: { relationship },
      }),
    );
  }
}

customElements.define('pm-relationship-list', PmRelationshipList);
