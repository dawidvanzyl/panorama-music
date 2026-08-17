import type { Page } from '@playwright/test';
import { expect } from './base';
import { extractTokenFromUrl } from './url';
import { LoginPage } from '../pages/identity/auth/LoginPage';
import { RegistrationPage } from '../pages/identity/auth/RegistrationPage';
import { AdminUsersPage, type UserRole } from '../pages/identity/admin/AdminUsersPage';
import { StudentsPage } from '../pages/students/StudentsPage';
import { GuardianRelationshipsPage } from '../pages/students/GuardianRelationshipsPage';
import { TeachersPage } from '../pages/teachers/TeachersPage';
import { CourseManagementPage } from '../pages/courses/CourseManagementPage';
import { landingUrl } from './navigation';
import { seedEnrollmentTarget } from './enrollment';

const ADMIN_EMAIL = process.env.Admin__Email ?? 'admin@panorama-music.com';
const ADMIN_PASSWORD = process.env.Admin__Password ?? 'ChangeMe123!';

export function uniqueTestEmail(label: string): string {
  return `e2e-${label}-${Date.now()}-${crypto.randomUUID()}@panorama-music.qa`;
}

/**
 * Signs the seeded Admin in and leaves the browser on the Admin landing page.
 * Every `goTo*Page` helper starts here, so the sign-in sequence is written once.
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.gotoLogin();
  await loginPage.login(ADMIN_EMAIL, ADMIN_PASSWORD);
  await expect(page).toHaveURL(landingUrl('Admin'));
}

export async function goToAdminUsersPage(page: Page): Promise<AdminUsersPage> {
  await loginAsAdmin(page);

  const adminUsersPage = new AdminUsersPage(page);
  await adminUsersPage.gotoAdminUsers();
  return adminUsersPage;
}

/**
 * A student must be enrolled in at least one course, so a course and a teacher
 * are seeded before the screen is opened — the enroll form reads both once on
 * mount and holds them for the session, so seeding after navigation would leave
 * its selects empty.
 */
export async function goToStudentsPage(page: Page): Promise<StudentsPage> {
  await loginAsAdmin(page);
  await seedEnrollmentTarget(page);

  const studentsPage = new StudentsPage(page);
  await studentsPage.gotoStudents();
  return studentsPage;
}

export async function goToGuardianRelationshipsPage(page: Page): Promise<GuardianRelationshipsPage> {
  await loginAsAdmin(page);

  const guardianRelationshipsPage = new GuardianRelationshipsPage(page);
  await guardianRelationshipsPage.gotoGuardianRelationships();
  return guardianRelationshipsPage;
}

export async function goToCourseManagementPage(page: Page): Promise<CourseManagementPage> {
  await loginAsAdmin(page);

  const courseManagementPage = new CourseManagementPage(page);
  await courseManagementPage.gotoCourses();
  return courseManagementPage;
}

export async function goToTeachersPage(page: Page): Promise<TeachersPage> {
  await loginAsAdmin(page);

  const teachersPage = new TeachersPage(page);
  await teachersPage.gotoTeachers();
  return teachersPage;
}

export async function inviteUser(page: Page, email: string, roles: UserRole[] = ['Teacher']): Promise<string> {
  const adminUsersPage = await goToAdminUsersPage(page);
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
