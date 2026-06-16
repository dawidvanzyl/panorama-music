import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PmPasswordStrengthIndicator } from '../pm-password-strength-indicator';

describe('pm-password-strength-indicator', () => {
  let el: PmPasswordStrengthIndicator;

  beforeEach(() => {
    el = new PmPasswordStrengthIndicator();
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('renders all rules as unsatisfied by default', () => {
    const shadow = el.shadowRoot!;
    expect(shadow.getElementById('icon-min-length')?.textContent).toBe('radio_button_unchecked');
    expect(shadow.getElementById('icon-mixed-case')?.textContent).toBe('radio_button_unchecked');
    expect(shadow.getElementById('icon-has-digit')?.textContent).toBe('radio_button_unchecked');
    expect(shadow.getElementById('icon-min-length')?.className).toBe('material-symbols-outlined strength-rule__icon');
  });

  it('marks all rules as satisfied when all result flags are true', () => {
    el.result = { minLength: true, mixedCase: true, hasDigit: true };
    const shadow = el.shadowRoot!;

    for (const id of ['icon-min-length', 'icon-mixed-case', 'icon-has-digit']) {
      expect(shadow.getElementById(id)?.textContent).toBe('check_circle');
      expect(shadow.getElementById(id)?.className).toBe('material-symbols-outlined strength-rule__icon--satisfied');
    }
    for (const id of ['label-min-length', 'label-mixed-case', 'label-has-digit']) {
      expect(shadow.getElementById(id)?.className).toBe('strength-rule__label--satisfied');
    }
  });

  it('marks only the satisfied rule when result is partial', () => {
    el.result = { minLength: true, mixedCase: false, hasDigit: false };
    const shadow = el.shadowRoot!;

    expect(shadow.getElementById('icon-min-length')?.className).toContain('--satisfied');
    expect(shadow.getElementById('icon-mixed-case')?.className).not.toContain('--satisfied');
    expect(shadow.getElementById('icon-has-digit')?.className).not.toContain('--satisfied');
  });

  it('reverts to unsatisfied when a previously-satisfied rule is unset', () => {
    el.result = { minLength: true, mixedCase: true, hasDigit: true };
    el.result = { minLength: false, mixedCase: false, hasDigit: false };
    const shadow = el.shadowRoot!;

    for (const id of ['icon-min-length', 'icon-mixed-case', 'icon-has-digit']) {
      expect(shadow.getElementById(id)?.textContent).toBe('radio_button_unchecked');
      expect(shadow.getElementById(id)?.className).toBe('material-symbols-outlined strength-rule__icon');
    }
  });
});
