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
});

describe('isPasswordPolicyMet', { tags: ['M1.1UC4'] }, () => {
  it('returns true when minLength is satisfied — no client-side blocking should occur', () => {
    const result = evaluatePasswordPolicy('alllowercaseletters');

    expect(isPasswordPolicyMet(result)).toBe(true);
  });

  it('returns false when minLength is unsatisfied', () => {
    expect(isPasswordPolicyMet(evaluatePasswordPolicy('short'))).toBe(false);
  });
});
