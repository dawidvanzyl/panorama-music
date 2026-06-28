import { resetPassword, AuthError } from '../../../services/auth';
import { evaluatePasswordPolicy } from '../../../services/password-policy';
import { PmPasswordStrengthIndicator } from '../../../components/pm-password-strength-indicator';

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
    .reset__spinner {
      animation: spin 0.7s linear infinite;
    }

    .reset__glow {
      position: fixed;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }
    .reset__glow-spot {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
    }
    .reset__glow-spot--top {
      top: -10%;
      left: -10%;
      width: 40%;
      height: 40%;
      background: rgba(79, 124, 255, 0.1);
    }
    .reset__glow-spot--bottom {
      bottom: -10%;
      right: -10%;
      width: 40%;
      height: 40%;
      background: rgba(100, 138, 255, 0.05);
    }

    .reset__container {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 420px;
    }

    .reset__branding {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 32px;
    }
    .reset__icon-box {
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
    .reset__icon-box .material-symbols-outlined {
      font-size: 40px;
    }
    .reset__title {
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1.4;
      letter-spacing: -0.02em;
      color: var(--pm-text);
    }

    .reset__card {
      background: var(--pm-surface);
      border: 1px solid rgba(67, 70, 84, 0.3);
      border-radius: 12px;
      padding: 32px;
    }

    .reset__card-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .reset__card-title {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--pm-text);
      margin: 0 0 6px;
    }
    .reset__card-desc {
      font-size: 14px;
      color: var(--pm-text-muted);
      margin: 0;
    }

    .reset__field {
      margin-bottom: 20px;
    }
    .reset__label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text);
      margin-bottom: 6px;
    }
    .reset__input-wrap {
      position: relative;
    }
    .reset__input-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--pm-text-muted);
      font-size: 20px;
      pointer-events: none;
    }
    .reset__input {
      display: block;
      box-sizing: border-box;
      width: 100%;
      height: 48px;
      padding: 0 48px 0 44px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: 10px;
      color: var(--pm-text);
      font-size: 14px;
      font-weight: 400;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      transition: all 0.15s;
    }
    .reset__input::placeholder {
      color: var(--pm-text-muted);
    }
    .reset__input:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px var(--pm-accent);
    }

    .reset__visibility-toggle {
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
    .reset__visibility-toggle:hover { color: var(--pm-text); }
    .reset__visibility-toggle .material-symbols-outlined { font-size: 20px; }

    .reset__error-banner {
      display: none;
      align-items: center;
      gap: 12px;
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 20px;
    }
    .reset__error-banner.reset__error-banner--visible {
      display: flex;
    }
    .reset__error-icon { font-size: 18px; color: var(--pm-danger); }
    .reset__error-text { font-size: 13px; font-weight: 500; color: var(--pm-danger); }

    .reset__invalid-banner {
      display: none;
      flex-direction: column;
      align-items: center;
      gap: 12px;
      text-align: center;
      padding: 24px 16px;
    }
    .reset__invalid-banner.reset__invalid-banner--visible {
      display: flex;
    }
    .reset__invalid-icon { font-size: 40px; color: var(--pm-danger); }
    .reset__invalid-title { font-size: 1rem; font-weight: 600; color: var(--pm-text); margin: 0; }
    .reset__invalid-desc { font-size: 14px; color: var(--pm-text-muted); margin: 0; }
    .reset__invalid-link {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-accent);
      text-decoration: none;
      cursor: pointer;
    }
    .reset__invalid-link:hover { opacity: 0.8; }

    .reset__form-area { display: block; }
    .reset__form-area.reset__form-area--hidden { display: none; }

    .reset__submit {
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
    .reset__submit:hover { filter: brightness(1.1); }
    .reset__submit:active { transform: scale(0.98); }
    .reset__submit:disabled {
      opacity: 0.65;
      cursor: not-allowed;
      transform: none;
      filter: none;
    }

    .reset__footer {
      text-align: center;
      margin-top: 32px;
    }
    .reset__footer p {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text-muted);
      opacity: 0.6;
      line-height: 1.6;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `
  <div class="reset__glow" aria-hidden="true">
    <div class="reset__glow-spot reset__glow-spot--top"></div>
    <div class="reset__glow-spot reset__glow-spot--bottom"></div>
  </div>

  <div class="reset__container">
    <div class="reset__branding">
      <div class="reset__icon-box">
        <span class="material-symbols-outlined">music_note</span>
      </div>
      <h1 class="reset__title">Panorama Music</h1>
    </div>

    <div class="reset__card">
      <div class="reset__card-header">
        <h2 class="reset__card-title">Reset Your Password</h2>
        <p class="reset__card-desc">Enter your new password below.</p>
      </div>

      <div class="reset__invalid-banner" id="invalidBanner">
        <span class="material-symbols-outlined reset__invalid-icon">link_off</span>
        <p class="reset__invalid-title">Link invalid or expired</p>
        <p class="reset__invalid-desc">This password reset link is invalid or has expired.</p>
        <a class="reset__invalid-link" href="#/forgot-password">Request a new link</a>
      </div>

      <div class="reset__form-area" id="formArea">
        <form id="resetForm">
          <div class="reset__field">
            <label class="reset__label" for="password">New Password</label>
            <div class="reset__input-wrap">
              <span class="material-symbols-outlined reset__input-icon">lock</span>
              <input class="reset__input" type="password" id="password" required autocomplete="new-password" placeholder="Min. 8 characters" />
              <button type="button" class="reset__visibility-toggle" id="togglePassword">
                <span class="material-symbols-outlined" id="passwordIcon">visibility</span>
              </button>
            </div>
          </div>

          <div class="reset__field">
            <label class="reset__label" for="confirmPassword">Confirm Password</label>
            <div class="reset__input-wrap">
              <span class="material-symbols-outlined reset__input-icon">lock</span>
              <input class="reset__input" type="password" id="confirmPassword" required autocomplete="new-password" placeholder="Re-enter your password" />
              <button type="button" class="reset__visibility-toggle" id="toggleConfirmPassword">
                <span class="material-symbols-outlined" id="confirmPasswordIcon">visibility</span>
              </button>
            </div>
          </div>

          <pm-password-strength-indicator id="strengthIndicator"></pm-password-strength-indicator>

          <div class="reset__error-banner" id="errorMsg">
            <span class="material-symbols-outlined reset__error-icon">error</span>
            <span class="reset__error-text" id="errorText">Passwords do not match</span>
          </div>

          <button type="submit" class="reset__submit" id="submitBtn">
            <span id="submitLabel">Reset Password</span>
            <span class="material-symbols-outlined reset__submit-icon">arrow_forward</span>
          </button>
        </form>
      </div>
    </div>

    <footer class="reset__footer">
      <p>&copy; 2026 Panorama Primary School.<br />All rights reserved.</p>
    </footer>
  </div>
`;

export class PmResetPasswordPage extends HTMLElement {
  private form: HTMLFormElement | null = null;
  private passwordInput: HTMLInputElement | null = null;
  private confirmInput: HTMLInputElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private submitLabel: HTMLElement | null = null;
  private submitIcon: HTMLElement | null = null;
  private errorBanner: HTMLElement | null = null;
  private errorText: HTMLElement | null = null;
  private invalidBanner: HTMLElement | null = null;
  private formArea: HTMLElement | null = null;
  private toggleBtn: HTMLButtonElement | null = null;
  private passwordIcon: HTMLElement | null = null;
  private toggleConfirmBtn: HTMLButtonElement | null = null;
  private confirmPasswordIcon: HTMLElement | null = null;
  private strengthIndicator: PmPasswordStrengthIndicator | null = null;
  private boundTogglePassword: (() => void) | null = null;
  private boundToggleConfirm: (() => void) | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.form = this.shadowRoot!.getElementById('resetForm') as HTMLFormElement;
    this.passwordInput = this.shadowRoot!.getElementById('password') as HTMLInputElement;
    this.confirmInput = this.shadowRoot!.getElementById('confirmPassword') as HTMLInputElement;
    this.submitBtn = this.shadowRoot!.getElementById('submitBtn') as HTMLButtonElement;
    this.submitLabel = this.shadowRoot!.getElementById('submitLabel') as HTMLElement;
    this.submitIcon = this.shadowRoot!.querySelector('.reset__submit-icon') as HTMLElement;
    this.errorBanner = this.shadowRoot!.getElementById('errorMsg') as HTMLElement;
    this.errorText = this.shadowRoot!.getElementById('errorText') as HTMLElement;
    this.invalidBanner = this.shadowRoot!.getElementById('invalidBanner') as HTMLElement;
    this.formArea = this.shadowRoot!.getElementById('formArea') as HTMLElement;
    this.toggleBtn = this.shadowRoot!.getElementById('togglePassword') as HTMLButtonElement;
    this.passwordIcon = this.shadowRoot!.getElementById('passwordIcon') as HTMLElement;
    this.toggleConfirmBtn = this.shadowRoot!.getElementById('toggleConfirmPassword') as HTMLButtonElement;
    this.confirmPasswordIcon = this.shadowRoot!.getElementById('confirmPasswordIcon') as HTMLElement;
    this.strengthIndicator = this.shadowRoot!.getElementById('strengthIndicator') as PmPasswordStrengthIndicator;

    if (!this.resetToken) {
      this.showInvalidState();
      return;
    }

    this.form!.addEventListener('submit', this.handleSubmit);
    this.boundTogglePassword = () => this.toggleVisibility(this.passwordInput!, this.passwordIcon!);
    this.boundToggleConfirm = () => this.toggleVisibility(this.confirmInput!, this.confirmPasswordIcon!);
    this.toggleBtn!.addEventListener('click', this.boundTogglePassword);
    this.toggleConfirmBtn!.addEventListener('click', this.boundToggleConfirm);
    this.passwordInput!.addEventListener('input', this.handlePasswordInput);
    this.confirmInput!.addEventListener('input', this.handleInputChange);
  }

  disconnectedCallback(): void {
    this.form?.removeEventListener('submit', this.handleSubmit);
    if (this.boundTogglePassword) this.toggleBtn?.removeEventListener('click', this.boundTogglePassword);
    if (this.boundToggleConfirm) this.toggleConfirmBtn?.removeEventListener('click', this.boundToggleConfirm);
    this.passwordInput?.removeEventListener('input', this.handlePasswordInput);
    this.confirmInput?.removeEventListener('input', this.handleInputChange);
  }

  private get resetToken(): string | null {
    const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    return params.get('token');
  }

  private showInvalidState(): void {
    this.formArea!.classList.add('reset__form-area--hidden');
    this.invalidBanner!.classList.add('reset__invalid-banner--visible');
  }

  private toggleVisibility(input: HTMLInputElement, icon: HTMLElement): void {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    icon.textContent = isPassword ? 'visibility_off' : 'visibility';
  }

  private handlePasswordInput = (): void => {
    this.errorBanner!.classList.remove('reset__error-banner--visible');
    if (this.strengthIndicator) {
      this.strengthIndicator.result = evaluatePasswordPolicy(this.passwordInput!.value);
    }
  };

  private handleInputChange = (): void => {
    this.errorBanner!.classList.remove('reset__error-banner--visible');
  };

  private handleSubmit = async (e: Event): Promise<void> => {
    e.preventDefault();
    this.errorBanner!.classList.remove('reset__error-banner--visible');

    if (this.passwordInput!.value !== this.confirmInput!.value) {
      this.errorText!.textContent = 'Passwords do not match';
      this.errorBanner!.classList.add('reset__error-banner--visible');
      return;
    }

    this.submitBtn!.disabled = true;
    const originalLabel = this.submitLabel!.textContent;
    const originalIcon = this.submitIcon!.textContent;
    this.submitLabel!.textContent = 'Resetting...';
    this.submitIcon!.textContent = 'progress_activity';
    this.submitIcon!.classList.add('reset__spinner');

    try {
      await resetPassword(this.resetToken!, this.passwordInput!.value);
      window.location.hash = '#/login';
    } catch (err) {
      if (err instanceof AuthError && err.status === 401) {
        this.showInvalidState();
        return;
      } else if (err instanceof AuthError && err.status === 400) {
        this.errorText!.textContent = err.message;
      } else {
        this.errorText!.textContent = 'An unexpected error occurred';
      }
      this.errorBanner!.classList.add('reset__error-banner--visible');
    } finally {
      if (this.submitBtn) {
        this.submitBtn.disabled = false;
        this.submitLabel!.textContent = originalLabel;
        this.submitIcon!.textContent = originalIcon!;
        this.submitIcon!.classList.remove('reset__spinner');
      }
    }
  };
}

customElements.define('pm-reset-password-page', PmResetPasswordPage);
