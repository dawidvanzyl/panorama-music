import { completeRegistration, AuthError } from '../../../services/auth';
import { evaluatePasswordPolicy } from '../../../services/password-policy';
import { PmPasswordStrengthIndicator } from '../../../components/pm-password-strength-indicator';

const template = document.createElement('template');
template.innerHTML = `
  <style>
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
    .registration__spinner {
      animation: spin 0.7s linear infinite;
    }

    .registration__glow {
      position: fixed;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }
    .registration__glow-spot {
      position: absolute;
      border-radius: 50%;
      filter: blur(120px);
    }
    .registration__glow-spot--top {
      top: -10%;
      left: -10%;
      width: 40%;
      height: 40%;
      background: rgba(79, 124, 255, 0.1);
    }
    .registration__glow-spot--bottom {
      bottom: -10%;
      right: -10%;
      width: 40%;
      height: 40%;
      background: rgba(100, 138, 255, 0.05);
    }

    .registration__container {
      position: relative;
      z-index: 1;
      width: 100%;
      max-width: 420px;
    }

    .registration__branding {
      display: flex;
      flex-direction: column;
      align-items: center;
      margin-bottom: 32px;
    }
    .registration__icon-box {
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
    .registration__icon-box .material-symbols-outlined {
      font-size: 40px;
    }
    .registration__title {
      font-size: 1.25rem;
      font-weight: 700;
      line-height: 1.4;
      letter-spacing: -0.02em;
      color: var(--pm-text);
    }

    .registration__card {
      background: var(--pm-surface);
      border: 1px solid rgba(67, 70, 84, 0.3);
      border-radius: 12px;
      padding: 32px;
      transition: all 0.3s;
    }

    .registration__card-header {
      text-align: center;
      margin-bottom: 28px;
    }
    .registration__card-title {
      font-size: 1.125rem;
      font-weight: 600;
      line-height: 1.4;
      letter-spacing: -0.01em;
      color: var(--pm-text);
      margin: 0 0 6px;
    }
    .registration__card-desc {
      font-size: 14px;
      color: var(--pm-text-muted);
      margin: 0;
    }

    .registration__field {
      margin-bottom: 20px;
    }
    .registration__label {
      display: block;
      font-size: 13px;
      font-weight: 500;
      line-height: 1.2;
      color: var(--pm-text);
      margin-bottom: 6px;
    }

    .registration__input-wrap {
      position: relative;
    }
    .registration__input-icon {
      position: absolute;
      left: 16px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--pm-text-muted);
      font-size: 20px;
      pointer-events: none;
    }
    .registration__input {
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
      line-height: 1.6;
      outline: none;
      appearance: none;
      -webkit-appearance: none;
      transition: all 0.15s;
    }
    .registration__input::placeholder {
      color: var(--pm-text-muted);
    }
    .registration__input:-webkit-autofill,
    .registration__input:-webkit-autofill:hover,
    .registration__input:-webkit-autofill:focus {
      -webkit-box-shadow: 0 0 0 30px var(--pm-surface-2) inset !important;
      -webkit-text-fill-color: var(--pm-text) !important;
      caret-color: var(--pm-text);
    }
    .registration__input--has-toggle {
      padding-right: 48px;
    }
    .registration__input:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px var(--pm-accent);
    }

    .registration__visibility-toggle {
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
    .registration__visibility-toggle:hover {
      color: var(--pm-text);
    }
    .registration__visibility-toggle .material-symbols-outlined {
      font-size: 20px;
    }

    .registration__error-banner {
      display: none;
      align-items: center;
      gap: 12px;
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 20px;
    }
    .registration__error-banner.registration__error-banner--visible {
      display: flex;
    }
    .registration__error-icon {
      font-size: 18px;
      color: var(--pm-danger);
    }
    .registration__error-text {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-danger);
    }

    .registration__success-banner {
      display: none;
      align-items: center;
      gap: 12px;
      background: rgba(143, 212, 78, 0.1);
      border: 1px solid #8fd44e;
      border-radius: 10px;
      padding: 12px 16px;
      margin-top: 20px;
    }
    .registration__success-banner.registration__success-banner--visible {
      display: flex;
    }
    .registration__success-icon {
      font-size: 18px;
      color: #8fd44e;
    }
    .registration__success-text {
      font-size: 13px;
      font-weight: 500;
      color: #8fd44e;
    }

    .registration__submit {
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
      line-height: 1.4;
      letter-spacing: -0.01em;
      cursor: pointer;
      transition: all 0.15s;
      box-shadow: var(--pm-shadow);
    }
    .registration__submit:hover {
      filter: brightness(1.1);
    }
    .registration__submit:active {
      transform: scale(0.98);
    }
    .registration__submit:disabled {
      opacity: 0.65;
      cursor: not-allowed;
      transform: none;
      filter: none;
    }

    .registration__footer {
      text-align: center;
      margin-top: 32px;
    }
    .registration__footer p {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text-muted);
      opacity: 0.6;
      line-height: 1.6;
    }
  </style>

  <div class="registration__glow" aria-hidden="true">
    <div class="registration__glow-spot registration__glow-spot--top"></div>
    <div class="registration__glow-spot registration__glow-spot--bottom"></div>
  </div>

  <div class="registration__container">
    <div class="registration__branding">
      <div class="registration__icon-box">
        <span class="material-symbols-outlined">music_note</span>
      </div>
      <h1 class="registration__title">Panorama Music</h1>
    </div>

    <div class="registration__card">
      <div class="registration__card-header">
        <h2 class="registration__card-title">Complete Your Registration</h2>
        <p class="registration__card-desc">Set your password to activate your account.</p>
      </div>
      <form id="registrationForm">
        <div class="registration__field">
          <label class="registration__label" for="password">Password</label>
          <div class="registration__input-wrap">
            <span class="material-symbols-outlined registration__input-icon">lock</span>
            <input class="registration__input registration__input--has-toggle" type="password" id="password" required minlength="8" autocomplete="new-password" placeholder="Min. 8 characters" />
            <button type="button" class="registration__visibility-toggle" id="togglePassword">
              <span class="material-symbols-outlined" id="passwordIcon">visibility</span>
            </button>
          </div>
        </div>
        <div class="registration__field">
          <label class="registration__label" for="confirmPassword">Confirm Password</label>
          <div class="registration__input-wrap">
            <span class="material-symbols-outlined registration__input-icon">lock</span>
            <input class="registration__input registration__input--has-toggle" type="password" id="confirmPassword" required autocomplete="new-password" placeholder="Re-enter your password" />
            <button type="button" class="registration__visibility-toggle" id="toggleConfirmPassword">
              <span class="material-symbols-outlined" id="confirmPasswordIcon">visibility</span>
            </button>
          </div>
        </div>

        <pm-password-strength-indicator id="strengthIndicator"></pm-password-strength-indicator>

        <div class="registration__error-banner" id="errorMsg">
          <span class="material-symbols-outlined registration__error-icon">error</span>
          <span class="registration__error-text" id="errorText">Passwords do not match</span>
        </div>

        <div class="registration__success-banner" id="successMsg">
          <span class="material-symbols-outlined registration__success-icon">check_circle</span>
          <span class="registration__success-text" id="successText">Account activated! Redirecting...</span>
        </div>

        <button type="submit" class="registration__submit" id="submitBtn">
          <span id="submitLabel">Complete Setup</span>
          <span class="material-symbols-outlined registration__submit-icon">arrow_forward</span>
        </button>
      </form>
    </div>

    <footer class="registration__footer">
      <p>&copy; 2026 Panorama Primary School.<br />All rights reserved.</p>
    </footer>
  </div>
`;

export class PmRegistrationPage extends HTMLElement {
  private form: HTMLFormElement | null = null;
  private passwordInput: HTMLInputElement | null = null;
  private confirmInput: HTMLInputElement | null = null;
  private submitBtn: HTMLButtonElement | null = null;
  private submitLabel: HTMLElement | null = null;
  private submitIcon: HTMLElement | null = null;
  private errorBanner: HTMLElement | null = null;
  private errorText: HTMLElement | null = null;
  private successBanner: HTMLElement | null = null;
  private successText: HTMLElement | null = null;
  private toggleBtn: HTMLButtonElement | null = null;
  private passwordIcon: HTMLElement | null = null;
  private toggleConfirmBtn: HTMLButtonElement | null = null;
  private confirmPasswordIcon: HTMLElement | null = null;
  private boundTogglePassword: (() => void) | null = null;
  private boundToggleConfirm: (() => void) | null = null;
  private strengthIndicator: PmPasswordStrengthIndicator | null = null;

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
    this.submitLabel = this.shadowRoot!.getElementById('submitLabel') as HTMLElement;
    this.submitIcon = this.shadowRoot!.querySelector('.registration__submit-icon') as HTMLElement;
    this.errorBanner = this.shadowRoot!.getElementById('errorMsg') as HTMLElement;
    this.errorText = this.shadowRoot!.getElementById('errorText') as HTMLElement;
    this.successBanner = this.shadowRoot!.getElementById('successMsg') as HTMLElement;
    this.successText = this.shadowRoot!.getElementById('successText') as HTMLElement;
    this.toggleBtn = this.shadowRoot!.getElementById('togglePassword') as HTMLButtonElement;
    this.passwordIcon = this.shadowRoot!.getElementById('passwordIcon') as HTMLElement;
    this.toggleConfirmBtn = this.shadowRoot!.getElementById('toggleConfirmPassword') as HTMLButtonElement;
    this.confirmPasswordIcon = this.shadowRoot!.getElementById('confirmPasswordIcon') as HTMLElement;
    this.strengthIndicator = this.shadowRoot!.getElementById('strengthIndicator') as PmPasswordStrengthIndicator;

    if (!this.inviteToken) {
      this.errorText!.textContent = 'No invite token found in URL';
      this.errorBanner!.classList.add('registration__error-banner--visible');
      this.submitBtn!.disabled = true;
      return;
    }

    this.form!.addEventListener('submit', this.handleSubmit);
    this.boundTogglePassword = () => this.togglePasswordVisibility(this.passwordInput!, this.passwordIcon!);
    this.boundToggleConfirm = () => this.togglePasswordVisibility(this.confirmInput!, this.confirmPasswordIcon!);
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

  private get inviteToken(): string | null {
    const params = new URLSearchParams(window.location.hash.split('?')[1] ?? '');
    return params.get('token');
  }

  private togglePasswordVisibility(input: HTMLInputElement, icon: HTMLElement): void {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    icon.textContent = isPassword ? 'visibility_off' : 'visibility';
  }

  private handlePasswordInput = (): void => {
    this.errorBanner!.classList.remove('registration__error-banner--visible');
    if (this.strengthIndicator) {
      this.strengthIndicator.result = evaluatePasswordPolicy(this.passwordInput!.value);
    }
  };

  private handleInputChange = (): void => {
    this.errorBanner!.classList.remove('registration__error-banner--visible');
  };

  private handleSubmit = async (e: Event): Promise<void> => {
    e.preventDefault();
    this.errorBanner!.classList.remove('registration__error-banner--visible');
    this.successBanner!.classList.remove('registration__success-banner--visible');

    if (this.passwordInput!.value !== this.confirmInput!.value) {
      this.errorText!.textContent = 'Passwords do not match';
      this.errorBanner!.classList.add('registration__error-banner--visible');
      return;
    }

    this.submitBtn!.disabled = true;
    const originalLabel = this.submitLabel!.textContent;
    const originalIcon = this.submitIcon!.textContent;
    this.submitLabel!.textContent = 'Activating...';
    this.submitIcon!.textContent = 'progress_activity';
    this.submitIcon!.classList.add('registration__spinner');

    try {
      await completeRegistration(this.inviteToken!, this.passwordInput!.value);
      this.successText!.textContent = 'Account activated! Redirecting to login...';
      this.successBanner!.classList.add('registration__success-banner--visible');
      this.form!.reset();

      setTimeout(() => {
        window.location.hash = '#/login?registered=true';
      }, 1500);
    } catch (err) {
      if (err instanceof AuthError) {
        this.errorText!.textContent = err.status === 422
          ? err.message
          : 'Invite link is invalid or expired';
      } else {
        this.errorText!.textContent = 'An unexpected error occurred';
      }
      this.errorBanner!.classList.add('registration__error-banner--visible');
    } finally {
      this.submitBtn!.disabled = false;
      this.submitLabel!.textContent = originalLabel;
      this.submitIcon!.textContent = originalIcon!;
      this.submitIcon!.classList.remove('registration__spinner');
    }
  };
}

customElements.define('pm-registration-page', PmRegistrationPage);
