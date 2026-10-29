import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToCourseManagementPage } from '../../fixtures/testUsers';
import { ensureCourseOfType, fetchLessonStructureId } from '../../fixtures/waitingList';
import { blockRequests, clickBackdropLeftThenAbove } from '../../fixtures/modalFrame';
import type { CourseManagementPage } from '../../pages/courses/CourseManagementPage';

/**
 * GR Enrichment on Individual · Hour · After School belongs to this file alone.
 * No fixture ensures it, no other spec enrols into it, and no request to delete
 * it ever reaches the server, so every scenario can run in parallel against the
 * one course. It has no enrolled students, which the Delete Course modal needs.
 */
const COURSE_TYPE = 'GREEnrichment';
const COURSE_TYPE_LABEL = 'GR Enrichment';

interface OpenedCourse {
  coursesPage: CourseManagementPage;
  row: Locator;
  cost: string;
  deletesSent: () => number;
  card: Locator;
}

async function openCoursePage(page: Page): Promise<OpenedCourse> {
  const coursesPage = await goToCourseManagementPage(page);
  const lessonStructureId = await fetchLessonStructureId(page, {
    occurrenceType: 'AfterSchool',
    lessonType: 'Individual',
    durationType: 'Hour',
  });
  const { courseId, cost } = await ensureCourseOfType(page, lessonStructureId, COURSE_TYPE);
  await coursesPage.reloadCourses();
  const deletesSent = await blockRequests(page, 'DELETE', `/api/courses/${courseId}`);
  return {
    coursesPage,
    row: coursesPage.row(COURSE_TYPE_LABEL, `R ${cost}`),
    cost,
    deletesSent,
    card: coursesPage.deleteModal.locator('.modal__card'),
  };
}

function closeControl(coursesPage: CourseManagementPage): Locator {
  return coursesPage.deleteModal.getByRole('button', { name: 'Close', exact: true });
}

test.describe('Delete Course modal — close control', { tag: ['@266IT34'] }, () => {
  test('close dismisses the Delete Course modal and deletes nothing', async ({ page }) => {
    const { coursesPage, row, deletesSent, card } = await openCoursePage(page);

    await coursesPage.startDelete(row);
    await expect(card).toBeVisible();
    await expect(
      coursesPage.deleteModal.locator('.modal__header').getByRole('button', { name: 'Close', exact: true })
    ).toHaveCount(1);

    await closeControl(coursesPage).click();

    await expect(card).toBeHidden();
    await expect(row).toBeVisible();
    expect(deletesSent()).toBe(0);
  });

  test('the course is still there after a reload', async ({ page }) => {
    const { coursesPage, row, cost } = await openCoursePage(page);

    await coursesPage.startDelete(row);
    await closeControl(coursesPage).click();
    await expect(coursesPage.deleteModal.locator('.modal__card')).toBeHidden();

    await coursesPage.reloadCourses();

    await expect(coursesPage.row(COURSE_TYPE_LABEL, `R ${cost}`)).toBeVisible();
  });

  test('the close control and Cancel leave the same state', async ({ page }) => {
    const { coursesPage, row, deletesSent, card } = await openCoursePage(page);

    await coursesPage.startDelete(row);
    await coursesPage.modalCancelButton().click();
    await expect(card).toBeHidden();
    await expect(row).toBeVisible();

    await coursesPage.startDelete(row);
    await closeControl(coursesPage).click();
    await expect(card).toBeHidden();
    await expect(row).toBeVisible();

    await coursesPage.startDelete(row);
    await expect(card).toBeVisible();
    await expect(coursesPage.modalError()).toBeHidden();
    await expect(coursesPage.modalConfirmButton()).toBeEnabled();
    expect(deletesSent()).toBe(0);
  });
});

test.describe('Delete Course modal — backdrop click', { tag: ['@266IT42'] }, () => {
  test('a backdrop click leaves the modal open', async ({ page }) => {
    const { coursesPage, row, deletesSent, card } = await openCoursePage(page);

    await coursesPage.startDelete(row);
    await clickBackdropLeftThenAbove(page, card, async () => {
      await expect(card).toBeVisible();
      await expect(coursesPage.modalConfirmButton()).toBeEnabled();
      await expect(coursesPage.modalCancelButton()).toBeEnabled();
    });

    expect(deletesSent()).toBe(0);
  });

  test('the modal still works after the backdrop click', async ({ page }) => {
    const { coursesPage, row, card } = await openCoursePage(page);

    await coursesPage.startDelete(row);
    await clickBackdropLeftThenAbove(page, card, async () => {
      await expect(card).toBeVisible();
    });

    await coursesPage.modalCancelButton().click();

    await expect(card).toBeHidden();
    await expect(row).toBeVisible();
  });
});
