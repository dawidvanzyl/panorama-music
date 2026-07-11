import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../../BasePage';

export class RegistrationPage extends BasePage {
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly submitButton: Locator;
  readonly errorBanner: Locator;
  readonly errorText: Locator;
  readonly successBanner: Locator;
  readonly successText: Locator;

  constructor(page: Page) {
    super(page);
    this.passwordInput = page.locator('#password');
    this.confirmPasswordInput = page.locator('#confirmPassword');
    this.submitButton = page.locator('#submitBtn');
    this.errorBanner = page.locator('#errorMsg');
    this.errorText = page.locator('#errorText');
    this.successBanner = page.locator('#successMsg');
    this.successText = page.locator('#successText');
  }

  async gotoRegister(token: string): Promise<void> {
    await this.goto(`/#/register?token=${token}`);
  }

  async register(password: string, confirmPassword: string): Promise<void> {
    await this.passwordInput.fill(password);
    await this.confirmPasswordInput.fill(confirmPassword);
    await this.submitButton.click();
  }
}
