import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToStudentsPage, loginAsRoles } from '../../fixtures/testUsers';
import { seedEnrolledStudent, seedEnrollmentTarget } from '../../fixtures/enrollment';
import { uniqueToken } from '../../fixtures/studentPrint';
import { StudentsPage } from '../../pages/students/StudentsPage';

const studentDefaults = {
  dateOfBirth: '2014-05-12',
  grade: 'Grade4' as const,
  class: 'A1' as const,
  phase: 'Junior' as const,
  language: 'English' as const,
};

/** Opens the create wizard on the Student step with valid fields, then clicks Next `steps` times. */
async function createWizardAtStep(page: Page, steps: number): Promise<StudentsPage> {
  const studentsPage = await goToStudentsPage(page);
  await studentsPage.startCreatingStudent({
    firstName: 'Entry',
    lastName: `Entry${uniqueToken()}`,
    ...studentDefaults,
  });
  for (let i = 0; i < steps; i += 1) {
    await studentsPage.goToNextStep();
  }
  return studentsPage;
}

/** Seeds one saved student with a course and finds it on the Students roster. */
async function savedStudent(page: Page): Promise<{ studentsPage: StudentsPage; surname: string }> {
  await loginAsRoles(page, ['Teacher', 'Coordinator']);
  const target = await seedEnrollmentTarget(page);
  const surname = `Saved${uniqueToken()}`;
  await seedEnrolledStudent(page, target, surname);

  await page.reload();
  const studentsPage = new StudentsPage(page);
  await studentsPage.gotoStudents();
  await studentsPage.filterByName(surname);
  await expect(studentsPage.row(surname)).toBeVisible();
  return { studentsPage, surname };
}

// Each step keeps its collapsed form or panel in the page, clipped to zero height. The
// clipped confirm still counts as a visible button, so the entry point is addressed by
// its hook and the form's confirm is counted only once the form is open.

test.describe('Entry points — the Guardians step offers "Create Guardian"', { tag: ['@267IT34'] }, () => {
  test('create wizard: the entry point opens the guardian form', async ({ page }) => {
    const studentsPage = await createWizardAtStep(page, 2);
    const step = studentsPage.wizardModal.locator('#guardiansStep');
    const entryPoint = step.locator('#addBtn');

    await expect(entryPoint).toBeVisible();
    await expect(entryPoint).toHaveAccessibleName('Create Guardian');
    await expect(step.getByRole('button', { name: 'Add Guardian', exact: true })).toHaveCount(0);

    await entryPoint.click();

    await expect(step.locator('#guardianForm')).toBeVisible();
    await expect(entryPoint).toBeHidden();
    await expect(step.getByRole('button', { name: 'Create Guardian', exact: true })).toHaveCount(1);
  });

  test('edit wizard on a saved student: the same entry point', async ({ page }) => {
    const { studentsPage, surname } = await savedStudent(page);
    await studentsPage.openGuardiansTab(surname);

    const step = studentsPage.wizardModal.locator('#guardiansStep');
    await expect(step.locator('#addBtn')).toBeVisible();
    await expect(step.locator('#addBtn')).toHaveAccessibleName('Create Guardian');
    await expect(step.getByRole('button', { name: 'Add Guardian', exact: true })).toHaveCount(0);
  });
});

test.describe('Entry points — the Courses step offers "Enrol Student"', { tag: ['@267IT35'] }, () => {
  test('create wizard: the entry point opens the enrollment form', async ({ page }) => {
    const studentsPage = await createWizardAtStep(page, 3);
    const step = studentsPage.wizardModal.locator('#coursesStep');
    const entryPoint = step.locator('#enrollBtn');

    await expect(entryPoint).toBeVisible();
    await expect(entryPoint).toHaveAccessibleName('Enrol Student');
    await expect(step.getByRole('button', { name: 'Enroll in Course', exact: true })).toHaveCount(0);

    await entryPoint.click();

    await expect(step.locator('#enrollmentForm')).toBeVisible();
    await expect(entryPoint).toBeHidden();
    await expect(step.getByRole('button', { name: 'Enrol Student', exact: true })).toHaveCount(1);
  });

  test('edit wizard on a saved student: the same entry point', async ({ page }) => {
    const { studentsPage, surname } = await savedStudent(page);
    await studentsPage.openCoursesTab(surname);

    const step = studentsPage.wizardModal.locator('#coursesStep');
    await expect(step.locator('#enrollBtn')).toBeVisible();
    await expect(step.locator('#enrollBtn')).toHaveAccessibleName('Enrol Student');
    await expect(step.getByRole('button', { name: 'Enroll in Course', exact: true })).toHaveCount(0);
  });
});

test.describe(
  'Entry points — the Extra-Curriculars step offers "Assign Activity"',
  { tag: ['@267IT36'] },
  () => {
    test('create wizard: the entry point opens the activity panel', async ({ page }) => {
      const studentsPage = await createWizardAtStep(page, 4);
      const step = studentsPage.extraCurricularsStep();
      const entryPoint = step.locator('#addBtn');

      await expect(entryPoint).toBeVisible();
      await expect(entryPoint).toHaveAccessibleName('Assign Activity');
      await expect(step.getByRole('button', { name: 'Add Activity', exact: true })).toHaveCount(0);

      await studentsPage.openAddActivityPanel();

      await expect(step.locator('#panel')).toBeVisible();
      await expect(entryPoint).toBeHidden();
      await expect(step.getByRole('button', { name: 'Assign Activity', exact: true })).toHaveCount(1);
    });

    test('edit wizard on a saved student: the same entry point', async ({ page }) => {
      const { studentsPage, surname } = await savedStudent(page);
      await studentsPage.openExtraCurricularsTab(surname);

      const step = studentsPage.extraCurricularsStep();
      await expect(step.locator('#addBtn')).toBeVisible();
      await expect(step.locator('#addBtn')).toHaveAccessibleName('Assign Activity');
      await expect(step.getByRole('button', { name: 'Add Activity', exact: true })).toHaveCount(0);
    });
  },
);
