import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToCourseManagementPage } from '../../fixtures/testUsers';
import { ensureCourseOfType, fetchLessonStructureId } from '../../fixtures/waitingList';
import { switchToPrintMedia, switchToScreenMedia } from '../../fixtures/printMedia';
import type { CourseManagementPage } from '../../pages/courses/CourseManagementPage';

/**
 * Grade 1 Enrichment on Individual · Hour · During School belongs to this file
 * alone. Nobody enrols in it and no request to delete it ever reaches the server,
 * so every scenario can run in parallel against the one course.
 */
const COURSE_TYPE = 'G1Enrichment';
const COURSE_TYPE_LABEL = 'Grade 1 Enrichment';

type DeleteResponse = 'hold' | { failWith: string };

interface DeleteInterceptor {
  received(): number;
  answered(): number;
}

/**
 * Takes over the DELETE request for one course and never passes it on. The nth
 * request gets the nth response; the last response repeats. A held request is
 * never released, so it ends with the browser context. Other requests to the
 * same course, such as the enrolment-count read, pass through.
 */
async function interceptDelete(
  page: Page,
  courseId: string,
  responses: DeleteResponse[]
): Promise<DeleteInterceptor> {
  let received = 0;
  let answered = 0;
  await page.route(
    (url) => url.pathname === `/api/courses/${courseId}`,
    async (route) => {
      if (route.request().method() !== 'DELETE') {
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
    }
  );
  return { received: () => received, answered: () => answered };
}

async function openCoursePage(
  page: Page
): Promise<{ coursesPage: CourseManagementPage; row: Locator; courseId: string }> {
  const coursesPage = await goToCourseManagementPage(page);
  const lessonStructureId = await fetchLessonStructureId(page, {
    occurrenceType: 'DuringSchool',
    lessonType: 'Individual',
    durationType: 'Hour',
  });
  const { courseId, cost } = await ensureCourseOfType(page, lessonStructureId, COURSE_TYPE);
  await coursesPage.reloadCourses();
  return { coursesPage, row: coursesPage.row(COURSE_TYPE_LABEL, `R ${cost}`), courseId };
}

function uniqueRefusal(): string {
  return `Stubbed delete refusal ${crypto.randomUUID()}`;
}

/** Whether the icon's left edge lies left of the left edge of the button's label text. */
async function iconPrecedesLabel(button: Locator): Promise<boolean> {
  return button.evaluate((el) => {
    const icon = el.querySelector('[data-testid="button-loading-icon"]');
    const label = Array.from(el.childNodes).find(
      (node) => node.nodeType === Node.TEXT_NODE && (node.textContent ?? '').trim() !== ''
    );
    if (!icon || !label) return false;
    const range = document.createRange();
    range.selectNodeContents(label);
    return icon.getBoundingClientRect().left < range.getBoundingClientRect().left;
  });
}

test.describe(
  'Course Management — delete modal while the request runs',
  { tag: ['@267IT1'] },
  () => {
    test('Delete is busy while the request is held', async ({ page }) => {
      const { coursesPage, row, courseId } = await openCoursePage(page);
      const request = await interceptDelete(page, courseId, ['hold']);

      await coursesPage.startDelete(row);
      const confirm = coursesPage.modalConfirmButton();
      const cancel = coursesPage.modalCancelButton();

      await expect(confirm).toBeEnabled();
      await expect(cancel).toBeEnabled();
      await expect(coursesPage.loadingIcon(confirm)).toHaveCount(0);
      await expect(confirm).not.toHaveAttribute('aria-busy', 'true');

      await confirm.click();
      await expect.poll(() => request.received()).toBe(1);

      await expect(coursesPage.deleteModal).toHaveAttribute('open', '');
      await expect(confirm).toBeDisabled();
      await expect(confirm).toHaveAttribute('aria-busy', 'true');
      await expect(confirm).toHaveAccessibleName('Delete');
      await expect(coursesPage.loadingIcon(confirm)).toBeVisible();
      expect(await iconPrecedesLabel(confirm)).toBe(true);
      await expect(cancel).toBeDisabled();
      await expect(row).toBeVisible();
    });

    test('a second click sends nothing more', async ({ page }) => {
      const { coursesPage, row, courseId } = await openCoursePage(page);
      const request = await interceptDelete(page, courseId, ['hold']);

      await coursesPage.startDelete(row);
      const confirm = coursesPage.modalConfirmButton();
      await confirm.click();
      await expect.poll(() => request.received()).toBe(1);

      await confirm.click({ force: true, timeout: 2_000 });
      await page.waitForTimeout(500);

      expect(request.received()).toBe(1);
    });
  }
);

test.describe(
  'Course Management — delete modal after a failed request',
  { tag: ['@267IT2'] },
  () => {
    test('a failed delete leaves the modal open and usable', async ({ page }) => {
      const { coursesPage, row, courseId } = await openCoursePage(page);
      const message = uniqueRefusal();
      const request = await interceptDelete(page, courseId, [{ failWith: message }]);

      await coursesPage.startDelete(row);
      await coursesPage.modalConfirmButton().click();
      await expect.poll(() => request.answered()).toBe(1);

      const confirm = coursesPage.modalConfirmButton();
      await expect(coursesPage.deleteModal).toHaveAttribute('open', '');
      await expect(confirm).toBeEnabled();
      await expect(coursesPage.modalCancelButton()).toBeEnabled();
      await expect(confirm).not.toHaveAttribute('aria-busy', 'true');
      await expect(coursesPage.loadingIcon(confirm)).toHaveCount(0);
      await expect(confirm).toHaveText('Delete');
      await expect(coursesPage.modalError()).toHaveText(message);
    });

    test('after a failure, Cancel closes the modal', async ({ page }) => {
      const { coursesPage, row, courseId } = await openCoursePage(page);
      const request = await interceptDelete(page, courseId, [{ failWith: uniqueRefusal() }]);

      await coursesPage.startDelete(row);
      await coursesPage.modalConfirmButton().click();
      await expect.poll(() => request.answered()).toBe(1);
      await expect(coursesPage.modalCancelButton()).toBeEnabled();

      await coursesPage.modalCancelButton().click();

      await expect(coursesPage.deleteModal).not.toHaveAttribute('open', '');
      await expect(row).toBeVisible();
    });

    test('after a failure, Delete can be tried again', async ({ page }) => {
      const { coursesPage, row, courseId } = await openCoursePage(page);
      const request = await interceptDelete(page, courseId, [
        { failWith: uniqueRefusal() },
        'hold',
      ]);

      await coursesPage.startDelete(row);
      const confirm = coursesPage.modalConfirmButton();
      await confirm.click();
      await expect.poll(() => request.answered()).toBe(1);
      await expect(confirm).toBeEnabled();

      await confirm.click();
      await expect.poll(() => request.received()).toBe(2);

      await expect(confirm).toBeDisabled();
      await expect(confirm).toHaveAttribute('aria-busy', 'true');
      await expect(coursesPage.loadingIcon(confirm)).toBeVisible();
      await expect(coursesPage.modalCancelButton()).toBeDisabled();
    });
  }
);

test.describe('Course Management — delete modal action row order', { tag: ['@267IT7'] }, () => {
  test('Cancel comes first and nothing follows Delete', async ({ page }) => {
    const { coursesPage, row } = await openCoursePage(page);

    await coursesPage.startDelete(row);
    const actions = coursesPage.modalActions();
    await expect(actions).toBeVisible();

    const controls = actions.locator(':scope > *');
    await expect(controls).toHaveCount(2);
    await expect(controls.nth(0)).toHaveText('Cancel');
    await expect(controls.nth(1)).toHaveText('Delete');

    const cancelBox = await coursesPage.modalCancelButton().boundingBox();
    const deleteBox = await coursesPage.modalConfirmButton().boundingBox();
    expect(cancelBox).not.toBeNull();
    expect(deleteBox).not.toBeNull();
    expect(cancelBox!.x + cancelBox!.width).toBeLessThan(deleteBox!.x);
  });
});

test.describe('Course Management — delete modal when printed', { tag: ['@267IT39'] }, () => {
  test('print media hides the modal buttons and action row', async ({ page }) => {
    const { coursesPage, row } = await openCoursePage(page);

    await coursesPage.startDelete(row);
    await expect(coursesPage.modalActions()).toBeVisible();
    await expect(coursesPage.modalConfirmButton()).toBeVisible();
    await expect(coursesPage.modalCancelButton()).toBeVisible();

    await switchToPrintMedia(page);

    await expect(coursesPage.modalActions()).toBeHidden();
    await expect(coursesPage.modalConfirmButton()).toBeHidden();
    await expect(coursesPage.modalCancelButton()).toBeHidden();
  });

  test('back on screen, the buttons return', async ({ page }) => {
    const { coursesPage, row } = await openCoursePage(page);

    await coursesPage.startDelete(row);
    await expect(coursesPage.modalActions()).toBeVisible();
    await switchToPrintMedia(page);
    await expect(coursesPage.modalActions()).toBeHidden();

    await switchToScreenMedia(page);

    await expect(coursesPage.modalActions()).toBeVisible();
    await expect(coursesPage.modalConfirmButton()).toBeVisible();
    await expect(coursesPage.modalCancelButton()).toBeVisible();
  });
});
