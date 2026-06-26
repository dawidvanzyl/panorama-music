import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../../BasePage';

export class ResetPasswordPage extends BasePage {
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorBanner: Locator;
  readonly errorText: Locator;
  readonly invalidBanner: Locator;

  constructor(page: Page) {
    super(page);
    this.passwordInput = page.locator('#password');
    this.confirmPasswordInput = page.locator('#confirmPassword');
    this.submitButton = page.locator('#submitBtn');
    this.errorBanner = page.locator('#errorMsg');
    this.errorText = page.locator('#errorText');
    this.invalidBanner = page.locator('#invalidBanner');
  }

  async gotoReset(token: string): Promise<void> {
    await this.goto(`/#/reset-password?token=${token}`);
  }

  async resetPassword(password: string, confirmPassword: string): Promise<void> {
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.submitButton.click();
  }
}
