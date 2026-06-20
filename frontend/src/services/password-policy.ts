export interface PasswordPolicyResult {
  minLength: boolean;
  mixedCase: boolean;
  hasDigit: boolean;
}

export function evaluatePasswordPolicy(password: string): PasswordPolicyResult {
  return {
    minLength: password.length >= 8,
    mixedCase: /[A-Z]/.test(password) && /[a-z]/.test(password),
    hasDigit: /[0-9]/.test(password),
  };
}

export function isPasswordPolicyMet(result: PasswordPolicyResult): boolean {
  return result.minLength && result.mixedCase && result.hasDigit;
}
