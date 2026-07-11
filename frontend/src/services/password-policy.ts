export interface PasswordPolicyResult {
  minLength: boolean;
}

export function evaluatePasswordPolicy(password: string): PasswordPolicyResult {
  return {
    minLength: password.length >= 8,
  };
}

export function isPasswordPolicyMet(result: PasswordPolicyResult): boolean {
  return result.minLength;
}
