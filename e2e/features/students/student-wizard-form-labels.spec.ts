import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToStudentsPage, loginAsRoles } from '../../fixtures/testUsers';
import { seedEnrolledStudent, seedEnrollmentTarget } from '../../fixtures/enrollment';
import { StudentsPage } from '../../pages/students/StudentsPage';

function uniqueSurname(label: string): string {
  return `${label}${Date.now()}W${test.info().workerIndex}`;
}

const studentDefaults = {
  dateOfBirth: '2014-05-12',
  grade: 'Grade4' as const,
  class: 'A1' as const,
  phase: 'Junior' as const,
  language: 'English' as const,
};

/** Opens the create wizard on the Student step, with valid student fields. */
async function startCreateWizard(page: Page): Promise<StudentsPage> {
  const studentsPage = await goToStudentsPage(page);
  await studentsPage.startCreatingStudent({
    firstName: 'Label',
    lastName: uniqueSurname('Labels'),
    ...studentDefaults,
  });
  return studentsPage;
}

/** Signs in, seeds one saved student with a course, and opens the Students roster with that student found. */
async function openSavedStudent(page: Page): Promise<{ studentsPage: StudentsPage; surname: string }> {
  await loginAsRoles(page, ['Teacher', 'Coordinator']);
  const target = await seedEnrollmentTarget(page);
  const surname = uniqueSurname('Labelled');
  await seedEnrolledStudent(page, target, surname);

  await page.reload();
  const studentsPage = new StudentsPage(page);
  await studentsPage.gotoStudents();
  await studentsPage.filterByName(surname);
  await expect(studentsPage.row(surname)).toBeVisible();
  return { studentsPage, surname };
}

async function expectCancelThenConfirm(row: Locator, confirmName: string): Promise<void> {
  const buttons = row.getByRole('button');
  await expect(buttons).toHaveCount(2);
  await expect(buttons.nth(0)).toHaveAccessibleName('Cancel');
  await expect(buttons.nth(1)).toHaveAccessibleName(confirmName);
}

test.describe(
  'Form labels — the guardian form confirms with "Create Guardian"',
  { tag: ['@267IT20'] },
  () => {
    test('create wizard: the guardian form confirms with "Create Guardian"', async ({ page }) => {
      const studentsPage = await startCreateWizard(page);
      await studentsPage.goToNextStep(); // Student -> Siblings
      await studentsPage.goToNextStep(); // Siblings -> Guardians
      await studentsPage.openAddGuardianForm();

      const step = studentsPage.wizardModal.locator('#guardiansStep');
      const form = step.locator('#guardianForm');
      await expect(form.getByRole('button', { name: 'Create Guardian', exact: true })).toBeVisible();
      await expectCancelThenConfirm(form.getByTestId('form-actions'), 'Create Guardian');
      await expect(step.getByRole('button', { name: 'Add', exact: true })).toHaveCount(0);
    });

    test('edit wizard on a saved student: the same label', async ({ page }) => {
      const { studentsPage, surname } = await openSavedStudent(page);
      await studentsPage.openGuardiansTab(surname);
      await studentsPage.openAddGuardianForm();

      const step = studentsPage.wizardModal.locator('#guardiansStep');
      await expect(
        step.locator('#guardianForm').getByRole('button', { name: 'Create Guardian', exact: true }),
      ).toBeVisible();
      await expect(step.getByRole('button', { name: 'Add', exact: true })).toHaveCount(0);
    });
  },
);

test.describe(
  'Form labels — the enrollment form confirms with "Enrol Student"',
  { tag: ['@267IT23'] },
  () => {
    test('create wizard: the label that read "Add"', async ({ page }) => {
      const studentsPage = await startCreateWizard(page);
      await studentsPage.goToNextStep(); // Student -> Siblings
      await studentsPage.goToNextStep(); // Siblings -> Guardians
      await studentsPage.goToNextStep(); // Guardians -> Courses

      const step = studentsPage.wizardModal.locator('#coursesStep');
      await step.locator('#enrollBtn').click();

      const form = step.locator('#enrollmentForm');
      await expect(form.getByRole('button', { name: 'Enrol Student', exact: true })).toBeVisible();
      await expectCancelThenConfirm(form.getByTestId('form-actions'), 'Enrol Student');
      await expect(step.getByRole('button', { name: 'Add', exact: true })).toHaveCount(0);
      await expect(step.getByRole('button', { name: 'Enroll', exact: true })).toHaveCount(0);
    });

    test('edit wizard on a saved student: the label that read "Enroll"', async ({ page }) => {
      const { studentsPage, surname } = await openSavedStudent(page);
      await studentsPage.openCoursesTab(surname);

      const step = studentsPage.wizardModal.locator('#coursesStep');
      await step.locator('#enrollBtn').click();

      await expect(
        step.locator('#enrollmentForm').getByRole('button', { name: 'Enrol Student', exact: true }),
      ).toBeVisible();
      await expect(step.getByRole('button', { name: 'Add', exact: true })).toHaveCount(0);
      await expect(step.getByRole('button', { name: 'Enroll', exact: true })).toHaveCount(0);
    });
  },
);
