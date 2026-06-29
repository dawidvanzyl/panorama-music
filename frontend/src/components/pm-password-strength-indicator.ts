import type { PasswordPolicyResult } from '../services/password-policy';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
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

    .strength-indicator {
      display: flex;
      flex-direction: column;
      gap: 6px;
      padding: 0 4px;
    }

    .strength-rule {
      display: flex;
      align-items: center;
      gap: 8px;
      transition: all 0.15s;
    }

    .strength-rule__icon {
      font-size: 16px;
      color: var(--pm-text-muted, #8d90a0);
      transition: color 0.15s;
    }

    .strength-rule__icon--satisfied {
      font-size: 16px;
      color: #8fd44e;
      font-variation-settings: 'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24;
    }

    .strength-rule__label {
      font-size: 11px;
      font-weight: 400;
      line-height: 1.2;
      letter-spacing: 0.02em;
      color: var(--pm-text-muted, #8d90a0);
      transition: color 0.15s;
    }

    .strength-rule__label--satisfied {
      color: #8fd44e;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="strength-indicator">
    <div class="strength-rule" id="rule-min-length">
      <span class="material-symbols-outlined strength-rule__icon" id="icon-min-length">radio_button_unchecked</span>
      <span class="strength-rule__label" id="label-min-length">At least 8 characters</span>
    </div>
  </div>
`;

export class PmPasswordStrengthIndicator extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  set result(value: PasswordPolicyResult) {
    this._setRule('min-length', value.minLength);
  }

  private _setRule(ruleId: string, satisfied: boolean): void {
    const icon = this.shadowRoot!.getElementById(`icon-${ruleId}`);
    const label = this.shadowRoot!.getElementById(`label-${ruleId}`);

    if (!icon || !label) return;

    if (satisfied) {
      icon.textContent = 'check_circle';
      icon.className = 'material-symbols-outlined strength-rule__icon--satisfied';
      label.className = 'strength-rule__label--satisfied';
    } else {
      icon.textContent = 'radio_button_unchecked';
      icon.className = 'material-symbols-outlined strength-rule__icon';
      label.className = 'strength-rule__label';
    }
  }
}

customElements.define('pm-password-strength-indicator', PmPasswordStrengthIndicator);
