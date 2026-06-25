import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../../BasePage';

export function extractInviteToken(inviteUrl: string): string {
  const hashPart = inviteUrl.split('#')[1] ?? '';
  const params = new URLSearchParams(hashPart.split('?')[1] ?? '');
  const token = params.get('token');
  if (!token) throw new Error(`No invite token found in invite URL: ${inviteUrl}`);
  return token;
}

export type UserRole = 'Teacher' | 'Admin';

export class AdminUsersPage extends BasePage {
  readonly emailInput: Locator;
  readonly roleTeacherCheckbox: Locator;
  readonly roleAdminCheckbox: Locator;
  readonly submitButton: Locator;
  readonly userCreatedInviteUrl: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('#email');
    this.roleTeacherCheckbox = page.locator('#roleTeacher');
    this.roleAdminCheckbox = page.locator('#roleAdmin');
    this.submitButton = page.locator('#submitBtn');
    this.userCreatedInviteUrl = page.locator('#userCreatedBanner').locator('#inviteUrl');
  }

  async gotoAdminUsers(): Promise<void> {
    await this.goto('/#/admin/users');
  }

  async createUser(email: string, roles: UserRole[]): Promise<string> {
    await this.emailInput.fill(email);

    if (roles.includes('Teacher') !== (await this.roleTeacherCheckbox.isChecked())) {
      await this.roleTeacherCheckbox.click();
    }
    if (roles.includes('Admin') !== (await this.roleAdminCheckbox.isChecked())) {
      await this.roleAdminCheckbox.click();
    }

    await this.submitButton.click();
    await this.userCreatedInviteUrl.waitFor({ state: 'visible' });
    return (await this.userCreatedInviteUrl.textContent()) ?? '';
  }
}
