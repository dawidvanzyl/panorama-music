import type { Page } from '@playwright/test';
import { expect } from './base';

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
