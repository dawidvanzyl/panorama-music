import './pm-guardian-form';
import './pm-guardian-list';
import type { GuardianInput, GuardianRelationship, GuardianResult } from '../services/guardians';
import type { PmGuardianForm } from './pm-guardian-form';
import type { PmGuardianList } from './pm-guardian-list';

type Mode = 'inactive' | 'create' | 'edit';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      min-height: 0;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .guardians-step__placeholder {
      color: var(--pm-text-muted);
      font-size: 14px;
    }
    .guardians-step__section {
      display: none;
      flex-direction: column;
      gap: 16px;
    }
    .guardians-step__section--visible {
      display: flex;
      flex: 1;
      min-height: 0;
    }
    .guardians-step__toolbar {
      display: flex;
      flex-shrink: 0;
      gap: 12px;
      justify-content: flex-end;
    }
    .guardians-step__btn {
      height: 36px;
      padding: 0 16px;
      border-radius: var(--pm-radius);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: 1px solid var(--pm-border);
      background: transparent;
      color: var(--pm-text);
    }
    .guardians-step__btn--primary {
      border: none;
      background: var(--pm-accent);
      color: #fff;
    }
    .guardians-step__btn:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .guardians-step__form-panel {
      flex-shrink: 0;
      max-height: 0;
      overflow: hidden;
      transition: max-height 220ms ease;
    }
    .guardians-step__form-panel--expanded {
      /* No reliable way to transition to true "auto" height in this nested
         flex-column context (the grid 0fr/1fr trick collapses to 0 here
         since the flex item's own height is also content-dependent), so
         this is a generous fixed ceiling comfortably above the form's
         actual content height. */
      max-height: 520px;
    }
    .guardians-step__form-panel pm-guardian-form {
      display: block;
      padding-top: 12px;
    }
    pm-guardian-list#guardianList {
      flex: 1;
      min-height: 0;
    }
    .guardians-step__message {
      flex-shrink: 0;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      font-size: 13px;
      display: none;
    }
    .guardians-step__message--error {
      display: block;
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <p class="guardians-step__placeholder" id="placeholder" hidden></p>
  <div class="guardians-step__section" id="section">
    <div class="guardians-step__message" id="message"></div>
    <div class="guardians-step__toolbar" id="listToolbar">
      <button type="button" class="guardians-step__btn" id="syncBtn" hidden>Sync Guardians</button>
      <button type="button" class="guardians-step__btn guardians-step__btn--primary" id="addBtn">Add Guardian</button>
    </div>
    <div class="guardians-step__form-panel" id="formPanel">
      <pm-guardian-form id="guardianForm"></pm-guardian-form>
    </div>
    <pm-guardian-list id="guardianList"></pm-guardian-list>
  </div>
`;

export class PmGuardiansStep extends HTMLElement {
  private placeholder: HTMLElement | null = null;
  private section: HTMLElement | null = null;
  private listToolbar: HTMLElement | null = null;
  private syncBtn: HTMLButtonElement | null = null;
  private addBtn: HTMLButtonElement | null = null;
  private formPanel: HTMLElement | null = null;
  private message: HTMLElement | null = null;
  private guardianList: PmGuardianList | null = null;
  private guardianForm: PmGuardianForm | null = null;

  private _mode: Mode = 'inactive';
  private _studentId: string | null = null;
  private _inheritedGuardians: GuardianResult[] = [];
  private _pendingGuardians: GuardianResult[] = [];
  private _pendingCounter = 0;
  private _hasMissingSiblingGuardians = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.placeholder = this.shadowRoot!.getElementById('placeholder') as HTMLElement;
    this.section = this.shadowRoot!.getElementById('section') as HTMLElement;
    this.listToolbar = this.shadowRoot!.getElementById('listToolbar') as HTMLElement;
    this.syncBtn = this.shadowRoot!.getElementById('syncBtn') as HTMLButtonElement;
    this.addBtn = this.shadowRoot!.getElementById('addBtn') as HTMLButtonElement;
    this.formPanel = this.shadowRoot!.getElementById('formPanel') as HTMLElement;
    this.message = this.shadowRoot!.getElementById('message') as HTMLElement;
    this.guardianList = this.shadowRoot!.getElementById('guardianList') as unknown as PmGuardianList;
    this.guardianForm = this.shadowRoot!.getElementById('guardianForm') as unknown as PmGuardianForm;

    this.formPanel.setAttribute('inert', '');

    this.addBtn.addEventListener('click', this.handleAddClicked);
    this.syncBtn.addEventListener('click', this.handleSyncClicked);
    this.shadowRoot!.addEventListener('guardian-edit-started', this.handleEditStarted);
    this.shadowRoot!.addEventListener('guardian-edit-cancelled', this.handleEditCancelled);
    this.shadowRoot!.addEventListener('guardian-edit-saved', this.handleEditSaved);
    this.shadowRoot!.addEventListener('guardian-delete-clicked', this.handleDeleteClicked);
    this.shadowRoot!.addEventListener('guardian-form-submitted', this.handleFormSubmitted);
    this.shadowRoot!.addEventListener('guardian-form-cancelled', this.handleFormCancelled);
  }

  disconnectedCallback(): void {
    this.addBtn?.removeEventListener('click', this.handleAddClicked);
    this.syncBtn?.removeEventListener('click', this.handleSyncClicked);
    this.shadowRoot!.removeEventListener('guardian-edit-started', this.handleEditStarted);
    this.shadowRoot!.removeEventListener('guardian-edit-cancelled', this.handleEditCancelled);
    this.shadowRoot!.removeEventListener('guardian-edit-saved', this.handleEditSaved);
    this.shadowRoot!.removeEventListener('guardian-delete-clicked', this.handleDeleteClicked);
    this.shadowRoot!.removeEventListener('guardian-form-submitted', this.handleFormSubmitted);
    this.shadowRoot!.removeEventListener('guardian-form-cancelled', this.handleFormCancelled);
  }

  set relationships(value: GuardianRelationship[]) {
    this.guardianList!.relationships = value;
    this.guardianForm!.relationships = value;
  }

  /**
   * Create mode: the student doesn't have an id yet. The selected siblings'
   * guardians are populated separately via `setInheritedGuardians` once known
   * (read-only rows, inherited on Save); any guardian added here is staged
   * locally as an editable/removable draft until Save. Both are rendered in
   * the same list, inherited rows first, distinguished only by an "Inherited"
   * tag replacing their Edit/Delete actions.
   */
  activateForCreate(): void {
    this._mode = 'create';
    this._studentId = null;
    this._inheritedGuardians = [];
    this._pendingGuardians = [];
    this._pendingCounter = 0;
    this.clearError();
    this._hasMissingSiblingGuardians = false;
    this.guardianList!.isPersisted = false;
    this.showListView();
    this.renderGuardianList();
    this.syncBtn!.hidden = true;

    this.placeholder!.hidden = true;
    this.section!.classList.add('guardians-step__section--visible');
  }

  /** Read-only rows for the currently-staged siblings' guardians (create mode only). */
  setInheritedGuardians(guardians: GuardianResult[]): void {
    if (this._mode !== 'create') return;

    this._inheritedGuardians = guardians;
    this.renderGuardianList();
  }

  /** Edit mode: guardian management for an existing student. */
  activate(studentId: string): void {
    this._mode = 'edit';
    this._studentId = studentId;
    this.clearError();
    this._hasMissingSiblingGuardians = false;
    this.guardianList!.isPersisted = true;
    this.showListView();

    this.guardianList!.guardians = [];
    this.syncBtn!.hidden = true;

    this.placeholder!.hidden = true;
    this.section!.classList.add('guardians-step__section--visible');
  }

  /**
   * Guardians currently linked to the student (edit mode), pushed in by the
   * page after a fetch. Data-only — does not touch the form panel. Tab
   * activation refreshes this in the background, and a mutation's own
   * refresh can race with it, so collapsing the panel here would risk
   * closing a form the user just opened while a slower, unrelated fetch was
   * still in flight. The page calls `closeForm()` explicitly once a
   * mutation it initiated actually completes.
   */
  set guardians(value: GuardianResult[]) {
    this.guardianList!.guardians = value;
  }

  /** Renders inherited (read-only) and pending (editable) guardians as a single merged list (create mode). */
  private renderGuardianList(): void {
    const inherited = this._inheritedGuardians.map((g) => ({ ...g, readOnly: true }));
    const pending = this._pendingGuardians.map((g) => ({ ...g, readOnly: false }));
    this.guardianList!.guardians = [...inherited, ...pending];
  }

  /** Collapses the form panel (if open) and returns to the list view. Safe to call even when no form is open. */
  closeForm(): void {
    this.showListView();
  }

  /** Guardians staged during create mode, to be created and linked once the student is saved. */
  get pendingGuardians(): GuardianInput[] {
    return this._pendingGuardians.map((g) => this.toInput(g));
  }

  /** Whether a Sync Guardians button should be shown (student missing a sibling-group guardian). */
  set hasMissingSiblingGuardians(value: boolean) {
    this._hasMissingSiblingGuardians = value;
    this.updateSyncBtnVisibility();
  }

  showError(message: string): void {
    this.message!.textContent = message;
    this.message!.classList.add('guardians-step__message--error');
  }

  clearError(): void {
    this.message!.textContent = '';
    this.message!.className = 'guardians-step__message';
  }

  /** Collapses the form panel, exits any inline row edit, and restores the toolbar/list to their normal visible state. */
  private showListView(): void {
    this.collapseFormPanelOnly();
    this.addBtn!.hidden = false;
    this.updateSyncBtnVisibility();
    this.guardianList!.exitEditMode();
    this.listToolbar!.hidden = false;
    this.guardianList!.hidden = false;
  }

  /** Expands the form panel under the toolbar while the guardian list stays visible. */
  private expandFormPanel(): void {
    this.formPanel!.classList.add('guardians-step__form-panel--expanded');
    this.formPanel!.removeAttribute('inert');
    this.hideToolbarButtons();
  }

  private collapseFormPanelOnly(): void {
    this.formPanel!.classList.remove('guardians-step__form-panel--expanded');
    this.formPanel!.setAttribute('inert', '');
  }

  /** Hides Add Guardian and (if it would otherwise be shown) Sync Guardians, for whichever editing surface is active. */
  private hideToolbarButtons(): void {
    this.addBtn!.hidden = true;
    this.syncBtn!.hidden = true;
  }

  /** Restores the Sync Guardians button to its proper visibility (edit mode with a missing sibling-group guardian only). */
  private updateSyncBtnVisibility(): void {
    this.syncBtn!.hidden = this._mode !== 'edit' || !this._hasMissingSiblingGuardians;
  }

  private handleAddClicked = (): void => {
    this.guardianForm!.resetForAdd();
    this.expandFormPanel();
  };

  private handleEditStarted = (): void => {
    // A row edit and the Add form are mutually exclusive; closing the form here is a no-op if it wasn't open.
    this.collapseFormPanelOnly();
    this.hideToolbarButtons();
  };

  private handleEditCancelled = (): void => {
    this.showListView();
  };

  private handleEditSaved = (event: Event): void => {
    const { guardianId, input } = (event as CustomEvent<{ guardianId: string; input: GuardianInput }>).detail;

    if (this._mode === 'create') {
      this.updatePendingGuardian(guardianId, input);
      this.showListView();
      this.renderGuardianList();
      return;
    }

    this.dispatchEvent(
      new CustomEvent('guardian-update-requested', { bubbles: true, composed: true, detail: { guardianId, input } }),
    );
  };

  private handleDeleteClicked = (event: Event): void => {
    const { guardian } = (event as CustomEvent<{ guardian: GuardianResult }>).detail;

    if (this._mode === 'create') {
      this._pendingGuardians = this._pendingGuardians.filter((g) => g.guardianId !== guardian.guardianId);
      this.renderGuardianList();
      return;
    }

    this.dispatchEvent(
      new CustomEvent('guardian-delete-requested', {
        bubbles: true,
        composed: true,
        detail: { studentId: this._studentId, guardian },
      }),
    );
  };

  /** The shared form panel is Add-only now — editing happens inline on the guardian table row. */
  private handleFormSubmitted = (event: Event): void => {
    const { input } = (event as CustomEvent<{ input: GuardianInput }>).detail;

    if (this._mode === 'create') {
      this.addPendingGuardian(input);
      this.showListView();
      this.renderGuardianList();
      return;
    }

    this.dispatchEvent(
      new CustomEvent('guardian-add-requested', {
        bubbles: true,
        composed: true,
        detail: { studentId: this._studentId, input },
      }),
    );
  };

  private handleFormCancelled = (): void => {
    this.showListView();
  };

  private handleSyncClicked = (): void => {
    this.dispatchEvent(
      new CustomEvent('guardians-sync-requested', {
        bubbles: true,
        composed: true,
        detail: { studentId: this._studentId },
      }),
    );
  };

  private addPendingGuardian(input: GuardianInput): void {
    this._pendingCounter += 1;
    this._pendingGuardians.push({ guardianId: `pending-${this._pendingCounter}`, ...input });
  }

  private updatePendingGuardian(guardianId: string, input: GuardianInput): void {
    const index = this._pendingGuardians.findIndex((g) => g.guardianId === guardianId);
    if (index === -1) return;

    this._pendingGuardians[index] = { guardianId, ...input };
  }

  private toInput(guardian: GuardianResult): GuardianInput {
    return {
      guardianRelationshipId: guardian.guardianRelationshipId,
      firstName: guardian.firstName,
      surname: guardian.surname,
      cell: guardian.cell,
      email: guardian.email,
      receivesCorrespondence: guardian.receivesCorrespondence,
      responsibleForPayment: guardian.responsibleForPayment,
      married: guardian.married,
    };
  }
}

customElements.define('pm-guardians-step', PmGuardiansStep);
