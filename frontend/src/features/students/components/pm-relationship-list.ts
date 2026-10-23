import type { GuardianRelationship } from '../services/guardians';
import { compactButtonStyles } from '../../../components/compact-button-styles';
import { setButtonsBusy } from '../../../components/button-states';

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
        <th class="compact-actions-col">Actions</th>
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
  private _nameDraft = '';
  private _saving = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [compactButtonStyles, styles];
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
    this._nameDraft = '';
    this._saving = false;
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
    actionsCell.classList.add('compact-actions-col');
    const actions = this.buildActionsContainer();

    const isAnotherRowEditing = this._editingRelationshipId !== null;

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.classList.add('compact-btn', 'relationship-list__btn--edit');
    editBtn.textContent = 'Edit';
    editBtn.disabled = isAnotherRowEditing;
    editBtn.addEventListener('click', () => this.handleEditClicked(relationship));

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.classList.add('compact-btn', 'compact-btn--destructive', 'relationship-list__btn--delete');
    deleteBtn.textContent = 'Delete';
    deleteBtn.disabled = isAnotherRowEditing;
    deleteBtn.addEventListener('click', () => this.handleDelete(relationship));

    actions.append(editBtn, deleteBtn);
    actionsCell.appendChild(actions);
    row.append(nameCell, actionsCell);
    return row;
  }

  private buildActionsContainer(): HTMLDivElement {
    const actions = document.createElement('div');
    actions.classList.add('compact-actions');
    actions.dataset.testid = 'row-actions';
    return actions;
  }

  private buildEditableRow(relationship: GuardianRelationship): HTMLTableRowElement {
    const row = document.createElement('tr');

    const nameInput = document.createElement('input');
    nameInput.type = 'text';
    nameInput.classList.add('relationship-list__edit-input');
    nameInput.value = this._nameDraft;
    nameInput.required = true;
    nameInput.maxLength = 50;
    nameInput.addEventListener('input', () => {
      this._nameDraft = nameInput.value;
    });

    const nameCell = document.createElement('td');
    nameCell.appendChild(nameInput);

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('compact-actions-col');
    const actions = this.buildActionsContainer();

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.classList.add('compact-btn', 'relationship-list__btn--cancel');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.handleEditCancelled());

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.classList.add('compact-btn', 'relationship-list__btn--save');
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => this.handleEditSaved(relationship.guardianRelationshipId, nameInput));

    if (this._saving) setButtonsBusy(saveBtn, cancelBtn, true);

    actions.append(cancelBtn, saveBtn);
    actionsCell.appendChild(actions);
    row.append(nameCell, actionsCell);
    return row;
  }

  private handleEditClicked(relationship: GuardianRelationship): void {
    this._editingRelationshipId = relationship.guardianRelationshipId;
    this._nameDraft = relationship.name;
    this._saving = false;
    this.render();
  }

  private handleEditCancelled(): void {
    this._editingRelationshipId = null;
    this._nameDraft = '';
    this._saving = false;
    this.render();
  }

  endSave(): void {
    if (!this._saving) return;
    this._saving = false;
    this.render();
  }

  private handleEditSaved(guardianRelationshipId: string, nameInput: HTMLInputElement): void {
    if (this._saving || !nameInput.reportValidity()) return;

    const name = nameInput.value.trim();
    this._saving = true;
    this.render();
    this.dispatchEvent(
      new CustomEvent('relationship-edit-saved', {
        bubbles: true,
        composed: true,
        detail: { guardianRelationshipId, name },
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
