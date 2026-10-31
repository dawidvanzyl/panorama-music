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
import { ReportsPage } from '../pages/reports/ReportsPage';
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

const TOKEN_SAFETY_MARGIN_MS = 60_000;

let sharedAdminToken: { value: string; expiresAt: number } | undefined;

/**
 * An Admin token that every user seeded by this worker shares. Each sign-in
 * hashes a password and adds a session row, and seeding signs the Admin in once
 * per user, so one token per worker saves hundreds of sign-ins per run. The
 * token is renewed shortly before it expires, and on demand when the API
 * refuses it.
 */
async function sharedAdminAccessToken(page: Page, renew = false): Promise<string> {
  if (!renew && sharedAdminToken && sharedAdminToken.expiresAt - TOKEN_SAFETY_MARGIN_MS > Date.now()) {
    return sharedAdminToken.value;
  }
  const response = await page.request.post('/api/auth/login', {
    data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  });
  const { accessToken, accessTokenExpiresAt } = (await response.json()) as {
    accessToken: string;
    accessTokenExpiresAt: string;
  };
  sharedAdminToken = { value: accessToken, expiresAt: Date.parse(accessTokenExpiresAt) };
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
export async function loginAsRoles(
  page: Page,
  roles: UserRole[],
  { land = true }: { land?: boolean } = {}
): Promise<string> {
  const email = uniqueTestEmail(roles.join('-').toLowerCase());
  const password = 'RolesPass123!';
  await createRegisteredUser(page, email, password, roles);
  await signInThroughApi(page, email, password);
  // A caller that opens its own page next passes `land: false`: the landing
  // page it would wait for here is a page load that caller throws away.
  if (land) {
    await page.goto('/#/');
    await expect(page).toHaveURL(landingUrl(...roles));
  }
  return email;
}

/**
 * Starts the session the sign-in form would, without rendering the form: the
 * login call sets the refresh cookie on the browser context, and the access
 * token is stored the way the app's own `storeTokens` stores it. `/api/health`
 * is only a cheap same-origin document to hold the storage write.
 */
async function signInThroughApi(page: Page, email: string, password: string): Promise<void> {
  const response = await page.request.post('/api/auth/login', { data: { email, password } });
  expect(response.ok()).toBe(true);
  const { accessToken, accessTokenExpiresAt } = (await response.json()) as {
    accessToken: string;
    accessTokenExpiresAt: string;
  };

  await page.goto('/api/health');
  await page.evaluate(
    ([token, expiresAt]) => {
      localStorage.setItem('pm_access_token', token);
      localStorage.setItem('pm_expires_at', expiresAt);
    },
    [accessToken, accessTokenExpiresAt]
  );
}

/**
 * A student must hold at least one course or one extra-curricular, so a course
 * and a teacher are seeded before the screen is opened — the enroll form reads both once on
 * mount and holds them for the session. Student Management is this account's
 * own landing page (Teacher is topmost among its roles), so it must not be
 * mounted before the seed call below runs. Signing in without landing, then
 * opening the screen once, gives the first mount the just-seeded data.
 * Seeding a teacher and a course needs Coordinator alongside the Teacher role
 * this screen itself requires, so the signed-in account holds both.
 */
export async function goToStudentsPage(page: Page): Promise<StudentsPage> {
  await loginAsRoles(page, ['Teacher', 'Coordinator'], { land: false });
  await seedEnrollmentTarget(page);

  const studentsPage = new StudentsPage(page);
  await studentsPage.gotoStudents();
  return studentsPage;
}

export async function goToGuardianRelationshipsPage(
  page: Page
): Promise<GuardianRelationshipsPage> {
  await loginAsRoles(page, ['Coordinator'], { land: false });

  const guardianRelationshipsPage = new GuardianRelationshipsPage(page);
  await guardianRelationshipsPage.gotoGuardianRelationships();
  return guardianRelationshipsPage;
}

export async function goToCourseManagementPage(page: Page): Promise<CourseManagementPage> {
  await loginAsRoles(page, ['Coordinator'], { land: false });

  const courseManagementPage = new CourseManagementPage(page);
  await courseManagementPage.gotoCourses();
  return courseManagementPage;
}

/**
 * Extra-curriculars are a Coordinator-owned area, so this one pays for an
 * invite-and-register round trip before it can open the screen at all.
 */
export async function goToExtraCurricularsPageAsCoordinator(
  page: Page
): Promise<ExtraCurricularsPage> {
  await loginAsRoles(page, ['Coordinator'], { land: false });

  const extraCurricularsPage = new ExtraCurricularsPage(page);
  await extraCurricularsPage.gotoExtraCurriculars();
  return extraCurricularsPage;
}

/** Signs in holding exactly these roles and opens Waiting List — Teacher and Coordinator both read it. */
export async function goToWaitingListPage(page: Page, roles: UserRole[]): Promise<WaitingListPage> {
  await loginAsRoles(page, roles, { land: false });

  const waitingListPage = new WaitingListPage(page);
  await waitingListPage.gotoWaitingList();
  return waitingListPage;
}

/**
 * Signs in holding Teacher (+Coordinator, for scenarios that go on to seed a
 * course and students) and opens the Reports list, which is Teacher's own
 * landing page.
 */
export async function goToReportsPage(
  page: Page,
  roles: UserRole[] = ['Teacher']
): Promise<ReportsPage & { email: string }> {
  const email = await loginAsRoles(page, roles, { land: false });

  const reportsPage = new ReportsPage(page);
  await reportsPage.gotoReports();
  return Object.assign(reportsPage, { email });
}

export async function goToTeachersPage(page: Page): Promise<TeachersPage> {
  await loginAsRoles(page, ['Coordinator'], { land: false });

  const teachersPage = new TeachersPage(page);
  await teachersPage.gotoTeachers();
  return teachersPage;
}

export async function goToTeachersPageAsBankingCoordinator(page: Page): Promise<TeachersPage> {
  await loginAsRoles(page, ['BankingCoordinator'], { land: false });

  const teachersPage = new TeachersPage(page);
  await teachersPage.gotoTeachers();
  return teachersPage;
}

export async function inviteUser(
  page: Page,
  email: string,
  roles: UserRole[] = ['Teacher']
): Promise<string> {
  const adminUsersPage = await goToAdminUsersPage(page);
  const inviteUrl = await adminUsersPage.createUser(email, roles);
  return extractTokenFromUrl(inviteUrl);
}

export async function registerUser(
  page: Page,
  inviteToken: string,
  password: string
): Promise<void> {
  const registrationPage = new RegistrationPage(page);
  await registrationPage.gotoRegister(inviteToken);
  await registrationPage.register(password, password);
  await expect(page).toHaveURL(/#\/login\?registered=true$/);
}

export async function createRegisteredUser(
  page: Page,
  email: string,
  password: string,
  roles: UserRole[] = ['Teacher']
): Promise<void> {
  const createUser = async (renew: boolean) =>
    page.request.post('/api/users', {
      headers: { Authorization: `Bearer ${await sharedAdminAccessToken(page, renew)}` },
      data: { email, roles },
    });
  let created = await createUser(false);
  if (created.status() === 401) created = await createUser(true);
  expect(created.status()).toBe(201);
  const { inviteUrl } = (await created.json()) as { inviteUrl: string };

  const completed = await page.request.post('/api/auth/complete-registration', {
    data: { inviteToken: extractTokenFromUrl(inviteUrl), newPassword: password },
  });
  expect(completed.ok()).toBe(true);
}
