import './pm-teacher-profile-form';
import './pm-banking-section';
import './pm-linked-account-badge';
import { modalChromeStyles } from '../../../components/modal-chrome-styles';
import type { PmBankingSection } from './pm-banking-section';
import type { PmLinkedAccountBadge } from './pm-linked-account-badge';
import type { PmTeacherProfileForm } from './pm-teacher-profile-form';
import type { TeacherResult } from '../services/teachers';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    /* Wider than the shared 420px default: two side-by-side field columns plus a
       banking form need the room, and the design sets it at 620. */
    .modal__card {
      max-width: 620px;
      max-height: calc(100vh - 64px);
      overflow-y: auto;
    }
    .modal__header {
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 24px;
    }
    .my-details__heading {
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 0;
    }
    .modal__title {
      color: var(--pm-text);
    }
    .my-details__close {
      display: flex;
      padding: 4px;
      border: none;
      background: none;
      color: var(--pm-text-muted);
      cursor: pointer;
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 22px;
    }
    .my-details__section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .my-details__section-title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--pm-text);
    }
    .my-details__edit-btn {
      border: 1px solid var(--pm-accent);
      background: transparent;
      color: var(--pm-accent);
      border-radius: var(--pm-radius);
      font-size: 13px;
      font-weight: 600;
      padding: 6px 16px;
      cursor: pointer;
    }
    .my-details__read-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .my-details__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 14px;
    }
    .my-details__field-label {
      font-size: 13px;
      color: var(--pm-text-muted);
    }
    .my-details__field-value {
      color: var(--pm-text);
    }
    /* The classification reads as one more profile field, sitting under First
       name — the padlock beside its label is the whole of what says it is not
       the teacher's to change. */
    .my-details__classification {
      margin-top: 16px;
    }
    .my-details__field-label {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .my-details__lock-note {
      margin-top: 4px;
      color: var(--pm-text-muted);
      font-size: 12px;
    }
    .my-details__lock-icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-size: 16px;
      color: var(--pm-text-muted);
    }
    [hidden] {
      display: none !important;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="modal__backdrop">
    <div class="modal__card">
      <div class="modal__header">
        <div class="my-details__heading">
          <h2 class="modal__title">My details</h2>
          <pm-linked-account-badge id="accountBadge"></pm-linked-account-badge>
        </div>
        <button type="button" class="my-details__close" id="closeBtn" aria-label="Close">close</button>
      </div>

      <div class="my-details__section-header">
        <h3 class="my-details__section-title">Profile</h3>
        <button type="button" class="my-details__edit-btn" id="editBtn">Edit</button>
      </div>
      <div class="my-details__read-grid" id="readView">
        <div class="my-details__field">
          <span class="my-details__field-label">First name</span>
          <span class="my-details__field-value" id="firstName"></span>
        </div>
        <div class="my-details__field">
          <span class="my-details__field-label">Surname</span>
          <span class="my-details__field-value" id="surname"></span>
        </div>
      </div>
      <pm-teacher-profile-form id="editForm" hidden></pm-teacher-profile-form>

      <div class="my-details__read-grid my-details__classification">
        <div class="my-details__field">
          <span class="my-details__field-label">
            Employment classification
            <span class="my-details__lock-icon" aria-hidden="true" title="Locked">lock</span>
          </span>
          <span class="my-details__field-value" id="classificationValue"></span>
          <span class="my-details__lock-note" id="classificationLockNote">
            Only an Admin or Coordinator can change this classification
          </span>
        </div>
      </div>

      <pm-banking-section id="bankingSection" self-service></pm-banking-section>
    </div>
  </div>
`;

/**
 * A teacher's view of their own record: the names they may correct, the
 * classification they may only read, and their banking details, separated from
 * the profile by a rule rather than boxed off from it.
 *
 * What is absent is as deliberate as what is present. There is no account-link
 * control and no deactivate, reactivate or delete action anywhere in this view —
 * those belong to an Admin or Coordinator, and the endpoints behind them refuse
 * this caller regardless of what the interface shows.
 */
export class PmMyDetailsModal extends HTMLElement {
  private editBtn: HTMLButtonElement | null = null;
  private closeBtn: HTMLButtonElement | null = null;
  private readView: HTMLElement | null = null;
  private editForm: PmTeacherProfileForm | null = null;
  private bankingSectionEl: PmBankingSection | null = null;
  private _teacher: TeacherResult | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [modalChromeStyles, styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.editBtn = this.shadowRoot!.getElementById('editBtn') as HTMLButtonElement;
    this.closeBtn = this.shadowRoot!.getElementById('closeBtn') as HTMLButtonElement;
    this.readView = this.shadowRoot!.getElementById('readView') as HTMLElement;
    this.editForm = this.shadowRoot!.getElementById('editForm') as unknown as PmTeacherProfileForm;
    this.bankingSectionEl = this.shadowRoot!.getElementById('bankingSection') as unknown as PmBankingSection;

    this.editBtn.addEventListener('click', this.handleEditClick);
    this.closeBtn.addEventListener('click', this.handleClose);
    this.shadowRoot!.addEventListener('teacher-edit-cancelled', this.handleEditCancelled);

    this.render();
  }

  disconnectedCallback(): void {
    this.editBtn?.removeEventListener('click', this.handleEditClick);
    this.closeBtn?.removeEventListener('click', this.handleClose);
    this.shadowRoot!.removeEventListener('teacher-edit-cancelled', this.handleEditCancelled);
  }

  set teacher(value: TeacherResult) {
    this._teacher = value;
    this.render();
  }

  get teacher(): TeacherResult | null {
    return this._teacher;
  }

  /** The banking section, so the orchestrator can hand it a revealed number or a form error. */
  get bankingSection(): PmBankingSection {
    return this.bankingSectionEl!;
  }

  show(teacher: TeacherResult): void {
    this.teacher = teacher;
    this.setAttribute('open', '');
  }

  close(): void {
    this.removeAttribute('open');
    this.closeEdit();
  }

  showEditError(message: string): void {
    this.editForm!.showError(message);
  }

  closeEdit(): void {
    if (!this.readView) return;
    this.readView.hidden = false;
    this.editForm!.hidden = true;
    this.editBtn!.hidden = false;
  }

  private render(): void {
    if (!this.readView || !this._teacher) return;

    const teacher = this._teacher;
    (this.byId('accountBadge') as unknown as PmLinkedAccountBadge).email = teacher.linkedAccountEmail;
    this.byId('firstName').textContent = teacher.firstName;
    this.byId('surname').textContent = teacher.surname;
    this.byId('classificationValue').textContent = teacher.isPrivate
      ? 'Private teacher - Paid directly by parents.'
      : 'School-paid - Paid by the school.';
    this.bankingSectionEl!.teacher = teacher;
  }

  private handleEditClick = (): void => {
    if (!this._teacher) return;
    this.editForm!.populate(this._teacher);
    this.readView!.hidden = true;
    this.editForm!.hidden = false;
    // Editing is already in progress — Cancel and Save are the only exits.
    this.editBtn!.hidden = true;
  };

  private handleEditCancelled = (): void => {
    this.closeEdit();
  };

  private handleClose = (): void => {
    this.close();
  };

  private byId(id: string): HTMLElement {
    return this.shadowRoot!.getElementById(id) as HTMLElement;
  }
}

customElements.define('pm-my-details-modal', PmMyDetailsModal);
