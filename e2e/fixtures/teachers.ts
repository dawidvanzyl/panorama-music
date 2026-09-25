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
