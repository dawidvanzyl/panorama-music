import { login, AuthError } from '../../../services/auth';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: flex;
      align-items: center;
      justify-content: center;
      flex: 1;
      padding: 16px;
      position: relative;
      overflow: hidden;
      font-family: 'Inter', system-ui, sans-serif;
    }

    .material-symbols-outlined {
      font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
      font-family: 'Material Symbols Outlined', system-ui, sans-serif;
      font-weight: normal;
      font-style: normal;
      line-height: 1;
      letter-spacing: normal;
      text-transform: none;
      display: inline-block;
      white-space: nowrap;
      word-wrap: normal;
      direction: ltr;
      -webkit-font-smoothing: antialiased;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    .login__spinner {
      animation: spin 0.7s linear infinite;
    }

    .login__glow {
      position: fixed;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }
    .login__glow-spot {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
    }
    .login__glow-spot--top {
      top: -10%;
      left: -10%;
      width: 40%;
      height: 40%;
      background: rgba(79, 124, 255, 0.1);
    }
    .login__glow-spot--bottom {
      bottom: -10%;
      right: -10%;
      width: 40%;
      height: 40%;
      background: rgba(100, 138, 255, 0.05);
    }

    .login__container {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 420px;
    }

    .login__branding {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 32px;
    }
    .login__icon-box {
      width: 64px;
      height: 64px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
      background: var(--pm-accent);
      color: #fff;
      box-shadow: var(--pm-shadow);
      margin-bottom: 16px;
    }
    .login__icon-box .material-symbols-outlined {
      font-size: 40px;
    }
    .login__title {
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1.4;
      letter-spacing: -0.02em;
      color: var(--pm-text);
    }

    .login__card {
      background: var(--pm-surface);
      border: 1px solid rgba(67, 70, 84, 0.3);
      border-radius: 12px;
      padding: 32px;
      transition: all 0.3s;
    }

    .login__field {
      margin-bottom: 20px;
    }
    .login__field:last-of-type {
      margin-bottom: 0;
    }
    .login__label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }
    .login__label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.2;
      color: var(--pm-text);
      margin-bottom: 6px;
    }
    .login__label-row .login__label {
      margin-bottom: 0;
    }
    .login__forgot {
      font-size: 11px;
      font-weight: 400;
      line-height: 1.2;
      letter-spacing: 0.02em;
      color: var(--pm-text-muted);
      text-decoration: none;
    }
    .login__forgot:hover {
      text-decoration: underline;
    }

    .login__input-wrap {
      position: relative;
    }
    .login__input-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--pm-text-muted);
      font-size: 20px;
      pointer-events: none;
    }
    .login__input {
      display: block;
      margin: 0 auto;
      width: 100%;
      box-sizing: border-box;
      height: 48px;
      padding: 0 16px 0 44px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: 10px;
      color: var(--pm-text);
      font-size: 14px;
      font-weight: 400;
      line-height: 1.6;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      transition: all 0.15s;
    }
    .login__input::placeholder {
      color: var(--pm-text-muted);
    }
    .login__input:-webkit-autofill,
    .login__input:-webkit-autofill:hover,
    .login__input:-webkit-autofill:focus {
      -webkit-box-shadow: 0 0 0 30px var(--pm-surface-2) inset !important;
      -webkit-text-fill-color: var(--pm-text) !important;
      caret-color: var(--pm-text);
    }
    .login__input--has-toggle {
      padding-right: 48px;
    }
    .login__input:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px var(--pm-accent);
    }

    .login__visibility-toggle {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      background: none;
      border: none;
      color: var(--pm-text-muted);
      cursor: pointer;
      padding: 4px;
      display: flex;
      align-items: center;
      transition: color 0.15s;
    }
    .login__visibility-toggle:hover {
      color: var(--pm-text);
    }
    .login__visibility-toggle .material-symbols-outlined {
      font-size: 20px;
    }

    .login__error-banner {
      display: none;
      align-items: center;
      gap: 12px;
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 20px;
    }
    .login__error-banner.login__error-banner--visible {
      display: flex;
    }
    .login__error-icon {
      font-size: 18px;
      color: var(--pm-danger);
    }
    .login__error-text {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-danger);
    }

    .login__submit {
      width: 100%;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      margin-top: 20px;
      border: none;
      border-radius: 9999px;
      background: var(--pm-accent);
      color: #fff;
      font-size: 1.125rem;
      font-weight: 600;
      line-height: 1.4;
      letter-spacing: -0.01em;
      cursor: pointer;
      transition: all 0.15s;
      box-shadow: var(--pm-shadow);
    }
    .login__submit:hover {
      filter: brightness(1.1);
    }
    .login__submit:active {
      transform: scale(0.98);
    }
    .login__submit:disabled {
      opacity: 0.65;
      cursor: not-allowed;
      transform: none;
      filter: none;
    }
    .login__submit-icon {
      font-size: 20px;
    }

    .login__footer {
      text-align: center;
      margin-top: 32px;
    }
    .login__footer p {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text-muted);
      opacity: 0.6;
      line-height: 1.6;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="login__glow" aria-hidden="true">
    <div class="login__glow-spot login__glow-spot--top"></div>
    <div class="login__glow-spot login__glow-spot--bottom"></div>
  </div>

  <div class="login__container">
    <div class="login__branding">
      <div class="login__icon-box">
        <span class="material-symbols-outlined">music_note</span>
      </div>
      <h1 class="login__title">Panorama Music</h1>
    </div>

    <div class="login__card">
      <form id="loginForm">
        <div class="login__field">
          <label class="login__label" for="email">Email</label>
          <div class="login__input-wrap">
            <span class="material-symbols-outlined login__input-icon">mail</span>
            <input class="login__input" type="email" id="email" required autocomplete="email" placeholder="you@example.com" />
          </div>
        </div>
        <div class="login__field">
          <div class="login__label-row">
            <label class="login__label" for="password">Password</label>
            <a class="login__forgot" href="#/forgot-password">Forgot password?</a>
          </div>
          <div class="login__input-wrap">
            <span class="material-symbols-outlined login__input-icon">lock</span>
            <input class="login__input login__input--has-toggle" type="password" id="password" required autocomplete="current-password" placeholder="••••••••" />
            <button type="button" class="login__visibility-toggle" id="togglePassword">
              <span class="material-symbols-outlined" id="passwordIcon">visibility</span>
            </button>
          </div>
        </div>

        <div class="login__error-banner" id="errorMsg">
          <span class="material-symbols-outlined login__error-icon">error</span>
          <span class="login__error-text" id="errorText">Invalid email or password</span>
        </div>

        <button type="submit" class="login__submit" id="submitBtn">
          <span id="submitLabel">Sign In</span>
          <span class="material-symbols-outlined login__submit-icon">login</span>
        </button>
      </form>
    </div>

    <footer class="login__footer">
      <p>&copy; 2026 Panorama Primary School.<br />All rights reserved.</p>
    </footer>
  </div>
`;

export class PmLoginPage extends HTMLElement {
  private form: HTMLFormElement | null = null;
  private emailInput: HTMLInputElement | null = null;
  private passwordInput: HTMLInputElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private submitLabel: HTMLElement | null = null;
  private submitIcon: HTMLElement | null = null;
  private errorBanner: HTMLElement | null = null;
  private errorText: HTMLElement | null = null;
  private toggleBtn: HTMLButtonElement | null = null;
  private passwordIcon: HTMLElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.form = this.shadowRoot!.getElementById('loginForm') as HTMLFormElement;
    this.emailInput = this.shadowRoot!.getElementById('email') as HTMLInputElement;
    this.passwordInput = this.shadowRoot!.getElementById('password') as HTMLInputElement;
    this.submitBtn = this.shadowRoot!.getElementById('submitBtn') as HTMLButtonElement;
    this.submitLabel = this.shadowRoot!.getElementById('submitLabel') as HTMLElement;
    this.submitIcon = this.shadowRoot!.querySelector('.login__submit-icon') as HTMLElement;
    this.errorBanner = this.shadowRoot!.getElementById('errorMsg') as HTMLElement;
    this.errorText = this.shadowRoot!.getElementById('errorText') as HTMLElement;
    this.toggleBtn = this.shadowRoot!.getElementById('togglePassword') as HTMLButtonElement;
    this.passwordIcon = this.shadowRoot!.getElementById('passwordIcon') as HTMLElement;

    this.form!.addEventListener('submit', this.handleSubmit);
    this.toggleBtn!.addEventListener('click', this.handleTogglePassword);

    const inputs = [this.emailInput!, this.passwordInput!];
    for (const input of inputs) {
      input.addEventListener('input', this.handleInputChange);
    }
  }

  disconnectedCallback(): void {
    this.form?.removeEventListener('submit', this.handleSubmit);
    this.toggleBtn?.removeEventListener('click', this.handleTogglePassword);
    const inputs = [this.emailInput, this.passwordInput];
    for (const input of inputs) {
      input?.removeEventListener('input', this.handleInputChange);
    }
  }

  private handleInputChange = (): void => {
    this.errorBanner!.classList.remove('login__error-banner--visible');
  };

  private handleTogglePassword = (): void => {
    const isPassword = this.passwordInput!.type === 'password';
    this.passwordInput!.type = isPassword ? 'text' : 'password';
    this.passwordIcon!.textContent = isPassword ? 'visibility_off' : 'visibility';
  };

  private handleSubmit = async (e: Event): Promise<void> => {
    e.preventDefault();
    this.errorBanner!.classList.remove('login__error-banner--visible');
    this.submitBtn!.disabled = true;

    const originalLabel = this.submitLabel!.textContent;
    const originalIcon = this.submitIcon!.textContent;
    this.submitLabel!.textContent = 'Authenticating...';
    this.submitIcon!.textContent = 'progress_activity';
    this.submitIcon!.classList.add('login__spinner');

    try {
      const outcome = await login(this.emailInput!.value, this.passwordInput!.value);
      window.location.hash =
        outcome.status === 'passwordResetRequired'
          ? `#/reset-password?token=${encodeURIComponent(outcome.resetToken)}`
          : '#/';
    } catch (err) {
      if (err instanceof AuthError) {
        this.errorText!.textContent = 'Invalid email or password';
      } else {
        this.errorText!.textContent = 'An unexpected error occurred';
      }
      this.errorBanner!.classList.add('login__error-banner--visible');
    } finally {
      this.submitBtn!.disabled = false;
      this.submitLabel!.textContent = originalLabel;
      this.submitIcon!.textContent = originalIcon!;
      this.submitIcon!.classList.remove('login__spinner');
    }
  };
}

customElements.define('pm-login-page', PmLoginPage);
