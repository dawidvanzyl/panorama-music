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

test.describe('Course Management — correcting a course cost', { tag: ['@8IT3'] }, () => {
  test('persists the corrected cost as the exact amount entered', async ({ page }) => {
    const cost = uniqueCost();
    const corrected = uniqueCost();
    const coursesPage = await goToCourseManagementPage(page);

    await coursesPage.createCourse({
      courseTypeLabel: 'Theory',
      cost,
      lessonStructureLabel: 'Individual · Hour · After School',
    });
    const row = coursesPage.row('Theory', `R ${cost}`);
    await expect(row).toBeVisible();

    await coursesPage.startCostEdit(row);
    await coursesPage.enterCost(corrected);
    await coursesPage.saveCost();

    await expect(coursesPage.row('Theory', `R ${corrected}`)).toBeVisible();
    await expect(coursesPage.row('Theory', `R ${cost}`)).toHaveCount(0);

    // Still the exact amount after a reload, not a rounded approximation of it.
    await coursesPage.gotoCourses();
    await expect(coursesPage.row('Theory', `R ${corrected}`)).toBeVisible();
  });

  test('refuses an over-precise cost inline and leaves the stored cost as it was', async ({ page }) => {
    const cost = uniqueCost();
    const coursesPage = await goToCourseManagementPage(page);

    await coursesPage.createCourse({
      courseTypeLabel: 'Grade 1 Enrichment',
      cost,
      lessonStructureLabel: 'Group · Half Hour · After School',
    });
    const row = coursesPage.row('Grade 1 Enrichment', `R ${cost}`);
    await expect(row).toBeVisible();

    await coursesPage.startCostEdit(row);
    await coursesPage.enterCost('120.005');
    await coursesPage.saveCost();

    await expect(coursesPage.rowError()).toBeVisible();
    await coursesPage.gotoCourses();
    await expect(coursesPage.row('Grade 1 Enrichment', `R ${cost}`)).toBeVisible();
  });
});

test.describe('Course Management — a cost change never moves the lesson structure', { tag: ['@8IT2'] }, () => {
  test('leaves the course still linked to the structure it was created under', async ({ page }) => {
    const cost = uniqueCost();
    const corrected = uniqueCost();
    const coursesPage = await goToCourseManagementPage(page);

    await coursesPage.createCourse({
      courseTypeLabel: 'Instrument',
      cost,
      lessonStructureLabel: 'Individual · Half Hour · During School',
    });
    const row = coursesPage.row('Instrument', `R ${cost}`);
    await expect(row).toBeVisible();

    await coursesPage.startCostEdit(row);
    await coursesPage.enterCost(corrected);
    await coursesPage.saveCost();

    const updated = coursesPage.row('Instrument', `R ${corrected}`);
    await expect(updated).toBeVisible();
    await expect(updated).toContainText('Individual · Half Hour');
    await expect(updated).toContainText('During School');
  });
});

test.describe('Course Management — removing a course', { tag: ['@8IT1'] }, () => {
  test('deletes the course from the catalogue once the confirmation is accepted', async ({ page }) => {
    const cost = uniqueCost();
    const coursesPage = await goToCourseManagementPage(page);

    await coursesPage.createCourse({
      courseTypeLabel: 'Grade 2 Recorder',
      cost,
      lessonStructureLabel: 'Group · Hour · After School',
    });
    const row = coursesPage.row('Grade 2 Recorder', `R ${cost}`);
    await expect(row).toBeVisible();

    await coursesPage.startDelete(row);
    await expect(coursesPage.deleteModal).toContainText('Delete Course');
    await expect(coursesPage.deleteModal).toContainText('Grade 2 Recorder · Group · Hour, After School');
    await expect(coursesPage.deleteModal).toContainText('no longer be available for enrolment');

    // Cancelling leaves the course exactly where it was.
    await coursesPage.cancelDelete();
    await expect(coursesPage.row('Grade 2 Recorder', `R ${cost}`)).toBeVisible();

    await coursesPage.startDelete(coursesPage.row('Grade 2 Recorder', `R ${cost}`));
    await coursesPage.confirmDelete();

    await expect(coursesPage.row('Grade 2 Recorder', `R ${cost}`)).toHaveCount(0);
    await coursesPage.gotoCourses();
    await expect(coursesPage.row('Grade 2 Recorder', `R ${cost}`)).toHaveCount(0);
  });
});

test.describe('Course Management — maintenance is refused to everyone else', { tag: ['@8IT5'] }, () => {
  test('refuses a Teacher and an anonymous caller the update and delete endpoints', async ({ page }) => {
    const cost = uniqueCost();
    const maintainerPage = await goToCourseManagementPage(page);
    await maintainerPage.createCourse({
      courseTypeLabel: 'GR Enrichment',
      cost,
      lessonStructureLabel: 'Group · Half Hour · During School',
    });
    const row = maintainerPage.row('GR Enrichment', `R ${cost}`);
    await expect(row).toBeVisible();
    const courseId = (await row.getAttribute('data-course-id')) as string;

    const teacherEmail = uniqueTestEmail('course-maintain-teacher');
    const password = 'TeacherPass123!';
    await createRegisteredUser(page, teacherEmail, password, ['Teacher']);

    const loginPage = new LoginPage(page);
    await loginPage.gotoLogin();
    await loginPage.login(teacherEmail, password);
    await expect(page).toHaveURL(landingUrl('Teacher'));

    const coursesPage = new CourseManagementPage(page);
    await coursesPage.gotoCourses();
    await expect(coursesPage.row('GR Enrichment', `R ${cost}`)).toBeVisible();

    // Issued from inside the page so the requests carry the signed-in Teacher's
    // bearer token, rather than proving only that anonymous callers are rejected.
    const statuses = await page.evaluate(async (id) => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
      };
      const update = await fetch(`/api/courses/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ cost: '1.00' }),
      });
      const remove = await fetch(`/api/courses/${id}`, { method: 'DELETE', headers });
      return { update: update.status, remove: remove.status };
    }, courseId);
    expect(statuses.update).toBe(403);
    expect(statuses.remove).toBe(403);

    const anonymousUpdate = await page.request.put(`/api/courses/${courseId}`, { data: { cost: '1.00' } });
    const anonymousDelete = await page.request.delete(`/api/courses/${courseId}`);
    expect(anonymousUpdate.status()).toBe(401);
    expect(anonymousDelete.status()).toBe(401);

    // Nothing changed: the course is still listed at the cost it was created with.
    await expect(coursesPage.row('GR Enrichment', `R ${cost}`)).toBeVisible();
  });
});
