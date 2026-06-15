import { createUser, AdminError } from '../services/admin';

const template = document.createElement('template');
template.innerHTML = `
  <style>
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
      gap: 12px;
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
    .create-user__input,
    .create-user__select {
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
    .create-user__input:focus,
    .create-user__select:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px var(--pm-accent);
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
    .create-user__invite-url {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 8px;
    }
    .create-user__invite-url code {
      flex: 1;
      word-break: break-all;
      color: var(--pm-text);
    }
    .create-user__copy {
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      background: var(--pm-surface-2);
      color: var(--pm-text);
      font-size: 12px;
      padding: 6px 12px;
      cursor: pointer;
    }
  </style>

  <div class="create-user__card">
    <h2 class="create-user__title">Create User</h2>
    <form id="createUserForm">
      <div class="create-user__row">
        <div class="create-user__field">
          <label class="create-user__label" for="email">Email</label>
          <input class="create-user__input" type="email" id="email" required placeholder="user@example.com" />
        </div>
        <div class="create-user__field">
          <label class="create-user__label" for="role">Role</label>
          <select class="create-user__select" id="role">
            <option value="Admin">Admin</option>
            <option value="Teacher" selected>Teacher</option>
          </select>
        </div>
        <button type="submit" class="create-user__submit" id="submitBtn">Create User</button>
      </div>
    </form>
    <div class="create-user__message" id="message">
      <div id="messageText"></div>
      <div class="create-user__invite-url" id="inviteUrlWrap" hidden>
        <code id="inviteUrlText"></code>
        <button type="button" class="create-user__copy" id="copyBtn">Copy</button>
      </div>
    </div>
  </div>
`;

export class PmCreateUserForm extends HTMLElement {
  private form: HTMLFormElement | null = null;
  private emailInput: HTMLInputElement | null = null;
  private roleSelect: HTMLSelectElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private message: HTMLElement | null = null;
  private messageText: HTMLElement | null = null;
  private inviteUrlWrap: HTMLElement | null = null;
  private inviteUrlText: HTMLElement | null = null;
  private copyBtn: HTMLButtonElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.form = this.shadowRoot!.getElementById('createUserForm') as HTMLFormElement;
    this.emailInput = this.shadowRoot!.getElementById('email') as HTMLInputElement;
    this.roleSelect = this.shadowRoot!.getElementById('role') as HTMLSelectElement;
    this.submitBtn = this.shadowRoot!.getElementById('submitBtn') as HTMLButtonElement;
    this.message = this.shadowRoot!.getElementById('message') as HTMLElement;
    this.messageText = this.shadowRoot!.getElementById('messageText') as HTMLElement;
    this.inviteUrlWrap = this.shadowRoot!.getElementById('inviteUrlWrap') as HTMLElement;
    this.inviteUrlText = this.shadowRoot!.getElementById('inviteUrlText') as HTMLElement;
    this.copyBtn = this.shadowRoot!.getElementById('copyBtn') as HTMLButtonElement;

    this.form.addEventListener('submit', this.handleSubmit);
    this.copyBtn.addEventListener('click', this.handleCopy);
  }

  disconnectedCallback(): void {
    this.form?.removeEventListener('submit', this.handleSubmit);
    this.copyBtn?.removeEventListener('click', this.handleCopy);
  }

  private handleCopy = async (): Promise<void> => {
    await navigator.clipboard.writeText(this.inviteUrlText!.textContent ?? '');
  };

  private handleSubmit = async (e: Event): Promise<void> => {
    e.preventDefault();
    this.message!.className = 'create-user__message';
    this.inviteUrlWrap!.hidden = true;
    this.submitBtn!.disabled = true;

    try {
      const result = await createUser(this.emailInput!.value, this.roleSelect!.value);
      this.messageText!.textContent = 'User created successfully. Invite URL:';
      this.message!.classList.add('create-user__message--success');
      this.inviteUrlText!.textContent = result.inviteUrl;
      this.inviteUrlWrap!.hidden = false;
      this.form!.reset();
      this.dispatchEvent(new CustomEvent('user-created', { bubbles: true, composed: true }));
    } catch (err) {
      this.messageText!.textContent = err instanceof AdminError ? err.message : 'An unexpected error occurred';
      this.message!.classList.add('create-user__message--error');
    } finally {
      this.submitBtn!.disabled = false;
    }
  };
}

customElements.define('pm-create-user-form', PmCreateUserForm);
