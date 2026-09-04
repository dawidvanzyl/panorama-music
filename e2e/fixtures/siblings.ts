import type { Page } from '@playwright/test';
import { expect } from './base';

/**
 * Links two students as siblings through the real endpoint, from the signed-in
 * session. The Students screen's own sibling control cannot do this for a
 * waiting-list student: that screen never lists one, so there is no row to open
 * and no candidate to pick.
 *
 * The link is symmetric, and creating it shares each student's existing
 * guardians with the other — so what a guardian ends up shared with depends on
 * whether it was added before or after this call.
 */
export async function linkSiblings(page: Page, studentId: string, siblingId: string): Promise<void> {
  const status = await page.evaluate(
    async ({ studentId, siblingId }) => {
      const response = await fetch(`/api/students/${studentId}/siblings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
        },
        body: JSON.stringify({ siblingId }),
      });
      return response.status;
    },
    { studentId, siblingId }
  );

  expect(status).toBe(201);
}
