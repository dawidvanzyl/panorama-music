import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import {
  createRegisteredUser,
  goToCourseManagementPage,
  loginAsRoles,
  uniqueTestEmail,
} from '../../fixtures/testUsers';
import { seedEnrolledStudent, seedEnrollmentTarget } from '../../fixtures/enrollment';
import {
  fetchLessonStructureId,
  type DurationType,
  type LessonType,
  type OccurrenceType,
} from '../../fixtures/waitingList';
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

interface ReservedPair {
  courseType: 'Theory' | 'GREEnrichment' | 'G1Enrichment' | 'G2Recorder' | 'Instrument';
  occurrenceType: OccurrenceType;
  lessonType: LessonType;
  durationType: DurationType;
}

/**
 * A course type and a lesson structure identify at most one course, so a scenario
 * whose subject is creating a course holds its pair alone: no fixture ensures it
 * and no other scenario touches it. A retry meets the course its earlier attempt
 * left behind, so the pair is cleared before the scenario creates on it. Only a
 * scenario's own reserved pair may ever be cleared, never a pair a fixture ensures.
 *
 * Reserved pairs, each held by one scenario in this file:
 *   Grade 2 Recorder / Group · Hour · During School         @8IT1 creates and lists
 *   Grade 2 Recorder / Individual · Hour · During School    @8IT1 deletes
 *   Theory / Group · Half Hour · After School               @8IT4 filter
 *   Instrument / Group · Hour · During School               @8IT4 filter
 *   Theory / Individual · Hour · After School               @8IT3 corrects cost
 *   Grade 1 Enrichment / Group · Half Hour · After School   @8IT3 over-precise cost
 *   Grade 1 Enrichment / Group · Half Hour · During School  @8IT5 read-only Teacher
 *   GR Enrichment / Individual · Half Hour · During School  @8IT2 cost never moves structure
 *   GR Enrichment / Group · Half Hour · During School       @8IT5 maintenance refused
 */
const G2_GROUP_HOUR_DURING: ReservedPair = {
  courseType: 'G2Recorder',
  occurrenceType: 'DuringSchool',
  lessonType: 'Group',
  durationType: 'Hour',
};
const G2_INDIVIDUAL_HOUR_DURING: ReservedPair = {
  courseType: 'G2Recorder',
  occurrenceType: 'DuringSchool',
  lessonType: 'Individual',
  durationType: 'Hour',
};
const THEORY_GROUP_HALF_AFTER: ReservedPair = {
  courseType: 'Theory',
  occurrenceType: 'AfterSchool',
  lessonType: 'Group',
  durationType: 'HalfHour',
};
const INSTRUMENT_GROUP_HOUR_DURING: ReservedPair = {
  courseType: 'Instrument',
  occurrenceType: 'DuringSchool',
  lessonType: 'Group',
  durationType: 'Hour',
};
const THEORY_INDIVIDUAL_HOUR_AFTER: ReservedPair = {
  courseType: 'Theory',
  occurrenceType: 'AfterSchool',
  lessonType: 'Individual',
  durationType: 'Hour',
};
const G1_GROUP_HALF_AFTER: ReservedPair = {
  courseType: 'G1Enrichment',
  occurrenceType: 'AfterSchool',
  lessonType: 'Group',
  durationType: 'HalfHour',
};
const G1_GROUP_HALF_DURING: ReservedPair = {
  courseType: 'G1Enrichment',
  occurrenceType: 'DuringSchool',
  lessonType: 'Group',
  durationType: 'HalfHour',
};
const GRE_INDIVIDUAL_HALF_DURING: ReservedPair = {
  courseType: 'GREEnrichment',
  occurrenceType: 'DuringSchool',
  lessonType: 'Individual',
  durationType: 'HalfHour',
};
const GRE_GROUP_HALF_DURING: ReservedPair = {
  courseType: 'GREEnrichment',
  occurrenceType: 'DuringSchool',
  lessonType: 'Group',
  durationType: 'HalfHour',
};

/** Opens Course Management as a Coordinator with the given reserved pairs cleared of any leftover course. */
async function openWithReservedPairs(page: Page, pairs: ReservedPair[]): Promise<CourseManagementPage> {
  const coursesPage = await goToCourseManagementPage(page);
  for (const pair of pairs) {
    const lessonStructureId = await fetchLessonStructureId(page, pair);
    await page.evaluate(
      async ({ lessonStructureId, courseType }) => {
        const headers = { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` };
        const courses = (await (await fetch('/api/courses', { headers })).json()) as {
          courseId: string;
          courseType: string;
          lessonStructureId: string;
        }[];
        for (const course of courses.filter(
          (c) => c.courseType === courseType && c.lessonStructureId === lessonStructureId,
        )) {
          await fetch(`/api/courses/${course.courseId}`, { method: 'DELETE', headers });
        }
      },
      { lessonStructureId, courseType: pair.courseType },
    );
  }
  // The catalogue is read once per session, so it must be re-read after the clearing.
  await coursesPage.reloadCourses();
  return coursesPage;
}

test.describe('Course Management — creating and reading courses', { tag: ['@8IT1'] }, () => {
  test('creates a course that is listed and still there after a reload', async ({ page }) => {
    const cost = uniqueCost();
    const coursesPage = await openWithReservedPairs(page, [G2_GROUP_HOUR_DURING]);

    await coursesPage.createCourse({
      courseTypeLabel: 'Grade 2 Recorder',
      cost,
      lessonStructureLabel: 'Group · Hour · During School',
    });

    const row = coursesPage.row('Grade 2 Recorder', `R ${cost}`);
    await expect(row).toBeVisible();
    await expect(row).toContainText('Group · Hour');
    await expect(row).toContainText('During School');

    await coursesPage.reloadCourses();

    await expect(coursesPage.row('Grade 2 Recorder', `R ${cost}`)).toBeVisible();
  });
});

test.describe('Course Management — filtering by course type', { tag: ['@8IT4'] }, () => {
  test('shows only courses of the selected type', async ({ page }) => {
    const theoryCost = uniqueCost();
    const instrumentCost = uniqueCost();
    const coursesPage = await openWithReservedPairs(page, [THEORY_GROUP_HALF_AFTER, INSTRUMENT_GROUP_HOUR_DURING]);

    await coursesPage.createCourse({
      courseTypeLabel: 'Theory',
      cost: theoryCost,
      lessonStructureLabel: 'Group · Half Hour · After School',
    });
    await expect(coursesPage.row('Theory', `R ${theoryCost}`)).toBeVisible();

    await coursesPage.createCourse({
      courseTypeLabel: 'Instrument',
      cost: instrumentCost,
      lessonStructureLabel: 'Group · Hour · During School',
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
    const maintainerPage = await openWithReservedPairs(page, [G1_GROUP_HALF_DURING]);
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
    const coursesPage = await openWithReservedPairs(page, [THEORY_INDIVIDUAL_HOUR_AFTER]);

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
    await coursesPage.reloadCourses();
    await expect(coursesPage.row('Theory', `R ${corrected}`)).toBeVisible();
  });

  test('refuses an over-precise cost inline and leaves the stored cost as it was', async ({ page }) => {
    const cost = uniqueCost();
    const coursesPage = await openWithReservedPairs(page, [G1_GROUP_HALF_AFTER]);

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
    await coursesPage.reloadCourses();
    await expect(coursesPage.row('Grade 1 Enrichment', `R ${cost}`)).toBeVisible();
  });
});

test.describe('Course Management — a cost change never moves the lesson structure', { tag: ['@8IT2'] }, () => {
  test('leaves the course still linked to the structure it was created under', async ({ page }) => {
    const cost = uniqueCost();
    const corrected = uniqueCost();
    const coursesPage = await openWithReservedPairs(page, [GRE_INDIVIDUAL_HALF_DURING]);

    await coursesPage.createCourse({
      courseTypeLabel: 'GR Enrichment',
      cost,
      lessonStructureLabel: 'Individual · Half Hour · During School',
    });
    const row = coursesPage.row('GR Enrichment', `R ${cost}`);
    await expect(row).toBeVisible();

    await coursesPage.startCostEdit(row);
    await coursesPage.enterCost(corrected);
    await coursesPage.saveCost();

    const updated = coursesPage.row('GR Enrichment', `R ${corrected}`);
    await expect(updated).toBeVisible();
    await expect(updated).toContainText('Individual · Half Hour');
    await expect(updated).toContainText('During School');
  });
});

test.describe('Course Management — removing a course', { tag: ['@8IT1'] }, () => {
  test('deletes the course from the catalogue once the confirmation is accepted', async ({ page }) => {
    const cost = uniqueCost();
    const coursesPage = await openWithReservedPairs(page, [G2_INDIVIDUAL_HOUR_DURING]);

    await coursesPage.createCourse({
      courseTypeLabel: 'Grade 2 Recorder',
      cost,
      lessonStructureLabel: 'Individual · Hour · During School',
    });
    const row = coursesPage.row('Grade 2 Recorder', `R ${cost}`);
    await expect(row).toBeVisible();

    await coursesPage.startDelete(row);
    await expect(coursesPage.deleteModal).toContainText('Delete Course');
    await expect(coursesPage.deleteModal).toContainText('Grade 2 Recorder · Individual · Hour · During School');
    await expect(coursesPage.deleteModal).toContainText('permanently removed');

    // Cancelling leaves the course exactly where it was.
    await coursesPage.cancelDelete();
    await expect(coursesPage.row('Grade 2 Recorder', `R ${cost}`)).toBeVisible();

    await coursesPage.startDelete(coursesPage.row('Grade 2 Recorder', `R ${cost}`));
    await coursesPage.confirmDelete();

    await expect(coursesPage.row('Grade 2 Recorder', `R ${cost}`)).toHaveCount(0);
    await coursesPage.reloadCourses();
    await expect(coursesPage.row('Grade 2 Recorder', `R ${cost}`)).toHaveCount(0);
  });
});

test.describe('Course Management — a course a student is enrolled in cannot be deleted', { tag: ['@9IT7'] }, () => {
  test('refuses the delete against the row, offers no confirmation, and leaves the course listed', async ({ page }) => {
    await loginAsRoles(page, ['Teacher', 'Coordinator']);
    const target = await seedEnrollmentTarget(page);
    await seedEnrolledStudent(page, target);

    const coursesPage = new CourseManagementPage(page);
    await coursesPage.gotoCourses();
    const row = coursesPage.row('Grade 2 Recorder', `R ${target.courseCost}`);
    await expect(row).toBeVisible();

    await coursesPage.startDelete(row);

    await expect(coursesPage.rowError()).toContainText('enrolled student(s) and cannot be deleted');
    await expect(coursesPage.deleteModal).toBeHidden();

    // The endpoint refuses it too, so the guard is not merely the screen's.
    const status = await page.evaluate(async (courseId) => {
      const response = await fetch(`/api/courses/${courseId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
      });
      return response.status;
    }, target.courseId);
    expect(status).toBe(400);

    await coursesPage.reloadCourses();
    await expect(coursesPage.row('Grade 2 Recorder', `R ${target.courseCost}`)).toBeVisible();
  });
});

test.describe('Course Management — maintenance is refused to everyone else', { tag: ['@8IT5'] }, () => {
  test('refuses a Teacher and an anonymous caller the update and delete endpoints', async ({ page, browser }) => {
    const cost = uniqueCost();
    const maintainerPage = await openWithReservedPairs(page, [GRE_GROUP_HALF_DURING]);
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

    // An Admin is refused too — the area grants it nothing at all, unlike a
    // Teacher who at least keeps the read. Run in its own browser context so
    // the Teacher session and the Courses view still open in it survive.
    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    const adminEmail = uniqueTestEmail('course-maintain-admin');
    await createRegisteredUser(adminPage, adminEmail, password, ['Admin']);
    const adminLoginPage = new LoginPage(adminPage);
    await adminLoginPage.gotoLogin();
    await adminLoginPage.login(adminEmail, password);
    await expect(adminPage).toHaveURL(landingUrl('Admin'));

    const adminStatuses = await adminPage.evaluate(async (id) => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
      };
      const list = await fetch('/api/courses', { headers });
      const update = await fetch(`/api/courses/${id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ cost: '1.00' }),
      });
      return { list: list.status, update: update.status };
    }, courseId);
    expect(adminStatuses.list).toBe(403);
    expect(adminStatuses.update).toBe(403);
    await adminContext.close();

    // Nothing changed: the course is still listed at the cost it was created with.
    await expect(coursesPage.row('GR Enrichment', `R ${cost}`)).toBeVisible();
  });
});
