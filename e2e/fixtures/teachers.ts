import type { Page } from '@playwright/test';
import { expect } from './base';
import { uniqueTestEmail, createRegisteredUser, goToTeachersPage } from './testUsers';
import { LoginPage } from '../pages/identity/auth/LoginPage';
import { landingUrl } from './navigation';

/**
 * Deactivates a teacher through the real endpoint, from the signed-in
 * session. `PATCH /api/teachers/{id}/deactivate` is `BankingCoordinatorPolicy`
 * only, so the caller must hold that role.
 */
export async function deactivateTeacher(page: Page, teacherId: string): Promise<void> {
  const status = await page.evaluate(async (teacherId) => {
    const response = await fetch(`/api/teachers/${teacherId}/deactivate`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    return response.status;
  }, teacherId);

  expect(status).toBe(200);
}

/**
 * A write's response can reach the caller before its transaction commits.
 * Waits until the teacher roster read reports this teacher as no longer active.
 */
export async function waitForTeacherInactive(page: Page, teacherId: string): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(async (teacherId) => {
          const response = await fetch('/api/teachers/roster', {
            headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
          });
          if (!response.ok) return false;
          const teachers = (await response.json()) as { teacherId: string; isActive: boolean }[];
          return teachers.some((teacher) => teacher.teacherId === teacherId && !teacher.isActive);
        }, teacherId),
      { timeout: 10_000 },
    )
    .toBe(true);
}

const LINKED_TEACHER_PASSWORD = 'TeacherSelfServicePass123!';

export function uniqueTeacherName(label: string): { firstName: string; surname: string } {
  return {
    firstName: `E2E-${label}`,
    surname: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
  };
}

/**
 * Creates a teacher as a Coordinator, links it to a freshly registered
 * Teacher-role account, and leaves the browser signed in as that teacher.
 */
export async function signInAsLinkedTeacher(
  page: Page,
  label: string,
): Promise<{ email: string; firstName: string; surname: string }> {
  const email = uniqueTestEmail(label);
  await createRegisteredUser(page, email, LINKED_TEACHER_PASSWORD, ['Teacher']);

  const teachersPage = await goToTeachersPage(page);
  const { firstName, surname } = uniqueTeacherName(label);
  await teachersPage.createTeacher({ firstName, surname, linkedAccountEmail: email });
  await expect(teachersPage.row(`${firstName} ${surname}`)).toBeVisible();

  const loginPage = new LoginPage(page);
  await loginPage.gotoLogin();
  await loginPage.login(email, LINKED_TEACHER_PASSWORD);
  await expect(page).toHaveURL(landingUrl('Teacher'));

  return { email, firstName, surname };
}
