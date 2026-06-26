import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../../BasePage';

export class ForgotPasswordPage extends BasePage {
  readonly emailInput: Locator;
  readonly submitButton: Locator;
  readonly successBanner: Locator;
  readonly errorBanner: Locator;
  readonly errorText: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('#email');
    this.submitButton = page.locator('#submitBtn');
    this.successBanner = page.locator('#successMsg');
    this.errorBanner = page.locator('#errorMsg');
    this.errorText = page.locator('#errorText');
  }

  async gotoForgotPassword(): Promise<void> {
    await this.goto('/#/forgot-password');
  }

  async requestReset(email: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.submitButton.click();
  }
}
