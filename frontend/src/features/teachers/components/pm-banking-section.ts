import { hasRole } from '../../../services/token-storage';
import { ACCOUNT_TYPE_LABELS, BANK_LABELS, maskAccountNumber } from '../services/banking-display';
import type { Bank, BankAccountType, BankingDetails, BankingDetailsInput, TeacherResult } from '../services/teachers';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .banking__card {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 24px;
      margin-top: 24px;
    }
    /* On a teacher's own record the section is already inside a dialog, so a
       second card around it would be a box in a box. A rule separates it from
       the profile above instead. */
    .banking__card--flush {
      background: none;
      border: none;
      border-top: 1px solid var(--pm-border);
      border-radius: 0;
      padding: 24px 0 0;
    }
    .banking__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      margin-bottom: 4px;
    }
    .banking__title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--pm-text);
    }
    .banking__caption {
      margin: 0 0 16px;
      font-size: 13px;
      color: var(--pm-text-muted);
    }
    .banking__actions {
      display: flex;
      gap: 8px;
    }
    .banking__btn {
      border-radius: var(--pm-radius);
      font-size: 13px;
      font-weight: 600;
      padding: 6px 16px;
      cursor: pointer;
      background: transparent;
      border: 1px solid var(--pm-accent);
      color: var(--pm-accent);
    }
    /* Filled red with white text, the same destructive treatment the delete and
       unlink confirmations use — a delete should read the same wherever it is. */
    .banking__btn--danger {
      background: var(--pm-danger, #e05252);
      border-color: var(--pm-danger, #e05252);
      color: #fff;
    }
    .banking__btn--danger:hover {
      opacity: 0.9;
    }
    .banking__btn--primary {
      background: var(--pm-accent);
      border-color: var(--pm-accent);
      color: #fff;
    }
    .banking__btn--ghost {
      border-color: var(--pm-border);
      color: var(--pm-text-muted);
    }
    .banking__read-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .banking__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 14px;
    }
    .banking__field-label {
      font-size: 13px;
      color: var(--pm-text-muted);
    }
    .banking__field-value {
      color: var(--pm-text);
    }
    /* The account number gets its own panel below the other fields rather than a
       cell alongside them: it is the value the whole section exists to protect,
       and the reveal action belongs next to it. */
    .banking__account-panel {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;
      flex-wrap: wrap;
      margin-top: 20px;
      padding: 16px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
    }
    .banking__account-number {
      font-size: 16px;
      color: var(--pm-text);
      font-variant-numeric: tabular-nums;
      letter-spacing: 0.06em;
    }
    .banking__account-actions {
      display: flex;
      gap: 8px;
    }
    /* Same icon treatment as the header's link/unlink actions. */
    .banking__btn--icon {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .banking__btn-icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 18px;
    }
    .banking__note {
      margin: 16px 0 0;
      font-size: 12px;
      color: var(--pm-text-muted);
    }
    .banking__empty {
      margin: 0 0 16px;
      font-size: 14px;
      color: var(--pm-text-muted);
    }
    .banking__form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .banking__form-field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    label {
      font-size: 13px;
      font-weight: 600;
      color: var(--pm-text);
    }
    input,
    select {
      box-sizing: border-box;
      width: 100%;
      padding: 9px 12px;
      border-radius: var(--pm-radius);
      border: 1px solid var(--pm-border);
      background: var(--pm-surface-2);
      color: var(--pm-text);
      font-size: 14px;
      font-family: inherit;
    }
    .banking__hint {
      font-size: 12px;
      color: var(--pm-text-muted);
    }
    .banking__hint--error {
      color: var(--pm-danger, #e05252);
    }
    .banking__error {
      margin-top: 8px;
      font-size: 13px;
      color: var(--pm-danger, #e05252);
      min-height: 18px;
    }
    .banking__form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
      /* The error line above already reserves its own height, so the actions
         only need enough of a gap to read as a separate row. */
      margin-top: 8px;
    }
    [hidden] {
      display: none !important;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="banking__card" id="card">
    <div class="banking__header">
      <h2 class="banking__title">Banking details</h2>
      <div class="banking__actions" id="readActions">
        <button type="button" class="banking__btn" id="editBtn">Edit</button>
        <button type="button" class="banking__btn banking__btn--danger" id="deleteBtn">Delete</button>
      </div>
    </div>
    <p class="banking__caption" id="caption"></p>

    <div id="readView">
      <div class="banking__read-grid">
        <div class="banking__field">
          <span class="banking__field-label">Bank</span>
          <span class="banking__field-value" id="bankValue"></span>
        </div>
        <div class="banking__field">
          <span class="banking__field-label">Account type</span>
          <span class="banking__field-value" id="accountTypeValue"></span>
        </div>
        <div class="banking__field">
          <span class="banking__field-label">Branch code</span>
          <span class="banking__field-value" id="branchCodeValue"></span>
        </div>
      </div>
      <div class="banking__account-panel">
        <div class="banking__field">
          <span class="banking__field-label">Account number</span>
          <span class="banking__account-number" id="accountNumberValue"></span>
        </div>
        <div class="banking__account-actions">
          <button type="button" class="banking__btn banking__btn--icon" id="revealBtn">
            <span class="banking__btn-icon" aria-hidden="true" id="revealIcon">visibility</span>
            <span id="revealLabel">Reveal</span>
          </button>
          <button type="button" class="banking__btn banking__btn--icon" id="activityBtn" hidden>
            <span class="banking__btn-icon" aria-hidden="true">receipt_long</span>
            <span>Activity</span>
          </button>
        </div>
      </div>
      <p class="banking__note" id="revealNote"></p>
    </div>

    <div id="emptyView" hidden>
      <p class="banking__empty">No banking details captured.</p>
      <button type="button" class="banking__btn" id="addBtn">Add banking details</button>
    </div>

    <form id="formView" hidden>
      <div class="banking__form-grid">
        <div class="banking__form-field">
          <label for="bankInput">Bank</label>
          <select id="bankInput">
            <option value="">Select a bank&hellip;</option>
          </select>
        </div>
        <div class="banking__form-field">
          <label for="accountTypeInput">Account type</label>
          <select id="accountTypeInput">
            <option value="">Select an account type&hellip;</option>
          </select>
        </div>
        <div class="banking__form-field">
          <label for="accountNumberInput">Account number</label>
          <input id="accountNumberInput" type="text" inputmode="numeric" autocomplete="off" />
          <span class="banking__hint" id="accountHint"></span>
        </div>
        <div class="banking__form-field">
          <label for="branchCodeInput">Branch code</label>
          <input id="branchCodeInput" type="text" inputmode="numeric" autocomplete="off" />
          <span class="banking__hint" id="branchHint" hidden>Branch code must be 6 digits</span>
        </div>
      </div>
      <p class="banking__note">
        The account number is encrypted before it is stored and is never written to logs or audit entries &mdash; only its last four digits are.
      </p>
      <div class="banking__error" id="formError"></div>
      <div class="banking__form-actions">
        <button type="button" class="banking__btn banking__btn--ghost" id="cancelBtn">Cancel</button>
        <button type="submit" class="banking__btn banking__btn--primary" id="submitBtn">Save banking details</button>
      </div>
    </form>
  </div>
`;

const MAINTAINER_REVEAL_NOTE =
  'Revealing the full number calls the reveal endpoint and writes an audit entry against your account.';
const RESTRICTED_REVEAL_NOTE =
  'Your role can see the masked value only. Revealing the full number is restricted to a BankingCoordinator or the linked teacher.';

const MAINTAINER_CAPTION = 'Encrypted at rest · deleted when this teacher is deactivated';
const SELF_SERVICE_CAPTION = 'Encrypted at rest · deleted if your record is deactivated';

/**
 * How long a revealed account number stays on screen. An unattended screen is
 * the exposure the masking exists to prevent, so the reveal expires on its own
 * rather than relying on whoever revealed it to hide it again.
 */
const REVEAL_TIMEOUT_MS = 15_000;

const CREATE_ACCOUNT_HINT =
  'Digits only. Stored encrypted; only the last four digits are kept in the clear for masked display.';
const EDIT_ACCOUNT_HINT =
  'The stored number cannot be read back into this field. Leave it blank to keep it, or type a new number to replace it.';
const ACCOUNT_LENGTH_ERROR = 'Enter an account number of 6 to 12 digits.';

/**
 * The banking details on a teacher record: masked read view, empty state, the
 * capture/edit form and the reveal action.
 *
 * The section is rendered for every teacher regardless of employment
 * classification — banking details are optional for all of them, and hiding the
 * section for some would misrepresent "none captured" as "not applicable".
 *
 * Which actions appear is decided by role here, but that is presentation only:
 * the endpoints enforce the same rules, and this component never treats a
 * hidden control as a security boundary.
 *
 * The `self-service` attribute puts the section on a teacher's own record rather
 * than on a BankingCoordinator's view of somebody else's. The details, the form and the
 * masking are identical — what changes is that the caller manages them because
 * they own them rather than because of a role, that the caption addresses them
 * directly, and that the activity action lives here, since the own-record view
 * has no page header to carry it.
 */
export class PmBankingSection extends HTMLElement {
  private _teacher: TeacherResult | null = null;
  private mode: 'read' | 'create' | 'edit' = 'read';
  private revealedNumber: string | null = null;
  private revealTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.populateOptions();

    this.byId<HTMLButtonElement>('addBtn').addEventListener('click', this.handleAdd);
    this.byId<HTMLButtonElement>('editBtn').addEventListener('click', this.handleEdit);
    this.byId<HTMLButtonElement>('deleteBtn').addEventListener('click', this.handleDelete);
    this.byId<HTMLButtonElement>('revealBtn').addEventListener('click', this.handleRevealToggle);
    this.byId<HTMLButtonElement>('activityBtn').addEventListener('click', this.handleActivity);
    this.byId<HTMLButtonElement>('cancelBtn').addEventListener('click', this.handleCancel);
    this.byId<HTMLFormElement>('formView').addEventListener('submit', this.handleSubmit);

    this.render();
  }

  disconnectedCallback(): void {
    this.byId<HTMLButtonElement>('addBtn').removeEventListener('click', this.handleAdd);
    this.byId<HTMLButtonElement>('editBtn').removeEventListener('click', this.handleEdit);
    this.byId<HTMLButtonElement>('deleteBtn').removeEventListener('click', this.handleDelete);
    this.byId<HTMLButtonElement>('revealBtn').removeEventListener('click', this.handleRevealToggle);
    this.byId<HTMLButtonElement>('activityBtn').removeEventListener('click', this.handleActivity);
    this.byId<HTMLButtonElement>('cancelBtn').removeEventListener('click', this.handleCancel);
    this.byId<HTMLFormElement>('formView').removeEventListener('submit', this.handleSubmit);
    this.clearReveal();
  }

  /**
   * The page reassigns the teacher whenever anything about the record changes,
   * including edits that have nothing to do with banking — toggling the
   * employment classification, linking an account. Resetting unconditionally
   * threw away an open banking form and a revealed number on each of those, so
   * the reset is scoped to an actual change of teacher: a different record must
   * never keep the previous one's form input or revealed number, and the same
   * record has no reason to lose either.
   */
  set teacher(value: TeacherResult) {
    const changedTeacher = this._teacher?.teacherId !== value.teacherId;
    // A revealed number belongs to one specific set of details. If those are
    // deleted or replaced, it is stale — and being the most sensitive value the
    // application holds, it goes immediately rather than lingering behind a
    // hidden view with its timer still running.
    const changedRecord = this._teacher?.banking?.accountNumberLast4 !== value.banking?.accountNumberLast4;
    // An edit form over a record that has since been deleted would save into
    // nothing, so it closes with the record.
    const removedRecord = this._teacher?.banking != null && value.banking === null;

    this._teacher = value;

    if (changedTeacher || changedRecord) this.clearReveal();
    if (changedTeacher || removedRecord) this.mode = 'read';

    this.render();
  }

  get teacher(): TeacherResult | null {
    return this._teacher;
  }

  /**
   * Shows the full number just returned by the reveal endpoint, and starts the
   * clock that takes it away again.
   */
  showRevealed(accountNumber: string): void {
    this.clearReveal();
    this.revealedNumber = accountNumber;
    this.revealTimer = setTimeout(() => {
      this.clearReveal();
      this.render();
    }, REVEAL_TIMEOUT_MS);
    this.render();
  }

  closeForm(): void {
    this.mode = 'read';
    this.render();
  }

  showFormError(message: string): void {
    this.byId<HTMLElement>('formError').textContent = message;
  }

  /**
   * On a teacher's own record the right to manage comes from owning it, not
   * from a role — a linked teacher is not thereby a BankingCoordinator.
   */
  private get selfService(): boolean {
    return this.hasAttribute('self-service');
  }

  private get canManage(): boolean {
    return this.selfService || hasRole('BankingCoordinator');
  }

  private get banking(): BankingDetails | null {
    return this._teacher?.banking ?? null;
  }

  private populateOptions(): void {
    const bankInput = this.byId<HTMLSelectElement>('bankInput');
    for (const [value, label] of Object.entries(BANK_LABELS)) {
      bankInput.appendChild(new Option(label, value));
    }

    const accountTypeInput = this.byId<HTMLSelectElement>('accountTypeInput');
    for (const [value, label] of Object.entries(ACCOUNT_TYPE_LABELS)) {
      accountTypeInput.appendChild(new Option(label, value));
    }
  }

  private render(): void {
    if (!this.shadowRoot!.getElementById('readView')) return;

    const banking = this.banking;
    const editing = this.mode !== 'read';

    this.byId<HTMLElement>('readView').hidden = editing || banking === null;
    this.byId<HTMLElement>('emptyView').hidden = editing || banking !== null;
    this.byId<HTMLElement>('formView').hidden = !editing;

    this.byId<HTMLElement>('readActions').hidden = editing || banking === null || !this.canManage;
    // Capturing details for a deactivated teacher would create a record that
    // deactivation is supposed to have removed, so the add action goes with the
    // teacher's active state. Editing and revealing existing details do not —
    // a deactivated teacher's captured details stay readable until they are
    // deleted.
    this.byId<HTMLElement>('addBtn').hidden = !this.canManage || this._teacher?.isActive !== true;
    this.byId<HTMLButtonElement>('revealBtn').hidden = !this.canManage;
    // The activity view is reached from the page header on a teacher record;
    // the own-record view has no header, so the action rides with the number.
    this.byId<HTMLButtonElement>('activityBtn').hidden = !this.selfService;

    this.byId<HTMLElement>('card').classList.toggle('banking__card--flush', this.selfService);
    this.byId<HTMLElement>('caption').textContent = this.selfService ? SELF_SERVICE_CAPTION : MAINTAINER_CAPTION;

    // The note explains a restriction, so it is only worth showing to somebody
    // restricted. A teacher looking at their own details is told nothing they
    // did not already choose by clicking Reveal.
    this.byId<HTMLElement>('revealNote').hidden = this.selfService;
    this.byId<HTMLElement>('revealNote').textContent = this.canManage ? MAINTAINER_REVEAL_NOTE : RESTRICTED_REVEAL_NOTE;

    if (banking) {
      this.byId<HTMLElement>('bankValue').textContent = BANK_LABELS[banking.bank] ?? banking.bank;
      this.byId<HTMLElement>('accountTypeValue').textContent =
        ACCOUNT_TYPE_LABELS[banking.accountType] ?? banking.accountType;
      this.byId<HTMLElement>('branchCodeValue').textContent = banking.branchCode;
      this.byId<HTMLElement>('accountNumberValue').textContent =
        this.revealedNumber ?? maskAccountNumber(banking.accountNumberLast4);
      this.byId<HTMLElement>('revealLabel').textContent = this.revealedNumber ? 'Hide' : 'Reveal';
      this.byId<HTMLElement>('revealIcon').textContent = this.revealedNumber ? 'visibility_off' : 'visibility';
    }

    if (editing) {
      const creating = this.mode === 'create';
      this.byId<HTMLElement>('accountHint').textContent = creating ? CREATE_ACCOUNT_HINT : EDIT_ACCOUNT_HINT;
      this.byId<HTMLButtonElement>('submitBtn').textContent = creating ? 'Save banking details' : 'Save changes';
      this.byId<HTMLInputElement>('accountNumberInput').placeholder = creating
        ? '6 to 12 digits'
        : 'Leave blank to keep the stored number';
    }
  }

  private handleAdd = (): void => {
    this.openForm('create');
  };

  private handleEdit = (): void => {
    this.openForm('edit');
  };

  /**
   * The stored number is never loaded into the form — it cannot be read back
   * without a reveal, and prefilling it would turn every edit into one.
   */
  private openForm(mode: 'create' | 'edit'): void {
    const banking = this.banking;
    this.mode = mode;
    this.clearReveal();

    this.byId<HTMLSelectElement>('bankInput').value = mode === 'edit' && banking ? banking.bank : '';
    this.byId<HTMLSelectElement>('accountTypeInput').value = mode === 'edit' && banking ? banking.accountType : '';
    this.byId<HTMLInputElement>('branchCodeInput').value = mode === 'edit' && banking ? banking.branchCode : '';
    this.byId<HTMLInputElement>('accountNumberInput').value = '';
    this.byId<HTMLElement>('formError').textContent = '';
    this.byId<HTMLElement>('branchHint').hidden = true;
    this.byId<HTMLElement>('accountHint').classList.remove('banking__hint--error');

    this.render();
  }

  private handleCancel = (): void => {
    this.closeForm();
  };

  private handleDelete = (): void => {
    this.dispatchEvent(
      new CustomEvent('teacher-banking-delete-requested', {
        bubbles: true,
        composed: true,
        detail: { teacherId: this._teacher!.teacherId, accountNumberLast4: this.banking?.accountNumberLast4 ?? '' },
      }),
    );
  };

  private handleActivity = (): void => {
    this.dispatchEvent(
      new CustomEvent('teacher-banking-activity-requested', {
        bubbles: true,
        composed: true,
        detail: { teacherId: this._teacher!.teacherId },
      }),
    );
  };

  /**
   * Hiding is local, revealing is not: showing the number again after it has
   * been hidden goes back to the endpoint, so every look at it is audited
   * rather than only the first.
   */
  private handleRevealToggle = (): void => {
    if (this.revealedNumber) {
      this.clearReveal();
      this.render();
      return;
    }

    this.dispatchEvent(
      new CustomEvent('teacher-banking-reveal-requested', {
        bubbles: true,
        composed: true,
        detail: { teacherId: this._teacher!.teacherId },
      }),
    );
  };

  private handleSubmit = (event: Event): void => {
    event.preventDefault();

    const bank = this.byId<HTMLSelectElement>('bankInput').value as Bank | '';
    const accountType = this.byId<HTMLSelectElement>('accountTypeInput').value as BankAccountType | '';
    const branchCode = this.byId<HTMLInputElement>('branchCodeInput').value.replace(/\s/g, '');
    const accountNumber = this.byId<HTMLInputElement>('accountNumberInput').value.replace(/\D/g, '');

    const branchCodeValid = /^\d{6}$/.test(branchCode);
    // On an edit, an empty account number means "keep the stored one"; on a
    // create there is nothing to keep, so one must be supplied.
    const accountNumberOmitted = this.mode === 'edit' && accountNumber.length === 0;
    const accountNumberValid = accountNumberOmitted || (accountNumber.length >= 6 && accountNumber.length <= 12);

    this.byId<HTMLElement>('branchHint').hidden = branchCodeValid;
    this.byId<HTMLElement>('accountHint').classList.toggle('banking__hint--error', !accountNumberValid);
    if (!accountNumberValid) {
      this.byId<HTMLElement>('accountHint').textContent = ACCOUNT_LENGTH_ERROR;
    }

    if (!bank || !accountType || !branchCodeValid || !accountNumberValid) {
      this.byId<HTMLElement>('formError').textContent = 'Complete every field before saving.';
      return;
    }

    const input: BankingDetailsInput = { bank, accountType, branchCode };
    if (!accountNumberOmitted) input.accountNumber = accountNumber;

    this.dispatchEvent(
      new CustomEvent<{ teacherId: string; mode: 'create' | 'edit'; input: BankingDetailsInput }>(
        'teacher-banking-save-requested',
        {
          bubbles: true,
          composed: true,
          detail: { teacherId: this._teacher!.teacherId, mode: this.mode as 'create' | 'edit', input },
        },
      ),
    );
  };

  /**
   * Drops the revealed number and the timer together. Every path that stops
   * showing the number goes through here, so a pending timer can never outlive
   * what it was going to hide and clear a number revealed after it was set.
   */
  private clearReveal(): void {
    if (this.revealTimer !== null) {
      clearTimeout(this.revealTimer);
      this.revealTimer = null;
    }

    this.revealedNumber = null;
  }

  private byId<T extends HTMLElement>(id: string): T {
    return this.shadowRoot!.getElementById(id) as T;
  }
}

customElements.define('pm-banking-section', PmBankingSection);
