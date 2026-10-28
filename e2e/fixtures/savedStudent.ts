import type { Page } from '@playwright/test';
import { test, expect } from './base';
import { loginAsRoles } from './testUsers';
import { seedEnrolledStudent, seedEnrollmentTarget } from './enrollment';
import { StudentsPage } from '../pages/students/StudentsPage';

/** A surname no other worker or run shares. */
export function uniqueStudentSurname(label: string): string {
  return `${label}${Date.now()}W${test.info().workerIndex}`;
}

/** Signs in, seeds one saved student with a course, and opens the Students roster with that student found. */
export async function openSavedStudent(
  page: Page,
  label: string,
): Promise<{ studentsPage: StudentsPage; surname: string; studentId: string }> {
  await loginAsRoles(page, ['Teacher', 'Coordinator']);
  const target = await seedEnrollmentTarget(page);
  const surname = uniqueStudentSurname(label);
  const studentId = await seedEnrolledStudent(page, target, surname);

  await page.reload();
  const studentsPage = new StudentsPage(page);
  await studentsPage.gotoStudents();
  await studentsPage.filterByName(surname);
  await expect(studentsPage.row(surname)).toBeVisible();
  return { studentsPage, surname, studentId };
}
