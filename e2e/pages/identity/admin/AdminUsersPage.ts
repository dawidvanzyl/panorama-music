import type { Locator, Page } from '@playwright/test';
import { BasePage } from '../../BasePage';

export type UserRole = 'Teacher' | 'Admin';

const ALL_ROLES: UserRole[] = ['Teacher', 'Admin'];

export class AdminUsersPage extends BasePage {
  readonly emailInput: Locator;
  readonly roleTeacherCheckbox: Locator;
  readonly roleAdminCheckbox: Locator;
  readonly submitButton: Locator;
  readonly userCreatedInviteUrl: Locator;
  readonly deactivateModalConfirmButton: Locator;
  readonly deleteModalConfirmInput: Locator;
  readonly deleteModalConfirmButton: Locator;

  constructor(page: Page) {
    super(page);
    this.emailInput = page.locator('#email');
    this.roleTeacherCheckbox = page.locator('#roleTeacher');
    this.roleAdminCheckbox = page.locator('#roleAdmin');
    this.submitButton = page.locator('#submitBtn');
    this.userCreatedInviteUrl = page.locator('#userCreatedBanner').locator('#inviteUrl');
    this.deactivateModalConfirmButton = page.locator('#deactivateModal').locator('#deactivateBtn');
    this.deleteModalConfirmInput = page.locator('#deleteModal').locator('#confirmInput');
    this.deleteModalConfirmButton = page.locator('#deleteModal').locator('#deleteBtn');
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

  row(email: string): Locator {
    return this.page.locator('tr').filter({ hasText: email });
  }

  status(email: string): Locator {
    return this.row(email).locator('.users-table__status');
  }

  async editRoles(email: string, roles: UserRole[]): Promise<void> {
    const row = this.row(email);
    await row.locator('.users-table__btn--edit').click();

    for (const role of ALL_ROLES) {
      const checkbox = row.locator(`input[type="checkbox"][value="${role}"]`);
      if ((await checkbox.isChecked()) !== roles.includes(role)) {
        await checkbox.click();
      }
    }

    await row.locator('.users-table__btn--save').click();
  }

  async deactivateUser(email: string): Promise<void> {
    await this.row(email).locator('.users-table__btn--deactivate').click();
    await this.deactivateModalConfirmButton.click();
  }

  async activateUser(email: string): Promise<void> {
    await this.row(email).locator('.users-table__btn--activate').click();
  }

  async permanentlyDeleteUser(email: string): Promise<void> {
    await this.row(email).locator('.users-table__btn--delete').click();
    await this.deleteModalConfirmInput.fill(email);
    await this.deleteModalConfirmButton.click();
  }
}
