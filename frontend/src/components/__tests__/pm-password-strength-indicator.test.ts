import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PmPasswordStrengthIndicator } from '../pm-password-strength-indicator';

describe('pm-password-strength-indicator', { tags: ['M1.1UC3'] }, () => {
  let el: PmPasswordStrengthIndicator;

  beforeEach(() => {
    el = new PmPasswordStrengthIndicator();
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('renders the min-length rule as unsatisfied by default', () => {
    const shadow = el.shadowRoot!;
    expect(shadow.getElementById('icon-min-length')?.textContent).toBe('radio_button_unchecked');
    expect(shadow.getElementById('icon-min-length')?.className).toBe('material-symbols-outlined strength-rule__icon');
  });

  it('marks the min-length rule as satisfied when minLength is true', () => {
    el.result = { minLength: true };
    const shadow = el.shadowRoot!;

    expect(shadow.getElementById('icon-min-length')?.textContent).toBe('check_circle');
    expect(shadow.getElementById('icon-min-length')?.className).toBe(
      'material-symbols-outlined strength-rule__icon--satisfied',
    );
    expect(shadow.getElementById('label-min-length')?.className).toBe('strength-rule__label--satisfied');
  });

  it('reverts to unsatisfied when minLength is unset', () => {
    el.result = { minLength: true };
    el.result = { minLength: false };
    const shadow = el.shadowRoot!;

    expect(shadow.getElementById('icon-min-length')?.textContent).toBe('radio_button_unchecked');
    expect(shadow.getElementById('icon-min-length')?.className).toBe('material-symbols-outlined strength-rule__icon');
  });
});
