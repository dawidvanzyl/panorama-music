import { test, expect } from '../../fixtures/base';
import { createRegisteredUser, goToCourseManagementPage, uniqueTestEmail } from '../../fixtures/testUsers';
import { LoginPage } from '../../pages/identity/auth/LoginPage';
import { CourseManagementPage } from '../../pages/courses/CourseManagementPage';
import { landingUrl } from '../../fixtures/navigation';

/**
 * A course has no name of its own, so a run is told apart by its cost. The
 * whole part is the clock in milliseconds, and the cents carry the worker index
 * and a per-worker counter — so two costs from one worker can never match, and
 * two workers would have to create inside the same millisecond to. The column
 * is NUMERIC(10, 2), so the whole part is kept to eight digits.
 */
let _costSequence = 0;

function uniqueCost(): string {
  const whole = Date.now() % 100_000_000;
  const cents = ((test.info().workerIndex % 10) * 10 + _costSequence++ % 10).toString().padStart(2, '0');
  return `${whole}.${cents}`;
}

test.describe('Course Management — creating and reading courses', { tag: ['@8IT1'] }, () => {
  test('creates a course that is listed and still there after a reload', async ({ page }) => {
    const cost = uniqueCost();
    const coursesPage = await goToCourseManagementPage(page);

    await coursesPage.createCourse({
      courseTypeLabel: 'Grade 2 Recorder',
      cost,
      lessonStructureLabel: 'Group · Hour · During School',
    });

    const row = coursesPage.row('Grade 2 Recorder', `R ${cost}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText('Group · Hour');
    await expect(row).toContainText('During School');

    await coursesPage.gotoCourses();

    await expect(coursesPage.row('Grade 2 Recorder', `R ${cost}`)).toBeVisible();
  });
});

test.describe('Course Management — filtering by course type', { tag: ['@8IT4'] }, () => {
  test('shows only courses of the selected type', async ({ page }) => {
    const theoryCost = uniqueCost();
    const instrumentCost = uniqueCost();
    const coursesPage = await goToCourseManagementPage(page);

    await coursesPage.createCourse({
      courseTypeLabel: 'Theory',
      cost: theoryCost,
      lessonStructureLabel: 'Group · Hour · During School',
    });
    await expect(coursesPage.row('Theory', `R ${theoryCost}`)).toBeVisible();

    await coursesPage.createCourse({
      courseTypeLabel: 'Instrument',
      cost: instrumentCost,
      lessonStructureLabel: 'Individual · Half Hour · After School',
    });
    await expect(coursesPage.row('Instrument', `R ${instrumentCost}`)).toBeVisible();

    await coursesPage.filterByCourseType('Instrument');

    await expect(coursesPage.row('Instrument', `R ${instrumentCost}`)).toBeVisible();
    await expect(coursesPage.row('Theory', `R ${theoryCost}`)).toHaveCount(0);
  });
});

test.describe('Course Management — a non-maintainer reads but cannot create', { tag: ['@8IT5'] }, () => {
  test('offers a Teacher the list with no create form, filter bar or actions column', async ({ page }) => {
    const cost = uniqueCost();
    const maintainerPage = await goToCourseManagementPage(page);
    await maintainerPage.createCourse({
      courseTypeLabel: 'Grade 1 Enrichment',
      cost,
      lessonStructureLabel: 'Group · Half Hour · During School',
    });
    await expect(maintainerPage.row('Grade 1 Enrichment', `R ${cost}`)).toBeVisible();

    const teacherEmail = uniqueTestEmail('course-teacher');
    const password = 'TeacherPass123!';
    await createRegisteredUser(page, teacherEmail, password, ['Teacher']);

    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(teacherEmail, password);
    await expect(page).toHaveURL(landingUrl('Teacher'));

    const coursesPage = new CourseManagementPage(page);
    await coursesPage.gotoCourses();

    // The screen is open to a Teacher — reading the catalogue is.
    await expect(coursesPage.row('Grade 1 Enrichment', `R ${cost}`)).toBeVisible();
    // Absent, not disabled.
    await expect(coursesPage.courseForm).toBeHidden();
    await expect(coursesPage.filterBar).toBeHidden();
    await expect(coursesPage.courseTable.locator('#actionsHeader')).toBeHidden();

    // The endpoint refuses the Teacher too. Issued from inside the page so the
    // request carries the signed-in Teacher's bearer token — page.request would
    // send none and prove only that anonymous callers are rejected.
    const status = await page.evaluate(async () => {
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
        },
        body: JSON.stringify({
          courseType: 'Theory',
          cost: '100.00',
          lessonStructureId: '00000000-0000-0000-0000-000000000001',
        }),
      });
      return response.status;
    });
    expect(status).toBe(403);

    const anonymousResponse = await page.request.get('/api/courses');
    expect(anonymousResponse.status()).toBe(401);
  });
});
