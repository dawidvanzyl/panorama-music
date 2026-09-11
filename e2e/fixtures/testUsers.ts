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
import { ExtraCurricularsPage } from '../pages/extra-curriculars/ExtraCurricularsPage';
import { WaitingListPage } from '../pages/students/WaitingListPage';
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

/**
 * Fetches an access token for the seeded Admin over the API directly, without
 * touching the page's own session — for the rare check that needs an
 * Admin-only read (e.g. the audit log) alongside another role's UI session.
 */
export async function getAdminAccessToken(page: Page): Promise<string> {
  const response = await page.request.post('/api/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const { accessToken } = (await response.json()) as { accessToken: string };
  return accessToken;
}

export async function goToAdminUsersPage(page: Page): Promise<AdminUsersPage> {
  await loginAsAdmin(page);

  const adminUsersPage = new AdminUsersPage(page);
  await adminUsersPage.gotoAdminUsers();
  return adminUsersPage;
}

/**
 * Creates a registered user holding exactly the given roles, signs them in,
 * and leaves the browser on their landing page. Admin no longer owns any of
 * Students, Guardian Relationships, Courses, or Teachers — #273 moved each to
 * the role that actually maintains it — so every navigation helper below
 * signs in as a purpose-built account instead of the seeded Admin.
 */
export async function loginAsRoles(page: Page, roles: UserRole[]): Promise<void> {
  const email = uniqueTestEmail(roles.join('-').toLowerCase());
  const password = 'RolesPass123!';
  await createRegisteredUser(page, email, password, roles);

  const loginPage = new LoginPage(page);
  await loginPage.gotoLogin();
  await loginPage.login(email, password);
  await expect(page).toHaveURL(landingUrl(...roles));
}

/**
 * A student must be enrolled in at least one course, so a course and a teacher
 * are seeded before the screen is opened — the enroll form reads both once on
 * mount and holds them for the session. Student Management is this account's
 * own landing page (Teacher is topmost among its roles), so signing in has
 * already mounted it before the seed call below runs; a same-hash `goto` to a
 * path the browser is already on is a no-op, not a remount, so the reload is
 * what actually makes the enroll form's lookups see the just-seeded data.
 * Seeding a teacher and a course needs Coordinator alongside the Teacher role
 * this screen itself requires, so the signed-in account holds both.
 */
export async function goToStudentsPage(page: Page): Promise<StudentsPage> {
  await loginAsRoles(page, ['Teacher', 'Coordinator']);
  await seedEnrollmentTarget(page);
  await page.reload();

  const studentsPage = new StudentsPage(page);
  await studentsPage.gotoStudents();
  return studentsPage;
}

export async function goToGuardianRelationshipsPage(page: Page): Promise<GuardianRelationshipsPage> {
  await loginAsRoles(page, ['Coordinator']);

  const guardianRelationshipsPage = new GuardianRelationshipsPage(page);
  await guardianRelationshipsPage.gotoGuardianRelationships();
  return guardianRelationshipsPage;
}

export async function goToCourseManagementPage(page: Page): Promise<CourseManagementPage> {
  await loginAsRoles(page, ['Coordinator']);

  const courseManagementPage = new CourseManagementPage(page);
  await courseManagementPage.gotoCourses();
  return courseManagementPage;
}

/**
 * Extra-curriculars are a Coordinator-owned area, so this one pays for an
 * invite-and-register round trip before it can open the screen at all.
 */
export async function goToExtraCurricularsPageAsCoordinator(page: Page): Promise<ExtraCurricularsPage> {
  await loginAsRoles(page, ['Coordinator']);

  const extraCurricularsPage = new ExtraCurricularsPage(page);
  await extraCurricularsPage.gotoExtraCurriculars();
  return extraCurricularsPage;
}

/** Signs in holding exactly these roles and opens Waiting List — Teacher and Coordinator both read it. */
export async function goToWaitingListPage(page: Page, roles: UserRole[]): Promise<WaitingListPage> {
  await loginAsRoles(page, roles);

  const waitingListPage = new WaitingListPage(page);
  await waitingListPage.gotoWaitingList();
  return waitingListPage;
}

export async function goToTeachersPage(page: Page): Promise<TeachersPage> {
  await loginAsRoles(page, ['Coordinator']);

  const teachersPage = new TeachersPage(page);
  await teachersPage.gotoTeachers();
  return teachersPage;
}

export async function goToTeachersPageAsBankingCoordinator(page: Page): Promise<TeachersPage> {
  await loginAsRoles(page, ['BankingCoordinator']);

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
