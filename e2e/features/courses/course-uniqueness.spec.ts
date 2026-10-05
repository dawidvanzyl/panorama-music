import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToCourseManagementPage } from '../../fixtures/testUsers';
import { seedEnrollmentTarget } from '../../fixtures/enrollment';
import type { CourseManagementPage } from '../../pages/courses/CourseManagementPage';

const COURSE_TYPE = 'Grade 2 Recorder';
const LESSON_STRUCTURE = 'Group · Half Hour · During School';
const REFUSAL = 'Course already exists';

/**
 * A cost no other run has used and that differs from the existing course's. The
 * whole part is the clock in milliseconds and the cents carry the worker index, so
 * the existing course's cost, which always ends in .00, can never equal it.
 */
function costDifferentFrom(existingCost: string): string {
  const whole = (Date.now() + 7) % 100_000_000;
  const cents = String((test.info().workerIndex % 98) + 1).padStart(2, '0');
  const cost = `${whole}.${cents}`;
  return cost === existingCost ? `${(whole + 1) % 100_000_000}.01` : cost;
}

/**
 * Opens Course Management after the shared pair's course is known to exist. The
 * catalogue is read once per session, so the screen is reloaded after seeding.
 */
async function openWithExistingCourse(page: Page) {
  const coursesPage = await goToCourseManagementPage(page);
  const existing = await seedEnrollmentTarget(page);
  await coursesPage.reloadCourses();
  return { coursesPage, existingCost: existing.courseCost };
}

async function expectOnlyTheExistingCourse(coursesPage: CourseManagementPage, existingCost: string) {
  await expect(coursesPage.row(COURSE_TYPE, 'Group · Half Hour', 'During School', `R ${existingCost}`)).toHaveCount(1);
  await expect(coursesPage.row(COURSE_TYPE, 'Group · Half Hour', 'During School')).toHaveCount(1);
}

test.describe(
  'Course uniqueness — a course type and lesson structure identify one course',
  { tag: ['@308IT1'] },
  () => {
    test('S1 — a second course for an existing pair, at a different price, is refused on the form', async ({
      page,
    }) => {
      const { coursesPage, existingCost } = await openWithExistingCourse(page);
      const attemptedCost = costDifferentFrom(existingCost);

      await coursesPage.createCourse({
        courseTypeLabel: COURSE_TYPE,
        cost: attemptedCost,
        lessonStructureLabel: LESSON_STRUCTURE,
      });

      await expect(coursesPage.formError()).toHaveText(REFUSAL);
      await expect(coursesPage.formCourseType()).toHaveText(COURSE_TYPE);
      await expect(coursesPage.formCost()).toHaveValue(attemptedCost);
      await expect(coursesPage.formLessonStructure()).toHaveText(LESSON_STRUCTURE);
      await expect(coursesPage.row(COURSE_TYPE, `R ${attemptedCost}`)).toHaveCount(0);

      await coursesPage.reloadCourses();

      await expect(coursesPage.row(COURSE_TYPE, `R ${attemptedCost}`)).toHaveCount(0);
      await expectOnlyTheExistingCourse(coursesPage, existingCost);
    });

    test('S2 — an identical resubmission, same price included, is refused the same way', async ({ page }) => {
      const { coursesPage, existingCost } = await openWithExistingCourse(page);

      await coursesPage.createCourse({
        courseTypeLabel: COURSE_TYPE,
        cost: existingCost,
        lessonStructureLabel: LESSON_STRUCTURE,
      });

      await expect(coursesPage.formError()).toHaveText(REFUSAL);

      await coursesPage.reloadCourses();

      await expectOnlyTheExistingCourse(coursesPage, existingCost);
    });
  },
);
