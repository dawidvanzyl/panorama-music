import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../../BasePage';

export class LoginPage extends BasePage {
  readonly emailInput: Locator;
  readonly passwordInput: Locator;
  readonly submitButton: Locator;
  readonly errorBanner: Locator;
  readonly errorText: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('#email');
    this.passwordInput = page.locator('#password');
    this.submitButton = page.locator('#submitBtn');
    this.errorBanner = page.locator('#errorMsg');
    this.errorText = page.locator('#errorText');
  }

  async gotoLogin(): Promise<void> {
    await this.goto('/#/login');
  }

  async login(email: string, password: string): Promise<void> {
    await this.emailInput.fill(email);
    await this.passwordInput.fill(password);
    await this.submitButton.click();
  }
}
