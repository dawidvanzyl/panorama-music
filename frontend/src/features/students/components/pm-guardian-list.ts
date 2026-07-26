import type { GuardianInput, GuardianRelationship, GuardianResult } from '../services/guardians';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      font-family: 'Inter', system-ui, sans-serif;
    }
    :host([hidden]) {
      display: none;
    }
    .guardian-list__scroll {
      flex: 1;
      min-height: 0;
      overflow: auto;
    }
    table {
      width: 100%;
      min-width: 960px;
      table-layout: fixed;
      border-collapse: collapse;
    }
    .guardian-list__col-relationship {
      width: 130px;
    }
    .guardian-list__col-cell {
      width: 110px;
    }
    .guardian-list__col-checkbox-correspondance {
      width: 150px;
    }
    .guardian-list__col-checkbox-payment {
      width: 120px;
    }
    .guardian-list__col-checkbox-married {
      width: 92px;
    }
    .guardian-list__col-actions {
      width: 150px;
    }
    th, td {
      text-align: left;
      padding: 8px 10px;
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
    .guardian-list__actions {
      text-align: right;
      white-space: nowrap;
    }
    .guardian-list__btn {
      background: transparent;
      border: 1px solid currentColor;
      font-size: 12px;
      cursor: pointer;
      padding: 4px 8px;
      border-radius: var(--pm-radius);
    }
    .guardian-list__btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .guardian-list__btn--edit {
      color: var(--pm-accent);
    }
    .guardian-list__btn--edit:hover:not(:disabled) {
      background: rgba(79, 124, 255, 0.1);
    }
    .guardian-list__btn--delete {
      border: none;
      background: var(--pm-danger, #e05252);
      color: #fff;
    }
    .guardian-list__btn--delete:hover:not(:disabled) {
      opacity: 0.85;
    }
    .guardian-list__btn--change {
      border: none;
      color: var(--pm-accent);
    }
    .guardian-list__btn--change:hover:not(:disabled) {
      background: rgba(79, 124, 255, 0.1);
    }
    .guardian-list__btn--remove {
      border: none;
      color: var(--pm-danger, #e05252);
    }
    .guardian-list__btn--remove:hover:not(:disabled) {
      background: rgba(224, 82, 82, 0.1);
    }
    .guardian-list__btn--cancel {
      color: var(--pm-text);
    }
    .guardian-list__btn--cancel:hover {
      background: var(--pm-surface-2);
    }
    .guardian-list__btn--save {
      border: none;
      background: var(--pm-accent);
      color: #fff;
    }
    .guardian-list__btn--save:hover {
      opacity: 0.85;
    }
    .guardian-list__actions .guardian-list__btn + .guardian-list__btn {
      margin-left: 8px;
    }
    .guardian-list__readonly-tag {
      font-size: 11px;
      color: var(--pm-text-muted);
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .guardian-list__empty {
      color: var(--pm-text-muted);
      font-size: 13px;
    }
    .guardian-list__edit-name {
      display: flex;
      gap: 6px;
    }
    .guardian-list__edit-input {
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
    .guardian-list__edit-checkbox {
      width: 16px;
      height: 16px;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="guardian-list__scroll">
    <table>
      <colgroup>
        <col />
        <col class="guardian-list__col-relationship" />
        <col class="guardian-list__col-cell" />
        <col />
        <col class="guardian-list__col-checkbox-correspondance" />
        <col class="guardian-list__col-checkbox-payment" />
        <col class="guardian-list__col-checkbox-married" />
        <col class="guardian-list__col-actions" />
      </colgroup>
      <thead>
        <tr>
          <th>Name</th>
          <th>Relationship</th>
          <th>Cell</th>
          <th>Email</th>
          <th>Receives Correspondence</th>
          <th>Responsible for Payment</th>
          <th>Married</th>
          <th class="guardian-list__actions">Actions</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <p class="guardian-list__empty" id="empty" hidden>No guardians linked.</p>
  </div>
`;

export type GuardianListItem = GuardianResult & { readOnly?: boolean };

interface EditRowInputs {
  firstNameInput: HTMLInputElement;
  surnameInput: HTMLInputElement;
  relationshipSelect: HTMLSelectElement;
  cellInput: HTMLInputElement;
  emailInput: HTMLInputElement;
  receivesCorrespondenceInput: HTMLInputElement;
  responsibleForPaymentInput: HTMLInputElement;
  marriedInput: HTMLInputElement;
}

export class PmGuardianList extends HTMLElement {
  private rowsBody: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private _guardians: GuardianListItem[] = [];
  private _relationships: GuardianRelationship[] = [];
  private _editingGuardianId: string | null = null;
  private _isPersisted = true;

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

  set guardians(value: GuardianListItem[]) {
    this._guardians = value;
    this.render();
  }

  get guardians(): GuardianListItem[] {
    return this._guardians;
  }

  set relationships(value: GuardianRelationship[]) {
    this._relationships = value;
    this.render();
  }

  /**
   * Whether these guardians are already persisted (edit mode) or only staged
   * in memory until the student is saved (create mode). Governs the entry/removal
   * button wording and style: "Edit"/"Delete" for persisted data, vs. borderless
   * "Change"/"Remove" (matching the sibling list's in-memory styling) otherwise.
   */
  set isPersisted(value: boolean) {
    this._isPersisted = value;
    this.render();
  }

  /** Exits inline row-edit mode (if any) without saving. Safe to call even when no row is being edited. */
  exitEditMode(): void {
    if (this._editingGuardianId === null) return;
    this._editingGuardianId = null;
    this.render();
  }

  private relationshipName(id: string): string {
    return this._relationships.find((r) => r.guardianRelationshipId === id)?.name ?? '—';
  }

  private render(): void {
    if (!this.rowsBody || !this.emptyMessage) return;

    this.rowsBody.innerHTML = '';
    this.emptyMessage.hidden = this._guardians.length > 0;

    for (const guardian of this._guardians) {
      const isEditing = guardian.guardianId === this._editingGuardianId;
      this.rowsBody.appendChild(isEditing ? this.buildEditableRow(guardian) : this.buildRow(guardian));
    }
  }

  private buildRow(guardian: GuardianListItem): HTMLTableRowElement {
    const row = document.createElement('tr');

    const nameCell = document.createElement('td');
    nameCell.textContent = `${guardian.firstName} ${guardian.surname}`;

    const relationshipCell = document.createElement('td');
    relationshipCell.textContent = this.relationshipName(guardian.guardianRelationshipId);

    const cellCell = document.createElement('td');
    cellCell.textContent = guardian.cell ?? '—';

    const emailCell = document.createElement('td');
    emailCell.textContent = guardian.email ?? '—';

    const receivesCorrespondenceCell = document.createElement('td');
    receivesCorrespondenceCell.textContent = guardian.receivesCorrespondence ? 'Yes' : '—';

    const responsibleForPaymentCell = document.createElement('td');
    responsibleForPaymentCell.textContent = guardian.responsibleForPayment ? 'Yes' : '—';

    const marriedCell = document.createElement('td');
    marriedCell.textContent = guardian.married ? 'Yes' : '—';

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('guardian-list__actions');

    if (guardian.readOnly) {
      const tag = document.createElement('span');
      tag.classList.add('guardian-list__readonly-tag');
      tag.textContent = 'Inherited';
      actionsCell.appendChild(tag);
    } else {
      const isAnotherRowEditing = this._editingGuardianId !== null;

      const editBtn = document.createElement('button');
      editBtn.type = 'button';
      editBtn.classList.add(
        'guardian-list__btn',
        this._isPersisted ? 'guardian-list__btn--edit' : 'guardian-list__btn--change',
      );
      editBtn.textContent = this._isPersisted ? 'Edit' : 'Change';
      editBtn.disabled = isAnotherRowEditing;
      editBtn.addEventListener('click', () => this.handleEditClicked(guardian));
      actionsCell.appendChild(editBtn);

      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.classList.add(
        'guardian-list__btn',
        this._isPersisted ? 'guardian-list__btn--delete' : 'guardian-list__btn--remove',
      );
      deleteBtn.textContent = this._isPersisted ? 'Delete' : 'Remove';
      deleteBtn.disabled = isAnotherRowEditing;
      deleteBtn.addEventListener('click', () => this.handleDelete(guardian));
      actionsCell.appendChild(deleteBtn);
    }

    row.append(
      nameCell,
      relationshipCell,
      cellCell,
      emailCell,
      receivesCorrespondenceCell,
      responsibleForPaymentCell,
      marriedCell,
      actionsCell,
    );
    return row;
  }

  private buildEditableRow(guardian: GuardianListItem): HTMLTableRowElement {
    const row = document.createElement('tr');

    const firstNameInput = document.createElement('input');
    firstNameInput.type = 'text';
    firstNameInput.classList.add('guardian-list__edit-input');
    firstNameInput.value = guardian.firstName;
    firstNameInput.required = true;

    const surnameInput = document.createElement('input');
    surnameInput.type = 'text';
    surnameInput.classList.add('guardian-list__edit-input');
    surnameInput.value = guardian.surname;
    surnameInput.required = true;

    const nameCell = document.createElement('td');
    const nameWrap = document.createElement('div');
    nameWrap.classList.add('guardian-list__edit-name');
    nameWrap.append(firstNameInput, surnameInput);
    nameCell.appendChild(nameWrap);

    const relationshipSelect = document.createElement('select');
    relationshipSelect.classList.add('guardian-list__edit-input');
    relationshipSelect.required = true;
    for (const relationship of this._relationships) {
      const option = document.createElement('option');
      option.value = relationship.guardianRelationshipId;
      option.textContent = relationship.name;
      relationshipSelect.appendChild(option);
    }
    relationshipSelect.value = guardian.guardianRelationshipId;
    const relationshipCell = document.createElement('td');
    relationshipCell.appendChild(relationshipSelect);

    const cellInput = document.createElement('input');
    cellInput.type = 'text';
    cellInput.classList.add('guardian-list__edit-input');
    cellInput.value = guardian.cell ?? '';
    const cellCell = document.createElement('td');
    cellCell.appendChild(cellInput);

    const emailInput = document.createElement('input');
    emailInput.type = 'email';
    emailInput.classList.add('guardian-list__edit-input');
    emailInput.value = guardian.email ?? '';
    const emailCell = document.createElement('td');
    emailCell.appendChild(emailInput);

    const receivesCorrespondenceInput = document.createElement('input');
    receivesCorrespondenceInput.type = 'checkbox';
    receivesCorrespondenceInput.classList.add('guardian-list__edit-checkbox');
    receivesCorrespondenceInput.checked = guardian.receivesCorrespondence;
    const receivesCorrespondenceCell = document.createElement('td');
    receivesCorrespondenceCell.appendChild(receivesCorrespondenceInput);

    const responsibleForPaymentInput = document.createElement('input');
    responsibleForPaymentInput.type = 'checkbox';
    responsibleForPaymentInput.classList.add('guardian-list__edit-checkbox');
    responsibleForPaymentInput.checked = guardian.responsibleForPayment;
    const responsibleForPaymentCell = document.createElement('td');
    responsibleForPaymentCell.appendChild(responsibleForPaymentInput);

    const marriedInput = document.createElement('input');
    marriedInput.type = 'checkbox';
    marriedInput.classList.add('guardian-list__edit-checkbox');
    marriedInput.checked = guardian.married;
    const marriedCell = document.createElement('td');
    marriedCell.appendChild(marriedInput);

    const inputs: EditRowInputs = {
      firstNameInput,
      surnameInput,
      relationshipSelect,
      cellInput,
      emailInput,
      receivesCorrespondenceInput,
      responsibleForPaymentInput,
      marriedInput,
    };

    const actionsCell = document.createElement('td');
    actionsCell.classList.add('guardian-list__actions');

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.classList.add('guardian-list__btn', 'guardian-list__btn--cancel');
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => this.handleEditCancelled());
    actionsCell.appendChild(cancelBtn);

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.classList.add('guardian-list__btn', 'guardian-list__btn--save');
    saveBtn.textContent = 'Save';
    saveBtn.addEventListener('click', () => this.handleEditSaved(guardian.guardianId, inputs));
    actionsCell.appendChild(saveBtn);

    row.append(
      nameCell,
      relationshipCell,
      cellCell,
      emailCell,
      receivesCorrespondenceCell,
      responsibleForPaymentCell,
      marriedCell,
      actionsCell,
    );
    return row;
  }

  private handleEditClicked(guardian: GuardianListItem): void {
    this._editingGuardianId = guardian.guardianId;
    this.render();
    this.dispatchEvent(new CustomEvent('guardian-edit-started', { bubbles: true, composed: true }));
  }

  private handleEditCancelled(): void {
    this._editingGuardianId = null;
    this.render();
    this.dispatchEvent(new CustomEvent('guardian-edit-cancelled', { bubbles: true, composed: true }));
  }

  private handleEditSaved(guardianId: string, inputs: EditRowInputs): void {
    const isValid = [inputs.firstNameInput, inputs.surnameInput, inputs.relationshipSelect].every((el) =>
      el.reportValidity(),
    );
    if (!isValid) return;

    const input: GuardianInput = {
      guardianRelationshipId: inputs.relationshipSelect.value,
      firstName: inputs.firstNameInput.value,
      surname: inputs.surnameInput.value,
      cell: inputs.cellInput.value || null,
      email: inputs.emailInput.value || null,
      receivesCorrespondence: inputs.receivesCorrespondenceInput.checked,
      responsibleForPayment: inputs.responsibleForPaymentInput.checked,
      married: inputs.marriedInput.checked,
    };

    this.dispatchEvent(
      new CustomEvent('guardian-edit-saved', {
        bubbles: true,
        composed: true,
        detail: { guardianId, input },
      }),
    );
  }

  private handleDelete(guardian: GuardianResult): void {
    this.dispatchEvent(
      new CustomEvent('guardian-delete-clicked', {
        bubbles: true,
        composed: true,
        detail: { guardian },
      }),
    );
  }
}

customElements.define('pm-guardian-list', PmGuardianList);
