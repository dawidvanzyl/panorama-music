import type { Page } from '@playwright/test';
import { expect } from './base';
import { extractTokenFromUrl } from './url';
import { LoginPage } from '../pages/identity/auth/LoginPage';
import { RegistrationPage } from '../pages/identity/auth/RegistrationPage';
import { AdminUsersPage, type UserRole } from '../pages/identity/admin/AdminUsersPage';

const ADMIN_EMAIL = process.env.Admin__Email ?? 'admin@panorama-music.com';
const ADMIN_PASSWORD = process.env.Admin__Password ?? 'ChangeMe123!';

export function uniqueTestEmail(label: string): string {
  return `e2e-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@panorama-music.qa`;
}

export async function inviteUser(page: Page, email: string, roles: UserRole[] = ['Teacher']): Promise<string> {
  const loginPage = new LoginPage(page);
  const adminUsersPage = new AdminUsersPage(page);

  await loginPage.gotoLogin();
  await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page).toHaveURL(/#\/$/);

  await adminUsersPage.gotoAdminUsers();
  const inviteUrl = await adminUsersPage.createUser(email, roles);
  return extractTokenFromUrl(inviteUrl);
}

export async function registerUser(page: Page, inviteToken: string, password: string): Promise<void> {
  const registrationPage = new RegistrationPage(page);
  await registrationPage.gotoRegister(inviteToken);
  await registrationPage.register(password, password);
  await expect(page).toHaveURL(/#\/login\?registered=true$/);
}

export async function createRegisteredUser(
  page: Page,
  email: string,
  password: string,
  roles: UserRole[] = ['Teacher'],
): Promise<void> {
  const inviteToken = await inviteUser(page, email, roles);
  await registerUser(page, inviteToken, password);
}
