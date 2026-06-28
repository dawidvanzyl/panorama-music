import { forgotPassword, AuthError } from '../../../services/auth';

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
    .forgot__spinner {
      animation: spin 0.7s linear infinite;
    }

    .forgot__glow {
      position: fixed;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }
    .forgot__glow-spot {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
    }
    .forgot__glow-spot--top {
      top: -10%;
      left: -10%;
      width: 40%;
      height: 40%;
      background: rgba(79, 124, 255, 0.1);
    }
    .forgot__glow-spot--bottom {
      bottom: -10%;
      right: -10%;
      width: 40%;
      height: 40%;
      background: rgba(100, 138, 255, 0.05);
    }

    .forgot__container {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 420px;
    }

    .forgot__branding {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 32px;
    }
    .forgot__icon-box {
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
    .forgot__icon-box .material-symbols-outlined {
      font-size: 40px;
    }
    .forgot__title {
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1.4;
      letter-spacing: -0.02em;
      color: var(--pm-text);
    }

    .forgot__card {
      background: var(--pm-surface);
      border: 1px solid rgba(67, 70, 84, 0.3);
      border-radius: 12px;
      padding: 32px;
    }

    .forgot__card-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .forgot__card-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--pm-text);
      margin: 0 0 6px;
    }
    .forgot__card-desc {
      font-size: 14px;
      color: var(--pm-text-muted);
      margin: 0;
    }

    .forgot__field {
      margin-bottom: 20px;
    }
    .forgot__label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text);
      margin-bottom: 6px;
    }
    .forgot__input-wrap {
      position: relative;
    }
    .forgot__input-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--pm-text-muted);
      font-size: 20px;
      pointer-events: none;
    }
    .forgot__input {
      display: block;
      box-sizing: border-box;
      width: 100%;
      height: 48px;
      padding: 0 16px 0 44px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: 10px;
      color: var(--pm-text);
      font-size: 14px;
      font-weight: 400;
      outline: none;
      transition: all 0.15s;
    }
    .forgot__input::placeholder {
      color: var(--pm-text-muted);
    }
    .forgot__input:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px var(--pm-accent);
    }

    .forgot__error-banner {
      display: none;
      align-items: center;
      gap: 12px;
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 20px;
    }
    .forgot__error-banner.forgot__error-banner--visible {
      display: flex;
    }
    .forgot__error-icon {
      font-size: 18px;
      color: var(--pm-danger);
    }
    .forgot__error-text {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-danger);
    }

    .forgot__success-banner {
      display: none;
      align-items: center;
      gap: 12px;
      background: rgba(143, 212, 78, 0.1);
      border: 1px solid #8fd44e;
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 20px;
    }
    .forgot__success-banner.forgot__success-banner--visible {
      display: flex;
    }
    .forgot__success-icon {
      font-size: 18px;
      color: #8fd44e;
    }
    .forgot__success-text {
      font-size: 13px;
      font-weight: 500;
      color: #8fd44e;
    }

    .forgot__submit {
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
      color: #00297b;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.15s;
      box-shadow: var(--pm-shadow);
    }
    .forgot__submit:hover { filter: brightness(1.1); }
    .forgot__submit:active { transform: scale(0.98); }
    .forgot__submit:disabled {
      opacity: 0.65;
      cursor: not-allowed;
      transform: none;
      filter: none;
    }

    .forgot__back-link {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 4px;
      margin-top: 24px;
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-accent);
      text-decoration: none;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .forgot__back-link:hover { opacity: 0.8; }
    .forgot__back-link .material-symbols-outlined { font-size: 16px; }

    .forgot__footer {
      text-align: center;
      margin-top: 32px;
    }
    .forgot__footer p {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text-muted);
      opacity: 0.6;
      line-height: 1.6;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="forgot__glow" aria-hidden="true">
    <div class="forgot__glow-spot forgot__glow-spot--top"></div>
    <div class="forgot__glow-spot forgot__glow-spot--bottom"></div>
  </div>

  <div class="forgot__container">
    <div class="forgot__branding">
      <div class="forgot__icon-box">
        <span class="material-symbols-outlined">music_note</span>
      </div>
      <h1 class="forgot__title">Panorama Music</h1>
    </div>

    <div class="forgot__card">
      <div class="forgot__card-header">
        <h2 class="forgot__card-title">Reset Password</h2>
        <p class="forgot__card-desc">Enter your email address and we'll send you a link to reset your password.</p>
      </div>
      <form id="forgotForm">
        <div class="forgot__field">
          <label class="forgot__label" for="email">Email Address</label>
          <div class="forgot__input-wrap">
            <span class="material-symbols-outlined forgot__input-icon">mail</span>
            <input class="forgot__input" type="email" id="email" required autocomplete="email" placeholder="name@panorama.edu" />
          </div>
        </div>

        <div class="forgot__error-banner" id="errorMsg">
          <span class="material-symbols-outlined forgot__error-icon">error</span>
          <span class="forgot__error-text" id="errorText">An unexpected error occurred</span>
        </div>

        <div class="forgot__success-banner" id="successMsg">
          <span class="material-symbols-outlined forgot__success-icon">check_circle</span>
          <span class="forgot__success-text">If that email is registered, a reset link has been sent.</span>
        </div>

        <button type="submit" class="forgot__submit" id="submitBtn">
          <span id="submitLabel">Send Reset Link</span>
          <span class="material-symbols-outlined forgot__submit-icon">arrow_forward</span>
        </button>
      </form>

      <a class="forgot__back-link" id="backToLogin" href="#/login">
        <span class="material-symbols-outlined">arrow_back</span>
        Back to Login
      </a>
    </div>

    <footer class="forgot__footer">
      <p>&copy; 2026 Panorama Primary School.<br />All rights reserved.</p>
    </footer>
  </div>
`;

export class PmForgotPasswordPage extends HTMLElement {
  private form: HTMLFormElement | null = null;
  private emailInput: HTMLInputElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private submitLabel: HTMLElement | null = null;
  private submitIcon: HTMLElement | null = null;
  private errorBanner: HTMLElement | null = null;
  private errorText: HTMLElement | null = null;
  private successBanner: HTMLElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.form = this.shadowRoot!.getElementById('forgotForm') as HTMLFormElement;
    this.emailInput = this.shadowRoot!.getElementById('email') as HTMLInputElement;
    this.submitBtn = this.shadowRoot!.getElementById('submitBtn') as HTMLButtonElement;
    this.submitLabel = this.shadowRoot!.getElementById('submitLabel') as HTMLElement;
    this.submitIcon = this.shadowRoot!.querySelector('.forgot__submit-icon') as HTMLElement;
    this.errorBanner = this.shadowRoot!.getElementById('errorMsg') as HTMLElement;
    this.errorText = this.shadowRoot!.getElementById('errorText') as HTMLElement;
    this.successBanner = this.shadowRoot!.getElementById('successMsg') as HTMLElement;

    this.form!.addEventListener('submit', this.handleSubmit);
  }

  disconnectedCallback(): void {
    this.form?.removeEventListener('submit', this.handleSubmit);
  }

  private handleSubmit = async (e: Event): Promise<void> => {
    e.preventDefault();
    this.errorBanner!.classList.remove('forgot__error-banner--visible');
    this.successBanner!.classList.remove('forgot__success-banner--visible');

    this.submitBtn!.disabled = true;
    const originalLabel = this.submitLabel!.textContent;
    const originalIcon = this.submitIcon!.textContent;
    this.submitLabel!.textContent = 'Sending...';
    this.submitIcon!.textContent = 'progress_activity';
    this.submitIcon!.classList.add('forgot__spinner');

    try {
      await forgotPassword(this.emailInput!.value);
      this.successBanner!.classList.add('forgot__success-banner--visible');
      this.form!.reset();
    } catch (err) {
      const message = err instanceof AuthError ? err.message : 'An unexpected error occurred';
      this.errorText!.textContent = message;
      this.errorBanner!.classList.add('forgot__error-banner--visible');
    } finally {
      this.submitBtn!.disabled = false;
      this.submitLabel!.textContent = originalLabel;
      this.submitIcon!.textContent = originalIcon!;
      this.submitIcon!.classList.remove('forgot__spinner');
    }
  };
}

customElements.define('pm-forgot-password-page', PmForgotPasswordPage);
