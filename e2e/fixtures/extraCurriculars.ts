import type { Page } from '@playwright/test';
import { expect } from './base';

export interface SeedActivityOptions {
  description: string;
  phase: 'Junior' | 'Senior';
  practiceTimes: { day: string; startTime: string }[];
}

export interface SeededActivity {
  extraCurricularId: string;
}

/**
 * Creates a Junior/Senior activity with its practice times, through the real
 * `POST /api/extra-curriculars` (CoordinatorPolicy), from inside the
 * signed-in session so the request carries its bearer token.
 */
export async function seedActivity(
  page: Page,
  options: SeedActivityOptions
): Promise<SeededActivity> {
  const created = await page.evaluate(async (options) => {
    const response = await fetch('/api/extra-curriculars', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
      },
      body: JSON.stringify(options),
    });
    const body = (await response.json()) as { extraCurricularId: string };
    return { status: response.status, extraCurricularId: body.extraCurricularId };
  }, options);

  expect(created.status).toBe(201);
  return { extraCurricularId: created.extraCurricularId };
}

/**
 * Assigns a student to an activity through the real
 * `POST /api/students/{id}/extra-curriculars` (TeacherPolicy).
 */
export async function assignActivity(
  page: Page,
  studentId: string,
  extraCurricularId: string
): Promise<void> {
  const status = await page.evaluate(
    async ({ studentId, extraCurricularId }) => {
      const response = await fetch(`/api/students/${studentId}/extra-curriculars`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
        },
        body: JSON.stringify({ extraCurricularId }),
      });
      return response.status;
    },
    { studentId, extraCurricularId }
  );

  expect(status).toBe(201);
}
