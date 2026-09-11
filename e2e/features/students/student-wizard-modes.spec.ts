import { test, expect } from '../../fixtures/base';
import { goToStudentsPage } from '../../fixtures/testUsers';

/** Same convention as course-enrollment.spec.ts. */
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

test.describe(
  "The Students-screen wizard keeps its Courses and Extra-Curriculars tabs",
  { tag: '@272IT2' },
  () => {
    test('the tab strip shows a Courses tab and an Extra-Curriculars tab', async ({ page }) => {
      const studentsPage = await goToStudentsPage(page);
      // A phase is required for the Extra-Curriculars tab to be offered at
      // all (independent of #293 — true before this story too), so the
      // Student tab is filled in to reach the state where "still presented"
      // is meaningful to check.
      await studentsPage.startCreatingStudent({
        firstName: 'Regression',
        lastName: uniqueSurname('EnrolledTabs'),
        ...studentDefaults,
      });

      await expect(studentsPage.wizardModal.locator('#tabCourses')).toBeVisible();
      await expect(studentsPage.wizardModal.locator('#tabExtraCurriculars')).toBeVisible();
    });
  },
);

test.describe(
  'Saving a Students-screen student with no course selected is refused',
  { tag: '@272IT3' },
  () => {
    test('the save is refused, the at-least-one-course requirement is stated, and no student is created', async ({
      page,
    }) => {
      const studentsPage = await goToStudentsPage(page);
      const surname = uniqueSurname('NoCourse');

      await studentsPage.startCreatingStudent({ firstName: 'Palesa', lastName: surname, ...studentDefaults });
      await studentsPage.goToNextStep(); // Student -> Siblings
      await studentsPage.goToNextStep(); // Siblings -> Guardians
      await studentsPage.goToNextStep(); // Guardians -> Courses
      await studentsPage.goToNextStep(); // Courses -> Extra-Curriculars (final step, carries Save)
      await studentsPage.saveStudent();

      // Save refuses and returns the wizard to Courses, where the
      // at-least-one-course requirement is stated — the same rule
      // course-enrollment.spec.ts's @9IT8 proves for withdrawal, exercised
      // here at creation instead.
      await expect(studentsPage.coursesStepMessage()).toContainText(
        'A student must be enrolled in at least one course before they can be saved.',
      );
      await studentsPage.filterByName(surname);
      await expect(studentsPage.row(surname)).toHaveCount(0);
    });
  },
);

test.describe(
  'The wizard opened from the Students screen presents exactly its five tabs',
  { tag: '@272IT33' },
  () => {
    test('shows Student, Siblings, Guardians, Courses and Extra-Curriculars, and no Waiting List tab', async ({
      page,
    }) => {
      const studentsPage = await goToStudentsPage(page);
      await studentsPage.startCreatingStudent({
        firstName: 'Regression',
        lastName: uniqueSurname('FullTabSet'),
        ...studentDefaults,
      });

      await expect(studentsPage.visibleTabs()).toHaveCount(5);
      await expect(studentsPage.wizardModal.locator('#tabWaitingList')).toBeHidden();
    });
  },
);
