import { completeRegistration, AuthError } from '../services/auth';

const template = document.createElement('template');
template.innerHTML = `
  <style>
    :host {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }
    form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      width: 100%;
      max-width: 360px;
      padding: 2rem;
      border: 1px solid #ccc;
      border-radius: 8px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }
    input {
      padding: 0.5rem;
      border: 1px solid #ccc;
      border-radius: 4px;
      font-size: 1rem;
    }
    button {
      padding: 0.5rem;
      border: none;
      border-radius: 4px;
      background: #0075ca;
      color: #fff;
      font-size: 1rem;
      cursor: pointer;
    }
    button:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }
    .registration-form__error {
      color: #d32f2f;
      font-size: 0.875rem;
    }
    .registration-form__success {
      color: #2e7d32;
      font-size: 0.875rem;
    }
  </style>
  <form id="registrationForm">
    <h2>Complete Registration</h2>
    <p>Set your password to activate your account.</p>
    <label>
      Password
      <input type="password" id="password" required minlength="8" autocomplete="new-password" />
    </label>
    <label>
      Confirm Password
      <input type="password" id="confirmPassword" required autocomplete="new-password" />
    </label>
    <button type="submit" id="submitBtn">Set Password & Activate</button>
    <p id="errorMsg" class="registration-form__error" hidden></p>
    <p id="successMsg" class="registration-form__success" hidden></p>
  </form>
`;

export class PmRegistrationPage extends HTMLElement {
  private form: HTMLFormElement | null = null;
  private passwordInput: HTMLInputElement | null = null;
  private confirmInput: HTMLInputElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private errorMsg: HTMLElement | null = null;
  private successMsg: HTMLElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.form = this.shadowRoot!.getElementById('registrationForm') as HTMLFormElement;
    this.passwordInput = this.shadowRoot!.getElementById('password') as HTMLInputElement;
    this.confirmInput = this.shadowRoot!.getElementById('confirmPassword') as HTMLInputElement;
    this.submitBtn = this.shadowRoot!.getElementById('submitBtn') as HTMLButtonElement;
    this.errorMsg = this.shadowRoot!.getElementById('errorMsg') as HTMLElement;
    this.successMsg = this.shadowRoot!.getElementById('successMsg') as HTMLElement;

    if (!this.inviteToken) {
      this.errorMsg!.textContent = 'No invite token found in URL';
      this.errorMsg!.hidden = false;
      this.submitBtn!.disabled = true;
      return;
    }

    this.form!.addEventListener('submit', this.handleSubmit);
  }

  disconnectedCallback(): void {
    this.form?.removeEventListener('submit', this.handleSubmit);
  }

  private get inviteToken(): string | null {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  }

  private handleSubmit = async (e: Event): Promise<void> => {
    e.preventDefault();
    this.errorMsg!.hidden = true;
    this.successMsg!.hidden = true;

    if (this.passwordInput!.value !== this.confirmInput!.value) {
      this.errorMsg!.textContent = 'Passwords do not match';
      this.errorMsg!.hidden = false;
      return;
    }

    this.submitBtn!.disabled = true;

    try {
      await completeRegistration(this.inviteToken!, this.passwordInput!.value);
      this.successMsg!.textContent = 'Account activated! Redirecting to login...';
      this.successMsg!.hidden = false;
      this.form!.reset();

      setTimeout(() => {
        window.location.hash = '#/login?registered=true';
      }, 1500);
    } catch (err) {
      if (err instanceof AuthError) {
        this.errorMsg!.textContent = 'Invite link is invalid or expired';
      } else {
        this.errorMsg!.textContent = 'An unexpected error occurred';
      }
      this.errorMsg!.hidden = false;
    } finally {
      this.submitBtn!.disabled = false;
    }
  };
}

customElements.define('pm-registration-page', PmRegistrationPage);
