import { describe, it, expect } from 'vitest';
import { evaluatePasswordPolicy, isPasswordPolicyMet } from '../password-policy';

describe('evaluatePasswordPolicy', { tags: ['M1.1UC3'] }, () => {
  it('marks minLength satisfied when password has 8 or more characters', () => {
    const result = evaluatePasswordPolicy('Abcdefg1');

    expect(result.minLength).toBe(true);
  });

  it('marks minLength unsatisfied when password has fewer than 8 characters', () => {
    const result = evaluatePasswordPolicy('Abc1');

    expect(result.minLength).toBe(false);
  });

  it('marks mixedCase satisfied when password has both upper and lower characters', () => {
    const result = evaluatePasswordPolicy('abcABC');

    expect(result.mixedCase).toBe(true);
  });

  it('marks mixedCase unsatisfied when password is all lowercase', () => {
    const result = evaluatePasswordPolicy('alllower');

    expect(result.mixedCase).toBe(false);
  });

  it('marks mixedCase unsatisfied when password is all uppercase', () => {
    const result = evaluatePasswordPolicy('ALLUPPER');

    expect(result.mixedCase).toBe(false);
  });

  it('marks hasDigit satisfied when password contains a digit', () => {
    const result = evaluatePasswordPolicy('hasDigit1');

    expect(result.hasDigit).toBe(true);
  });

  it('marks hasDigit unsatisfied when password contains no digits', () => {
    const result = evaluatePasswordPolicy('NoDigitHere');

    expect(result.hasDigit).toBe(false);
  });

  it('updates all rules correctly as password value changes', () => {
    const weak = evaluatePasswordPolicy('weak');
    const strong = evaluatePasswordPolicy('ValidPass1');

    expect(weak.minLength).toBe(false);
    expect(weak.mixedCase).toBe(false);
    expect(weak.hasDigit).toBe(false);

    expect(strong.minLength).toBe(true);
    expect(strong.mixedCase).toBe(true);
    expect(strong.hasDigit).toBe(true);
  });
});

describe('isPasswordPolicyMet', { tags: ['M1.1UC4'] }, () => {
  it('returns true when all rules are satisfied — no client-side blocking should occur', () => {
    const result = evaluatePasswordPolicy('ValidPass1');

    expect(isPasswordPolicyMet(result)).toBe(true);
  });

  it('returns false when any rule is unsatisfied', () => {
    expect(isPasswordPolicyMet(evaluatePasswordPolicy('short'))).toBe(false);
    expect(isPasswordPolicyMet(evaluatePasswordPolicy('alllowercase1'))).toBe(false);
    expect(isPasswordPolicyMet(evaluatePasswordPolicy('NoDigitHere'))).toBe(false);
  });
});
