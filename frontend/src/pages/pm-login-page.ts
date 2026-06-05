import { login, AuthError } from '../services/auth';

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
    .error {
      color: #d32f2f;
      font-size: 0.875rem;
    }
  </style>
  <form id="loginForm">
    <h2>Sign In</h2>
    <label>
      Email
      <input type="email" id="email" required autocomplete="email" />
    </label>
    <label>
      Password
      <input type="password" id="password" required autocomplete="current-password" />
    </label>
    <button type="submit" id="submitBtn">Sign In</button>
    <p id="errorMsg" class="error" hidden></p>
  </form>
`;

export class PmLoginPage extends HTMLElement {
  private form: HTMLFormElement | null = null;
  private emailInput: HTMLInputElement | null = null;
  private passwordInput: HTMLInputElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private errorMsg: HTMLElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.form = this.shadowRoot!.getElementById('loginForm') as HTMLFormElement;
    this.emailInput = this.shadowRoot!.getElementById('email') as HTMLInputElement;
    this.passwordInput = this.shadowRoot!.getElementById('password') as HTMLInputElement;
    this.submitBtn = this.shadowRoot!.getElementById('submitBtn') as HTMLButtonElement;
    this.errorMsg = this.shadowRoot!.getElementById('errorMsg') as HTMLElement;

    this.form!.addEventListener('submit', this.handleSubmit);
  }

  disconnectedCallback(): void {
    this.form?.removeEventListener('submit', this.handleSubmit);
  }

  private handleSubmit = async (e: Event): Promise<void> => {
    e.preventDefault();
    this.errorMsg!.hidden = true;
    this.submitBtn!.disabled = true;

    try {
      await login(this.emailInput!.value, this.passwordInput!.value);
      window.location.hash = '#/';
    } catch (err) {
      if (err instanceof AuthError) {
        this.errorMsg!.textContent = 'Invalid email or password';
      } else {
        this.errorMsg!.textContent = 'An unexpected error occurred';
      }
      this.errorMsg!.hidden = false;
    } finally {
      this.submitBtn!.disabled = false;
    }
  };
}

customElements.define('pm-login-page', PmLoginPage);
