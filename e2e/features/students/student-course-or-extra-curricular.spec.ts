import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { loginAsRoles } from '../../fixtures/testUsers';
import {
  seedActivityOnlyStudent,
  seedEnrolledStudent,
  seedEnrollmentTarget,
  type SeededEnrollmentTarget,
} from '../../fixtures/enrollment';
import { assignActivity, seedActivity } from '../../fixtures/extraCurriculars';
import { StudentsPage } from '../../pages/students/StudentsPage';

const REQUIRED_ON_SAVE =
  'A student must have at least one course or one extra-curricular before they can be saved.';
const ADD_BEFORE_WITHDRAWING =
  'A student must have at least one course or one extra-curricular. Add an extra-curricular before withdrawing this course.';
const ENROLL_BEFORE_REMOVING =
  'A student must have at least one course or one extra-curricular. Enroll in a course before removing this activity.';
const API_REFUSAL = 'A student must have at least one course or one extra-curricular.';

/** A student has no natural key, so a run is told apart by the surname it gives its students. */
function uniqueSurname(label: string): string {
  return `${label}${Date.now()}W${test.info().workerIndex}`;
}

function uniqueDescription(label: string): string {
  return `e2e-${label}-${Date.now()}-${test.info().workerIndex}`;
}

const studentDefaults = {
  dateOfBirth: '2014-05-12',
  grade: 'Grade4' as const,
  class: 'A1' as const,
  phase: 'Junior' as const,
  language: 'English' as const,
};

interface Seeded {
  target: SeededEnrollmentTarget;
  activities: { description: string; extraCurricularId: string }[];
}

/**
 * Signs in as Teacher and Coordinator and seeds a course and teacher plus the
 * requested number of Junior activities, all before the Students screen is
 * reloaded so its lookups see them.
 */
async function signInAndSeed(page: Page, label: string, activityCount: number): Promise<Seeded> {
  await loginAsRoles(page, ['Teacher', 'Coordinator']);
  const target = await seedEnrollmentTarget(page);
  const activities: Seeded['activities'] = [];
  for (let index = 0; index < activityCount; index++) {
    const description = uniqueDescription(`${label}-${index}`);
    const { extraCurricularId } = await seedActivity(page, {
      description,
      phase: 'Junior',
      practiceTimes: [{ day: 'Monday', startTime: '15:00' }],
    });
    activities.push({ description, extraCurricularId });
  }
  return { target, activities };
}

async function openStudents(page: Page): Promise<StudentsPage> {
  await page.reload();
  const studentsPage = new StudentsPage(page);
  await studentsPage.gotoStudents();
  return studentsPage;
}

async function findOnRoster(studentsPage: StudentsPage, surname: string): Promise<void> {
  await studentsPage.filterByName(surname);
  await expect(studentsPage.row(surname)).toBeVisible();
}

interface ApiResult {
  status: number;
  error?: string;
}

async function apiDelete(page: Page, path: string): Promise<ApiResult> {
  return page.evaluate(async (path) => {
    const response = await fetch(path, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    return { status: response.status, error: body.error };
  }, path);
}

async function apiGet<T>(page: Page, path: string): Promise<T> {
  return page.evaluate(async (path) => {
    const response = await fetch(path, {
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    return (await response.json()) as T;
  }, path);
}

interface CourseHolding {
  studentCourseId: string;
}

interface ActivityHolding {
  extraCurricularId: string;
}

/** Records every DELETE the page issues, so a refusal can be shown to have sent nothing. */
function recordDeletes(page: Page): string[] {
  const deletes: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'DELETE') deletes.push(request.url());
  });
  return deletes;
}

test.describe('Students — saving needs a course or an extra-curricular', { tag: ['@340IT27'] }, () => {
  test('Save with nothing captured is refused on the Extra-Curriculars tab', async ({ page }) => {
    await signInAndSeed(page, '340IT27-S1', 0);
    const studentsPage = await openStudents(page);
    const surname = uniqueSurname('NothingCaptured');

    await studentsPage.startCreatingStudent({ firstName: 'Palesa', lastName: surname, ...studentDefaults });
    await studentsPage.advanceToExtraCurriculars();
    await studentsPage.saveStudent();

    await expect(studentsPage.wizardModal).toHaveAttribute('open', '');
    await expect(studentsPage.wizardModal.locator('#tabExtraCurriculars')).toHaveAttribute('aria-selected', 'true');
    await expect(studentsPage.extraCurricularsStepMessage()).toHaveText(REQUIRED_ON_SAVE);
    await expect(studentsPage.coursesStepMessage()).toHaveText('');

    await studentsPage.closeWizard();
    await studentsPage.filterByName(surname);
    await expect(studentsPage.row(surname)).toHaveCount(0);

    await page.reload();
    await studentsPage.gotoStudents();
    await studentsPage.filterByName(surname);
    await expect(studentsPage.row(surname)).toHaveCount(0);
  });

  test('the refusal is lifted by capturing an activity', async ({ page }) => {
    const { activities } = await signInAndSeed(page, '340IT27-S2', 1);
    const studentsPage = await openStudents(page);
    const surname = uniqueSurname('RefusalLifted');

    await studentsPage.startCreatingStudent({ firstName: 'Palesa', lastName: surname, ...studentDefaults });
    await studentsPage.advanceToExtraCurriculars();
    await studentsPage.saveStudent();
    await expect(studentsPage.extraCurricularsStepMessage()).toHaveText(REQUIRED_ON_SAVE);

    await studentsPage.assignActivity(activities[0].description);
    await studentsPage.saveStudent();

    await expect(studentsPage.wizardModal).not.toHaveAttribute('open');
    await findOnRoster(studentsPage, surname);
  });
});

test.describe('Students — an extra-curricular alone is enough to save', { tag: ['@340IT28'] }, () => {
  test('an activity alone is enough to save', async ({ page }) => {
    const { activities } = await signInAndSeed(page, '340IT28', 1);
    const studentsPage = await openStudents(page);
    const surname = uniqueSurname('ActivityOnly');
    const [activity] = activities;

    await studentsPage.startCreatingStudent({ firstName: 'Lindiwe', lastName: surname, ...studentDefaults });
    await studentsPage.advanceToExtraCurriculars();
    await studentsPage.assignActivity(activity.description);
    await studentsPage.saveStudent();

    await expect(studentsPage.wizardModal).not.toHaveAttribute('open');
    await findOnRoster(studentsPage, surname);
    await studentsPage.toggleRowExpanded(surname);
    await expect(studentsPage.visibleExtraCurricularsSummary()).toContainText(activity.description);
    await expect(studentsPage.visibleCoursesSummary()).toContainText('No course enrollments.');

    await page.reload();
    await studentsPage.gotoStudents();
    await findOnRoster(studentsPage, surname);
    await studentsPage.toggleRowExpanded(surname);
    await expect(studentsPage.visibleExtraCurricularsSummary()).toContainText(activity.description);
    await expect(studentsPage.visibleCoursesSummary()).toContainText('No course enrollments.');
  });
});

test.describe('Students — a course alone is enough to save', { tag: ['@340IT29'] }, () => {
  test('a course alone is enough to save', async ({ page }) => {
    const { target } = await signInAndSeed(page, '340IT29', 0);
    const studentsPage = await openStudents(page);
    const surname = uniqueSurname('CourseOnly');

    await studentsPage.startCreatingStudent({ firstName: 'Thabo', lastName: surname, ...studentDefaults });
    await studentsPage.goToNextStep();
    await studentsPage.goToNextStep();
    await studentsPage.goToNextStep();
    await studentsPage.enrollInCourse({ courseLabel: target.courseLabel, teacherName: target.teacherName });
    await studentsPage.goToNextStep();
    await studentsPage.saveStudent();

    await expect(studentsPage.wizardModal).not.toHaveAttribute('open');
    await findOnRoster(studentsPage, surname);
    await studentsPage.toggleRowExpanded(surname);
    await expect(studentsPage.visibleCoursesSummary()).toContainText(target.courseLabel);
    await expect(studentsPage.visibleExtraCurricularsSummary()).toContainText(
      'No extra-curricular activities assigned.',
    );

    await page.reload();
    await studentsPage.gotoStudents();
    await findOnRoster(studentsPage, surname);
    await studentsPage.toggleRowExpanded(surname);
    await expect(studentsPage.visibleCoursesSummary()).toContainText(target.courseLabel);
    await expect(studentsPage.visibleExtraCurricularsSummary()).toContainText(
      'No extra-curricular activities assigned.',
    );
  });
});

test.describe('Students — the only staged course may be removed', { tag: ['@340IT30'] }, () => {
  test('the only staged course may be removed, and an activity carries the save', async ({ page }) => {
    const { target, activities } = await signInAndSeed(page, '340IT30', 1);
    const studentsPage = await openStudents(page);
    const surname = uniqueSurname('RemoveStaged');
    const [activity] = activities;

    await studentsPage.startCreatingStudent({ firstName: 'Naledi', lastName: surname, ...studentDefaults });
    await studentsPage.goToNextStep();
    await studentsPage.goToNextStep();
    await studentsPage.goToNextStep();
    await studentsPage.enrollInCourse({ courseLabel: target.courseLabel, teacherName: target.teacherName });
    await expect(studentsPage.enrollmentListRow(target.courseLabel)).toBeVisible();

    await studentsPage.removeStagedEnrollment(target.courseLabel);
    await expect(studentsPage.enrollmentListRow(target.courseLabel)).toHaveCount(0);
    await expect(studentsPage.coursesStepMessage()).toHaveText('');

    await studentsPage.goToNextStep();
    await studentsPage.assignActivity(activity.description);
    await studentsPage.saveStudent();

    await expect(studentsPage.wizardModal).not.toHaveAttribute('open');
    await findOnRoster(studentsPage, surname);
    await studentsPage.toggleRowExpanded(surname);
    await expect(studentsPage.visibleExtraCurricularsSummary()).toContainText(activity.description);
    await expect(studentsPage.visibleCoursesSummary()).toContainText('No course enrollments.');

    await page.reload();
    await studentsPage.gotoStudents();
    await findOnRoster(studentsPage, surname);
    await studentsPage.toggleRowExpanded(surname);
    await expect(studentsPage.visibleExtraCurricularsSummary()).toContainText(activity.description);
    await expect(studentsPage.visibleCoursesSummary()).toContainText('No course enrollments.');
  });
});

test.describe('Students — the last course is withdrawn when an extra-curricular is held', { tag: ['@340IT31'] }, () => {
  test('the last course is withdrawn when an activity is held', async ({ page }) => {
    const { target, activities } = await signInAndSeed(page, '340IT31', 1);
    const surname = uniqueSurname('WithdrawLast');
    const [activity] = activities;
    const studentId = await seedEnrolledStudent(page, target, surname);
    await assignActivity(page, studentId, activity.extraCurricularId);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openCoursesTab(surname);
    await studentsPage.enrollmentListRow(target.courseLabel).locator('.enrollment-list__btn--withdraw').click();

    await expect(studentsPage.withdrawEnrollmentModal).toHaveAttribute('open', '');
    await expect(studentsPage.coursesStepMessage()).toHaveText('');
    await studentsPage.withdrawEnrollmentModal.locator('#withdrawBtn').click();

    await expect(studentsPage.enrollmentListRow(target.courseLabel)).toHaveCount(0);
    await studentsPage.wizardModal.locator('#tabExtraCurriculars').click();
    await expect(studentsPage.assignedActivityRow(activity.description)).toBeVisible();

    await studentsPage.closeWizard();
    await expect(studentsPage.row(surname)).toBeVisible();

    await page.reload();
    await studentsPage.gotoStudents();
    await findOnRoster(studentsPage, surname);
    await studentsPage.toggleRowExpanded(surname);
    await expect(studentsPage.visibleCoursesSummary()).toContainText('No course enrollments.');
    await expect(studentsPage.visibleExtraCurricularsSummary()).toContainText(activity.description);
  });
});

test.describe('Students — the last course cannot be withdrawn with no extra-curricular held', { tag: ['@340IT32'] }, () => {
  test('the last course cannot be withdrawn when no activity is held', async ({ page }) => {
    const { target } = await signInAndSeed(page, '340IT32-S1', 0);
    const surname = uniqueSurname('WithdrawRefused');
    await seedEnrolledStudent(page, target, surname);
    const studentsPage = await openStudents(page);
    const deletes = recordDeletes(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openCoursesTab(surname);
    await studentsPage.withdrawEnrollment(target.courseLabel, false);

    await expect(studentsPage.coursesStepMessage()).toHaveText(ADD_BEFORE_WITHDRAWING);
    await expect(studentsPage.withdrawEnrollmentModal).not.toHaveAttribute('open', '');
    expect(deletes).toHaveLength(0);
    await expect(studentsPage.enrollmentListRow(target.courseLabel)).toBeVisible();

    await studentsPage.closeWizard();
    await studentsPage.openCoursesTab(surname);
    await expect(studentsPage.enrollmentListRow(target.courseLabel)).toBeVisible();
  });

  test('adding an activity lifts the refusal', async ({ page }) => {
    const { target, activities } = await signInAndSeed(page, '340IT32-S2', 1);
    const surname = uniqueSurname('WithdrawLifted');
    await seedEnrolledStudent(page, target, surname);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openCoursesTab(surname);
    await studentsPage.withdrawEnrollment(target.courseLabel, false);
    await expect(studentsPage.coursesStepMessage()).toHaveText(ADD_BEFORE_WITHDRAWING);

    await studentsPage.wizardModal.locator('#tabExtraCurriculars').click();
    await studentsPage.assignActivity(activities[0].description);
    await expect(studentsPage.assignedActivityRow(activities[0].description)).toBeVisible();

    await studentsPage.wizardModal.locator('#tabCourses').click();
    await studentsPage.withdrawEnrollment(target.courseLabel, false);

    await expect(studentsPage.withdrawEnrollmentModal).toHaveAttribute('open', '');
    await expect(studentsPage.coursesStepMessage()).toHaveText('');
  });
});

test.describe('Students — the last extra-curricular is removed when a course is held', { tag: ['@340IT33'] }, () => {
  test('the last activity is removed when a course is held', async ({ page }) => {
    const { target, activities } = await signInAndSeed(page, '340IT33-S1', 1);
    const surname = uniqueSurname('RemoveLast');
    const [activity] = activities;
    const studentId = await seedEnrolledStudent(page, target, surname);
    await assignActivity(page, studentId, activity.extraCurricularId);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openExtraCurricularsTab(surname);
    await studentsPage.removeActivity(activity.description);

    await expect(studentsPage.assignedActivityRow(activity.description)).toHaveCount(0);
    await expect(studentsPage.noActivitiesMessage()).toBeVisible();
    await expect(studentsPage.noActivitiesMessage()).toHaveText('No extra-curricular activities assigned.');
    await expect(studentsPage.extraCurricularsStepMessage()).toHaveText('');
    await studentsPage.wizardModal.locator('#tabCourses').click();
    await expect(studentsPage.enrollmentListRow(target.courseLabel)).toBeVisible();

    await page.reload();
    await studentsPage.gotoStudents();
    await findOnRoster(studentsPage, surname);
    await studentsPage.toggleRowExpanded(surname);
    await expect(studentsPage.visibleCoursesSummary()).toContainText(target.courseLabel);
    await expect(studentsPage.visibleExtraCurricularsSummary()).toContainText(
      'No extra-curricular activities assigned.',
    );
  });

  test('after a tab round trip, the removal is still accepted', async ({ page }) => {
    const { target, activities } = await signInAndSeed(page, '340IT33-S2', 1);
    const surname = uniqueSurname('RemoveRoundTrip');
    const [activity] = activities;
    const studentId = await seedEnrolledStudent(page, target, surname);
    await assignActivity(page, studentId, activity.extraCurricularId);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openExtraCurricularsTab(surname);
    await studentsPage.wizardModal.locator('#tabCourses').click();
    await studentsPage.wizardModal.locator('#tabExtraCurriculars').click();
    await studentsPage.removeActivity(activity.description);

    await expect(studentsPage.extraCurricularsStepMessage()).toHaveText('');
    await expect(studentsPage.assignedActivityRow(activity.description)).toHaveCount(0);
  });
});

test.describe('Students — the last extra-curricular cannot be removed with no course held', { tag: ['@340IT34'] }, () => {
  test('the last activity cannot be removed when no course is held', async ({ page }) => {
    const { activities } = await signInAndSeed(page, '340IT34-S1', 1);
    const surname = uniqueSurname('RemoveRefused');
    const [activity] = activities;
    await seedActivityOnlyStudent(page, activity.extraCurricularId, surname);
    const studentsPage = await openStudents(page);
    const deletes = recordDeletes(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openExtraCurricularsTab(surname);
    await studentsPage.removeActivity(activity.description);

    await expect(studentsPage.extraCurricularsStepMessage()).toHaveText(ENROLL_BEFORE_REMOVING);
    expect(deletes).toHaveLength(0);
    await expect(studentsPage.assignedActivityRow(activity.description)).toBeVisible();

    await studentsPage.closeWizard();
    await studentsPage.openExtraCurricularsTab(surname);
    await expect(studentsPage.assignedActivityRow(activity.description)).toBeVisible();
  });

  test('enrolling in a course lifts the refusal', async ({ page }) => {
    const { target, activities } = await signInAndSeed(page, '340IT34-S2', 1);
    const surname = uniqueSurname('RemoveLifted');
    const [activity] = activities;
    await seedActivityOnlyStudent(page, activity.extraCurricularId, surname);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openExtraCurricularsTab(surname);
    await studentsPage.removeActivity(activity.description);
    await expect(studentsPage.extraCurricularsStepMessage()).toHaveText(ENROLL_BEFORE_REMOVING);

    await studentsPage.wizardModal.locator('#tabCourses').click();
    await studentsPage.enrollInCourse({ courseLabel: target.courseLabel, teacherName: target.teacherName });
    await expect(studentsPage.enrollmentListRow(target.courseLabel)).toBeVisible();

    await studentsPage.wizardModal.locator('#tabExtraCurriculars').click();
    await studentsPage.removeActivity(activity.description);

    await expect(studentsPage.assignedActivityRow(activity.description)).toHaveCount(0);
    await expect(studentsPage.extraCurricularsStepMessage()).toHaveText('');
  });
});

test.describe('Students — the API refuses withdrawing the last course with no extra-curricular held', { tag: ['@340IT35'] }, () => {
  test('the API refuses the last-course withdrawal', async ({ page }) => {
    const { target } = await signInAndSeed(page, '340IT35-S1', 0);
    const studentId = await seedEnrolledStudent(page, target);
    const [enrollment] = await apiGet<CourseHolding[]>(page, `/api/students/${studentId}/courses`);

    const result = await apiDelete(page, `/api/students/${studentId}/courses/${enrollment.studentCourseId}`);

    expect(result.status).toBe(400);
    expect(result.error).toBe(API_REFUSAL);
    const after = await apiGet<CourseHolding[]>(page, `/api/students/${studentId}/courses`);
    expect(after.map((course) => course.studentCourseId)).toContain(enrollment.studentCourseId);
  });

  test('control: the same request is accepted once an activity is held', async ({ page }) => {
    const { target, activities } = await signInAndSeed(page, '340IT35-S2', 1);
    const studentId = await seedEnrolledStudent(page, target);
    await assignActivity(page, studentId, activities[0].extraCurricularId);
    const [enrollment] = await apiGet<CourseHolding[]>(page, `/api/students/${studentId}/courses`);

    const result = await apiDelete(page, `/api/students/${studentId}/courses/${enrollment.studentCourseId}`);

    expect(result.status).toBe(200);
    const after = await apiGet<CourseHolding[]>(page, `/api/students/${studentId}/courses`);
    expect(after).toHaveLength(0);
  });
});

test.describe('Students — the API refuses removing the last extra-curricular with no course held', { tag: ['@340IT36'] }, () => {
  test('the API refuses the last-activity removal', async ({ page }) => {
    const { activities } = await signInAndSeed(page, '340IT36-S1', 1);
    const [activity] = activities;
    const studentId = await seedActivityOnlyStudent(page, activity.extraCurricularId, uniqueSurname('ApiRemove'));

    const result = await apiDelete(page, `/api/students/${studentId}/extra-curriculars/${activity.extraCurricularId}`);

    expect(result.status).toBe(400);
    expect(result.error).toBe(API_REFUSAL);
    const after = await apiGet<ActivityHolding[]>(page, `/api/students/${studentId}/extra-curriculars`);
    expect(after.map((held) => held.extraCurricularId)).toContain(activity.extraCurricularId);
  });

  test('control: accepted once a course is held', async ({ page }) => {
    const { target, activities } = await signInAndSeed(page, '340IT36-S2', 1);
    const [activity] = activities;
    const studentId = await seedEnrolledStudent(page, target);
    await assignActivity(page, studentId, activity.extraCurricularId);

    const result = await apiDelete(page, `/api/students/${studentId}/extra-curriculars/${activity.extraCurricularId}`);

    expect(result.status).toBe(204);
    const after = await apiGet<ActivityHolding[]>(page, `/api/students/${studentId}/extra-curriculars`);
    expect(after).toHaveLength(0);
  });
});
