import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToCourseManagementPage, loginAsRoles } from '../../fixtures/testUsers';
import { ensureCourseOfType, fetchLessonStructureId } from '../../fixtures/waitingList';
import { actionNames, iconPrecedesLabel, lastControlLabel, rowActionsOf } from '../../fixtures/rowActions';
import { CourseManagementPage } from '../../pages/courses/CourseManagementPage';

/**
 * Uses the course that course-delete-modal-buttons.spec.ts owns. No request that
 * would change it reaches the server: every cost update is held or failed here,
 * and every edit ends with Cancel or a reload. So both files can share the course.
 */
const COURSE_TYPE = 'G1Enrichment';
const COURSE_TYPE_LABEL = 'Grade 1 Enrichment';
const COST_ERROR = 'Cost must be an amount with at most two decimals.';

type UpdateResponse = 'hold' | { failWith: string };

interface UpdateInterceptor {
  received(): number;
  answered(): number;
}

/**
 * Takes over the PUT request for one course and never passes it on. The nth
 * request gets the nth response; the last response repeats. A held request is
 * never released, so it ends with the browser context. Other requests to the
 * same course pass through.
 */
async function interceptUpdate(
  page: Page,
  courseId: string,
  responses: UpdateResponse[],
): Promise<UpdateInterceptor> {
  let received = 0;
  let answered = 0;
  await page.route(
    (url) => url.pathname === `/api/courses/${courseId}`,
    async (route) => {
      if (route.request().method() !== 'PUT') {
        await route.fallback();
        return;
      }
      const response = responses[Math.min(received, responses.length - 1)];
      received++;
      if (response === 'hold') return;
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: response.failWith }),
      });
      answered++;
    },
  );
  return { received: () => received, answered: () => answered };
}

async function openCoursePage(
  page: Page,
): Promise<{ coursesPage: CourseManagementPage; row: Locator; courseId: string; cost: string }> {
  const coursesPage = await goToCourseManagementPage(page);
  const lessonStructureId = await fetchLessonStructureId(page, {
    occurrenceType: 'DuringSchool',
    lessonType: 'Individual',
    durationType: 'Hour',
  });
  const { courseId, cost } = await ensureCourseOfType(page, lessonStructureId, COURSE_TYPE);
  await coursesPage.reloadCourses();
  return { coursesPage, row: coursesPage.row(COURSE_TYPE_LABEL, `R ${cost}`), courseId, cost };
}

function saveButton(coursesPage: CourseManagementPage): Locator {
  return coursesPage.editingRow().getByRole('button', { name: 'Save', exact: true });
}

function cancelButton(coursesPage: CourseManagementPage): Locator {
  return coursesPage.editingRow().getByRole('button', { name: 'Cancel', exact: true });
}

test.describe('Course Management — Save while the request runs', { tag: ['@267IT6'] }, () => {
  test('S1 Save is busy while the request is held', async ({ page }) => {
    const { coursesPage, row, courseId } = await openCoursePage(page);
    const request = await interceptUpdate(page, courseId, ['hold']);

    await coursesPage.startCostEdit(row);
    await coursesPage.enterCost('150.00');
    const save = saveButton(coursesPage);
    const cancel = cancelButton(coursesPage);

    await expect(save).toBeEnabled();
    await expect(cancel).toBeEnabled();
    await expect(save).not.toHaveAttribute('aria-busy', 'true');
    await expect(coursesPage.loadingIcon(save)).toHaveCount(0);

    await save.click();
    await expect.poll(() => request.received()).toBe(1);

    await expect(save).toBeDisabled();
    await expect(save).toHaveAttribute('aria-busy', 'true');
    await expect(save).toHaveAccessibleName('Save');
    await expect(coursesPage.loadingIcon(save)).toBeVisible();
    expect(await iconPrecedesLabel(save)).toBe(true);
    await expect(cancel).toBeDisabled();
    await expect(coursesPage.editingRow().locator('#costInput')).toHaveValue('150.00');
  });

  test('S2 a second click sends nothing more', async ({ page }) => {
    const { coursesPage, row, courseId } = await openCoursePage(page);
    const request = await interceptUpdate(page, courseId, ['hold']);

    await coursesPage.startCostEdit(row);
    await coursesPage.enterCost('150.00');
    const save = saveButton(coursesPage);
    await save.click();
    await expect.poll(() => request.received()).toBe(1);

    await save.click({ force: true, timeout: 2_000 });
    await page.waitForTimeout(500);

    expect(request.received()).toBe(1);
  });

  test('S3 a cost refused on the screen never makes Save busy', async ({ page }) => {
    const { coursesPage, row, courseId } = await openCoursePage(page);
    const request = await interceptUpdate(page, courseId, ['hold']);

    await coursesPage.startCostEdit(row);
    await coursesPage.enterCost('12.345');
    const save = saveButton(coursesPage);
    await save.click();

    await expect(coursesPage.rowError()).toContainText(COST_ERROR);
    expect(request.received()).toBe(0);
    await expect(save).toBeEnabled();
    await expect(cancelButton(coursesPage)).toBeEnabled();
    await expect(save).not.toHaveAttribute('aria-busy', 'true');
    await expect(coursesPage.loadingIcon(save)).toHaveCount(0);
  });

  test('S4 after a failed request, Save and Cancel return and the message shows in the row', async ({
    page,
  }) => {
    const { coursesPage, row, courseId } = await openCoursePage(page);
    const message = `Stubbed update refusal ${crypto.randomUUID()}`;
    const request = await interceptUpdate(page, courseId, [{ failWith: message }]);

    await coursesPage.startCostEdit(row);
    await coursesPage.enterCost('150.00');
    const save = saveButton(coursesPage);
    await save.click();
    await expect.poll(() => request.answered()).toBe(1);

    await expect(coursesPage.editingRow().locator('#costInput')).toHaveValue('150.00');
    await expect(save).toBeEnabled();
    await expect(cancelButton(coursesPage)).toBeEnabled();
    await expect(save).not.toHaveAttribute('aria-busy', 'true');
    await expect(coursesPage.loadingIcon(save)).toHaveCount(0);
    await expect(save).toHaveText('Save');
    await expect(coursesPage.rowError()).toContainText(message);

    await cancelButton(coursesPage).click();
    await expect(coursesPage.courseTable.locator('#costInput')).toHaveCount(0);
  });
});

test.describe('Course Management — the inline edit action order', { tag: ['@267IT10'] }, () => {
  test('S1 Cancel then Save, and Save is last in the row', async ({ page }) => {
    const { coursesPage, row } = await openCoursePage(page);

    await coursesPage.startCostEdit(row);
    const editing = coursesPage.editingRow();
    await expect(editing).toBeVisible();

    expect(await actionNames(editing)).toEqual(['Cancel', 'Save']);
    expect(await lastControlLabel(editing)).toBe('Save');

    const cancelBox = await cancelButton(coursesPage).boundingBox();
    const saveBox = await saveButton(coursesPage).boundingBox();
    expect(cancelBox).not.toBeNull();
    expect(saveBox).not.toBeNull();
    expect(cancelBox!.x + cancelBox!.width).toBeLessThan(saveBox!.x);
  });

  test('S2 Cancel leaves edit without a request', async ({ page }) => {
    const { coursesPage, row, courseId } = await openCoursePage(page);
    const request = await interceptUpdate(page, courseId, ['hold']);

    await coursesPage.startCostEdit(row);
    await coursesPage.enterCost('150.00');
    await cancelButton(coursesPage).click();

    expect(request.received()).toBe(0);
    await expect(coursesPage.courseTable.locator('#costInput')).toHaveCount(0);
    await expect(row).toBeVisible();
    expect(await actionNames(row)).toEqual(['Edit', 'Delete']);
  });
});

test.describe('Course Management — row action verbs', { tag: ['@267IT14'] }, () => {
  test('S1 Edit then Delete', async ({ page }) => {
    const { coursesPage, row } = await openCoursePage(page);

    await expect(row).toBeVisible();
    expect(await actionNames(row)).toEqual(['Edit', 'Delete']);
    await expect(coursesPage.courseTable.getByRole('button', { name: 'Edit Cost' })).toHaveCount(0);
  });

  test('S2 a Teacher sees no row actions', async ({ page }) => {
    const { cost } = await openCoursePage(page);

    await loginAsRoles(page, ['Teacher']);
    const coursesPage = new CourseManagementPage(page);
    await coursesPage.gotoCourses();

    const teacherRow = coursesPage.row(COURSE_TYPE_LABEL, `R ${cost}`);
    await expect(teacherRow).toBeVisible();
    await expect(rowActionsOf(teacherRow)).toHaveCount(0);
    await expect(teacherRow.getByRole('button', { name: 'Edit', exact: true })).toHaveCount(0);
    await expect(teacherRow.getByRole('button', { name: 'Delete', exact: true })).toHaveCount(0);
    await expect(coursesPage.courseTable.getByRole('columnheader', { name: 'Actions' })).toHaveCount(0);
  });
});
