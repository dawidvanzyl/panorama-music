import { createUser, AdminError } from '../services/admin';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
    }
    .create-user__card {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 24px;
    }
    .create-user__title {
      font-size: 1.125rem;
      font-weight: 700;
      color: var(--pm-text);
      margin-bottom: 16px;
    }
    .create-user__row {
      display: flex;
      gap: 24px;
      flex-wrap: wrap;
      align-items: flex-end;
    }
    .create-user__field {
      flex: 1;
      min-width: 200px;
    }
    .create-user__label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text);
      margin-bottom: 6px;
    }
    .create-user__input {
      box-sizing: border-box;
      width: 100%;
      height: 44px;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
      outline: none;
    }
    .create-user__input:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px var(--pm-accent);
    }
    .create-user__roles {
      box-sizing: border-box;
      display: flex;
      gap: 16px;
      padding: 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
    }
    .create-user__role-option {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 14px;
      color: var(--pm-text);
      cursor: pointer;
    }
    .create-user__submit {
      height: 44px;
      padding: 0 24px;
      border: none;
      border-radius: var(--pm-radius);
      background: var(--pm-accent);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
    }
    .create-user__submit:hover {
      filter: brightness(1.1);
    }
    .create-user__submit:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    .create-user__message {
      margin-top: 16px;
      padding: 12px 16px;
      border-radius: var(--pm-radius);
      font-size: 13px;
      display: none;
    }
    .create-user__message--success {
      display: block;
      background: rgba(143, 212, 78, 0.1);
      border: 1px solid #8fd44e;
      color: #8fd44e;
    }
    .create-user__message--error {
      display: block;
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      color: var(--pm-danger);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="create-user__card">
    <h2 class="create-user__title">Create User</h2>
    <form id="createUserForm">
      <div class="create-user__row">
        <div class="create-user__field">
          <label class="create-user__label" for="email">Email</label>
          <input class="create-user__input" type="email" id="email" required placeholder="user@example.com" />
        </div>
        <div class="create-user__field">
          <label class="create-user__label">Roles</label>
          <div class="create-user__roles">
            <label class="create-user__role-option">
              <input type="checkbox" id="roleTeacher" value="Teacher" checked />
              Teacher
            </label>
            <label class="create-user__role-option">
              <input type="checkbox" id="roleAdmin" value="Admin" />
              Admin
            </label>
          </div>
        </div>
        <button type="submit" class="create-user__submit" id="submitBtn">Create User</button>
      </div>
    </form>
    <div class="create-user__message" id="message">
      <div id="messageText"></div>
    </div>
  </div>
`;

export class PmCreateUserForm extends HTMLElement {
  private form: HTMLFormElement | null = null;
  private emailInput: HTMLInputElement | null = null;
  private roleTeacher: HTMLInputElement | null = null;
  private roleAdmin: HTMLInputElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private message: HTMLElement | null = null;
  private messageText: HTMLElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.form = this.shadowRoot!.getElementById('createUserForm') as HTMLFormElement;
    this.emailInput = this.shadowRoot!.getElementById('email') as HTMLInputElement;
    this.roleTeacher = this.shadowRoot!.getElementById('roleTeacher') as HTMLInputElement;
    this.roleAdmin = this.shadowRoot!.getElementById('roleAdmin') as HTMLInputElement;
    this.submitBtn = this.shadowRoot!.getElementById('submitBtn') as HTMLButtonElement;
    this.message = this.shadowRoot!.getElementById('message') as HTMLElement;
    this.messageText = this.shadowRoot!.getElementById('messageText') as HTMLElement;

    this.form.addEventListener('submit', this.handleSubmit);
  }

  disconnectedCallback(): void {
    this.form?.removeEventListener('submit', this.handleSubmit);
  }

  private getSelectedRoles(): string[] {
    const roles: string[] = [];
    if (this.roleTeacher?.checked) roles.push('Teacher');
    if (this.roleAdmin?.checked) roles.push('Admin');
    return roles;
  }

  private handleSubmit = async (e: Event): Promise<void> => {
    e.preventDefault();
    this.message!.className = 'create-user__message';
    this.submitBtn!.disabled = true;

    const roles = this.getSelectedRoles();
    if (roles.length === 0) {
      this.messageText!.textContent = 'At least one role must be selected.';
      this.message!.classList.add('create-user__message--error');
      this.submitBtn!.disabled = false;
      return;
    }

    try {
      const result = await createUser(this.emailInput!.value, roles);
      this.form!.reset();
      this.roleTeacher!.checked = true;
      this.dispatchEvent(new CustomEvent('user-created', {
        bubbles: true,
        composed: true,
        detail: { inviteUrl: result.inviteUrl },
      }));
    } catch (err) {
      this.messageText!.textContent = err instanceof AdminError ? err.message : 'An unexpected error occurred';
      this.message!.classList.add('create-user__message--error');
    } finally {
      this.submitBtn!.disabled = false;
    }
  };
}

customElements.define('pm-create-user-form', PmCreateUserForm);
