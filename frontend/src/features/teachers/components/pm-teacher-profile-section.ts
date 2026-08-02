import './pm-teacher-profile-form';
import type { TeacherResult } from '../services/teachers';
import type { PmTeacherProfileForm } from './pm-teacher-profile-form';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
    }
    .profile-section__card {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 24px;
      margin-top: 24px;
    }
    .profile-section__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .profile-section__title {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--pm-text);
    }
    .profile-section__edit-btn {
      border: 1px solid var(--pm-accent);
      background: transparent;
      color: var(--pm-accent);
      border-radius: var(--pm-radius);
      font-size: 13px;
      font-weight: 600;
      padding: 6px 16px;
      cursor: pointer;
    }
    .profile-section__read-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .profile-section__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
      font-size: 14px;
    }
    .profile-section__field-label {
      font-size: 13px;
      color: var(--pm-text-muted);
    }
    .profile-section__field-value {
      color: var(--pm-text);
    }
    .profile-section__classification {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-top: 20px;
      padding: 16px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
    }
    .profile-section__classification-text {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }
    .profile-section__toggle-help {
      font-size: 13px;
      color: var(--pm-text-muted);
    }
    .profile-section__classification-error {
      font-size: 12px;
      color: var(--pm-danger, #e05252);
      min-height: 16px;
    }
    label {
      font-size: 13px;
      font-weight: 600;
      color: var(--pm-text);
    }
    /* Sliding switch: the native checkbox stays in the DOM (and keeps its
       label association and keyboard behaviour) but is laid over the track at
       zero opacity, so the track/thumb below are the visible control. */
    .toggle {
      position: relative;
      display: inline-flex;
      align-items: center;
      gap: 10px;
      cursor: pointer;
    }
    .toggle__input {
      position: absolute;
      top: 0;
      left: 0;
      width: 44px;
      height: 24px;
      margin: 0;
      opacity: 0;
      cursor: pointer;
    }
    .toggle__track {
      display: inline-flex;
      align-items: center;
      flex-shrink: 0;
      width: 44px;
      height: 24px;
      padding: 2px;
      box-sizing: border-box;
      border-radius: 9999px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      transition: background 0.15s ease-in-out;
    }
    .toggle__thumb {
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.25);
      transition: transform 0.15s ease-in-out;
    }
    .toggle__input:checked ~ .toggle__track {
      background: var(--pm-accent);
      border-color: var(--pm-accent);
    }
    .toggle__input:checked ~ .toggle__track .toggle__thumb {
      transform: translateX(20px);
    }
    .toggle__input:focus-visible ~ .toggle__track {
      outline: 2px solid var(--pm-accent);
      outline-offset: 2px;
    }
    [hidden] {
      display: none !important;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="profile-section__card">
    <div class="profile-section__header">
      <h2 class="profile-section__title">Profile</h2>
      <button type="button" class="profile-section__edit-btn" id="editBtn">Edit</button>
    </div>
    <div id="readView" class="profile-section__read-grid">
      <div class="profile-section__field">
        <span class="profile-section__field-label">First name</span>
        <span class="profile-section__field-value" id="firstName"></span>
      </div>
      <div class="profile-section__field">
        <span class="profile-section__field-label">Surname</span>
        <span class="profile-section__field-value" id="surname"></span>
      </div>
    </div>
    <pm-teacher-profile-form id="editForm" hidden></pm-teacher-profile-form>
    <div class="profile-section__classification">
      <div class="profile-section__classification-text">
        <label for="private">Employment classification</label>
        <span class="profile-section__toggle-help" id="toggleHelp">Paid by the school.</span>
      </div>
      <label class="toggle" for="private">
        <input type="checkbox" id="private" class="toggle__input" />
        <span class="toggle__track"><span class="toggle__thumb"></span></span>
      </label>
    </div>
    <div class="profile-section__classification-error" id="classificationError"></div>
  </div>
`;

export class PmTeacherProfileSection extends HTMLElement {
  private editBtn: HTMLButtonElement | null = null;
  private readView: HTMLElement | null = null;
  private editForm: PmTeacherProfileForm | null = null;
  private firstNameEl: HTMLElement | null = null;
  private surnameEl: HTMLElement | null = null;
  private privateCheckbox: HTMLInputElement | null = null;
  private toggleHelp: HTMLElement | null = null;
  private classificationError: HTMLElement | null = null;
  private _teacher: TeacherResult | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.editBtn = this.shadowRoot!.getElementById('editBtn') as HTMLButtonElement;
    this.readView = this.shadowRoot!.getElementById('readView') as HTMLElement;
    this.editForm = this.shadowRoot!.getElementById('editForm') as unknown as PmTeacherProfileForm;
    this.firstNameEl = this.shadowRoot!.getElementById('firstName') as HTMLElement;
    this.surnameEl = this.shadowRoot!.getElementById('surname') as HTMLElement;
    this.privateCheckbox = this.shadowRoot!.getElementById('private') as HTMLInputElement;
    this.toggleHelp = this.shadowRoot!.getElementById('toggleHelp') as HTMLElement;
    this.classificationError = this.shadowRoot!.getElementById('classificationError') as HTMLElement;

    this.editBtn.addEventListener('click', this.handleEditClick);
    this.privateCheckbox.addEventListener('change', this.handleClassificationChange);
    this.shadowRoot!.addEventListener('teacher-edit-cancelled', this.handleEditCancelled);

    this.render();
  }

  disconnectedCallback(): void {
    this.editBtn?.removeEventListener('click', this.handleEditClick);
    this.privateCheckbox?.removeEventListener('change', this.handleClassificationChange);
    this.shadowRoot!.removeEventListener('teacher-edit-cancelled', this.handleEditCancelled);
  }

  set teacher(value: TeacherResult | null) {
    this._teacher = value;
    this.render();
  }

  get teacher(): TeacherResult | null {
    return this._teacher;
  }

  showEditError(message: string): void {
    this.editForm!.showError(message);
  }

  closeEdit(): void {
    this.readView!.hidden = false;
    this.editForm!.hidden = true;
    this.editBtn!.hidden = false;
  }

  /**
   * Restores the switch to the last persisted value and surfaces the failure —
   * an unsaved classification must never be left looking saved.
   */
  revertClassification(message: string): void {
    this.privateCheckbox!.checked = this._teacher?.isPrivate ?? false;
    this.updateToggleHelp();
    this.classificationError!.textContent = message;
  }

  private render(): void {
    if (!this.firstNameEl || !this._teacher) return;
    const teacher = this._teacher;
    this.firstNameEl.textContent = teacher.firstName;
    this.surnameEl!.textContent = teacher.surname;
    this.privateCheckbox!.checked = teacher.isPrivate;
    this.updateToggleHelp();
  }

  private updateToggleHelp = (): void => {
    this.toggleHelp!.textContent = this.privateCheckbox!.checked ? 'Private teacher.' : 'Paid by the school.';
  };

  private handleClassificationChange = (): void => {
    if (!this._teacher) return;
    this.classificationError!.textContent = '';
    this.updateToggleHelp();

    this.dispatchEvent(
      new CustomEvent<{ teacherId: string; isPrivate: boolean }>('teacher-classification-change-requested', {
        bubbles: true,
        composed: true,
        detail: { teacherId: this._teacher.teacherId, isPrivate: this.privateCheckbox!.checked },
      }),
    );
  };

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
}

customElements.define('pm-teacher-profile-section', PmTeacherProfileSection);
