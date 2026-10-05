import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { loginAsRoles } from '../../fixtures/testUsers';
import {
  seedEnrolledStudent,
  seedEnrollmentTarget,
  seedPrivateActivityOnlyStudent,
  studentIdBySurname,
  waitForSeededEntry,
  type SeededEnrollmentTarget,
} from '../../fixtures/enrollment';
import { assignActivity, seedActivity } from '../../fixtures/extraCurriculars';
import { seedReportStudent } from '../../fixtures/reports';
import { slotText, type PracticeSlot } from '../../pages/extra-curriculars/ExtraCurricularsPage';
import { StudentsPage, type StudentInput } from '../../pages/students/StudentsPage';

const REQUIRED_ON_SAVE =
  'A student must have at least one course or one extra-curricular before they can be saved.';
const ENROLL_BEFORE_REMOVING =
  'A student must have at least one course or one extra-curricular. Enroll in a course before removing this activity.';
const PHASE_NOTE = "Only activities for this student's phase are offered.";
const PHASE_REFUSAL = 'A student can only be assigned to an activity offered to their own phase.';
const NO_ACTIVITIES = 'No extra-curricular activities assigned.';
const NO_COURSES = 'No course enrollments.';
const TABS = ['Student', 'Siblings', 'Guardians', 'Courses', 'Extra-Curriculars'];

/** A student has no natural key, so a run is told apart by the surname it gives its students. */
function uniqueSurname(label: string): string {
  return `${label}${Date.now()}W${test.info().workerIndex}`;
}

function uniqueDescription(label: string): string {
  return `e2e-${label}-${Date.now()}-${test.info().workerIndex}`;
}

const gradedStudent = {
  dateOfBirth: '2014-05-12',
  grade: 'Grade4' as const,
  class: 'A1' as const,
  phase: 'Junior' as const,
  language: 'English' as const,
};

const privateStudent = {
  dateOfBirth: '2014-05-12',
  grade: 'Private' as const,
  language: 'English' as const,
};

type ActivityPhase = 'Junior' | 'Senior';

interface Activity {
  description: string;
  phase: ActivityPhase;
  /** The Add Activity panel's option label, `{description} ({phase})`. */
  optionLabel: string;
  extraCurricularId: string;
  slot: PracticeSlot;
}

const DEFAULT_SLOT: PracticeSlot = { day: 'Monday', startTime: '15:00' };

/** Signs in as Teacher and Coordinator, which seeds activities and maintains students. */
async function signIn(page: Page): Promise<void> {
  await loginAsRoles(page, ['Teacher', 'Coordinator']);
}

async function seedOneActivity(
  page: Page,
  description: string,
  phase: ActivityPhase,
  slot: PracticeSlot = DEFAULT_SLOT,
): Promise<Activity> {
  const { extraCurricularId } = await seedActivity(page, { description, phase, practiceTimes: [slot] });
  return { description, phase, optionLabel: `${description} (${phase})`, extraCurricularId, slot };
}

/** A Private-grade student holding a course and no activity. */
async function seedPrivateCourseStudent(
  page: Page,
  target: SeededEnrollmentTarget,
  surname: string,
): Promise<string> {
  const studentId = await seedReportStudent(page, target, { firstName: 'Amara', lastName: surname, grade: 'Private' });
  await waitForSeededEntry(page, `/api/students/${studentId}/courses`, 'studentCourseId');
  return studentId;
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

async function apiGet<T>(page: Page, path: string): Promise<T> {
  return page.evaluate(async (path) => {
    const response = await fetch(path, {
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    return (await response.json()) as T;
  }, path);
}

interface ApiResult {
  status: number;
  error?: string;
}

async function apiSend(page: Page, method: string, path: string, body: unknown): Promise<ApiResult> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const response = await fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
        },
        body: JSON.stringify(body),
      });
      const parsed = (await response.json().catch(() => ({}))) as { error?: string };
      return { status: response.status, error: parsed.error };
    },
    { method, path, body },
  );
}

async function heldActivityIds(page: Page, studentId: string): Promise<string[]> {
  const held = await apiGet<{ extraCurricularId: string }[]>(page, `/api/students/${studentId}/extra-curriculars`);
  return held.map((activity) => activity.extraCurricularId);
}

/** Waits for the student's activities to include every one of `activities`, then returns. */
async function expectHolds(page: Page, studentId: string, activities: Activity[]): Promise<void> {
  await expect
    .poll(() => heldActivityIds(page, studentId), { timeout: 10_000 })
    .toEqual(expect.arrayContaining(activities.map((activity) => activity.extraCurricularId)));
}

/** Records every DELETE the page issues, so a refusal can be shown to have sent nothing. */
function recordDeletes(page: Page): string[] {
  const deletes: string[] = [];
  page.on('request', (request) => {
    if (request.method() === 'DELETE') deletes.push(request.url());
  });
  return deletes;
}

/** Waits for the open picker to offer `label`, which is how its option list is known to have arrived. */
async function expectOffered(studentsPage: StudentsPage, ...labels: string[]): Promise<void> {
  await expect
    .poll(() => studentsPage.activityOptionTexts(), { timeout: 10_000 })
    .toEqual(expect.arrayContaining(labels));
}

/** Expands the student's row and checks its Extra-Curriculars section lists each activity once. */
async function expectExpandedRowLists(
  studentsPage: StudentsPage,
  surname: string,
  activities: Activity[],
): Promise<void> {
  await studentsPage.toggleRowExpanded(surname);
  const summary = studentsPage.visibleExtraCurricularsSummary();
  await expect(summary).toBeVisible();
  for (const activity of activities) {
    await expect(summary.locator('.summary__item').filter({ hasText: activity.description })).toHaveCount(1);
  }
}

test.describe('Students — a Private-grade student is offered every phase', { tag: ['@340IT37'] }, () => {
  test('S1 edit mode: every phase offered, no note', async ({ page }) => {
    await signIn(page);
    const token = uniqueDescription('340IT37-S1');
    const junior = await seedOneActivity(page, `${token}-J`, 'Junior');
    const senior = await seedOneActivity(page, `${token}-S`, 'Senior');
    const target = await seedEnrollmentTarget(page);
    const surname = uniqueSurname('PrivateEdit');
    await seedPrivateCourseStudent(page, target, surname);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openExtraCurricularsTab(surname);
    await studentsPage.openAddActivityPanel();

    await expectOffered(studentsPage, junior.optionLabel, senior.optionLabel);
    const options = await studentsPage.activityOptionTexts();
    expect(options.some((text) => text.endsWith('(Junior)'))).toBe(true);
    expect(options.some((text) => text.endsWith('(Senior)'))).toBe(true);
    await expect(studentsPage.activityPhaseNote()).toBeHidden();
  });

  test('S2 create mode: every phase offered, no note', async ({ page }) => {
    await signIn(page);
    const token = uniqueDescription('340IT37-S2');
    const junior = await seedOneActivity(page, `${token}-J`, 'Junior');
    const senior = await seedOneActivity(page, `${token}-S`, 'Senior');
    const studentsPage = await openStudents(page);

    await studentsPage.startCreatingStudent({ firstName: 'Palesa', lastName: uniqueSurname('PrivateCreate'), ...privateStudent });
    await studentsPage.advanceToExtraCurriculars();
    await studentsPage.openAddActivityPanel();

    await expectOffered(studentsPage, junior.optionLabel, senior.optionLabel);
    await expect(studentsPage.activityPhaseNote()).toBeHidden();
  });

  test('S3 boundary: an activity already held is left out', async ({ page }) => {
    await signIn(page);
    const token = uniqueDescription('340IT37-S3');
    const heldSenior = await seedOneActivity(page, `${token}-S1`, 'Senior');
    const otherSenior = await seedOneActivity(page, `${token}-S2`, 'Senior');
    const junior = await seedOneActivity(page, `${token}-J`, 'Junior');
    const surname = uniqueSurname('PrivateHeld');
    await seedPrivateActivityOnlyStudent(page, [heldSenior.extraCurricularId], surname);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openExtraCurricularsTab(surname);
    await studentsPage.openAddActivityPanel();

    await expectOffered(studentsPage, otherSenior.optionLabel, junior.optionLabel);
    expect(await studentsPage.activityOptionTexts()).not.toContain(heldSenior.optionLabel);
    await expect(studentsPage.activityPhaseNote()).toBeHidden();
  });
});

test.describe('Students — a Private-grade student is saved holding activities and no course', { tag: ['@340IT38'] }, () => {
  test('S1 Junior and Senior staged, no course, saved', async ({ page }) => {
    await signIn(page);
    const token = uniqueDescription('340IT38-S1');
    const junior = await seedOneActivity(page, `${token}-J`, 'Junior');
    const senior = await seedOneActivity(page, `${token}-S`, 'Senior');
    const studentsPage = await openStudents(page);
    const surname = uniqueSurname('PrivateNoCourse');

    await studentsPage.startCreatingStudent({ firstName: 'Lindiwe', lastName: surname, ...privateStudent });
    await studentsPage.advanceToExtraCurriculars();
    await studentsPage.assignActivity(junior.optionLabel);
    await studentsPage.assignActivity(senior.optionLabel);
    await studentsPage.saveStudent();

    await expect(studentsPage.wizardModal).not.toHaveAttribute('open');
    await findOnRoster(studentsPage, surname);
    await expect(studentsPage.row(surname)).toContainText('Private');
    await studentsPage.toggleRowExpanded(surname);
    await expect(studentsPage.visibleCoursesSummary()).toContainText(NO_COURSES);
    await expect(studentsPage.visibleExtraCurricularsSummary()).toContainText(junior.description);
    await expect(studentsPage.visibleExtraCurricularsSummary()).toContainText(senior.description);

    const studentId = await studentIdBySurname(page, surname);
    await expectHolds(page, studentId, [junior, senior]);

    await page.reload();
    await studentsPage.gotoStudents();
    await findOnRoster(studentsPage, surname);
    await expectExpandedRowLists(studentsPage, surname, [junior, senior]);
    await expect(studentsPage.visibleCoursesSummary()).toContainText(NO_COURSES);
    expect(await heldActivityIds(page, studentId)).toEqual(
      expect.arrayContaining([junior.extraCurricularId, senior.extraCurricularId]),
    );
  });

  test('S2 negative: nothing staged is still refused', async ({ page }) => {
    await signIn(page);
    const studentsPage = await openStudents(page);
    const surname = uniqueSurname('PrivateNothing');

    await studentsPage.startCreatingStudent({ firstName: 'Palesa', lastName: surname, ...privateStudent });
    await studentsPage.advanceToExtraCurriculars();
    await studentsPage.saveStudent();

    await expect(studentsPage.wizardModal).toHaveAttribute('open', '');
    await expect(studentsPage.wizardModal.locator('#tabExtraCurriculars')).toHaveAttribute('aria-selected', 'true');
    await expect(studentsPage.extraCurricularsStepMessage()).toHaveText(REQUIRED_ON_SAVE);

    await studentsPage.closeWizard();
    await studentsPage.filterByName(surname);
    await expect(studentsPage.row(surname)).toHaveCount(0);

    await page.reload();
    await studentsPage.gotoStudents();
    await studentsPage.filterByName(surname);
    await expect(studentsPage.row(surname)).toHaveCount(0);
  });
});

test.describe('Students — the Extra-Curriculars tab behaves for a Private-grade student as for a graded one', { tag: ['@340IT39'] }, () => {
  test('S1 create mode: the tab is offered and is the final step', async ({ page }) => {
    await signIn(page);
    const senior = await seedOneActivity(page, uniqueDescription('340IT39-S1'), 'Senior');
    const target = await seedEnrollmentTarget(page);
    const studentsPage = await openStudents(page);
    const surname = uniqueSurname('PrivateFinal');

    await studentsPage.startCreatingStudent({ firstName: 'Thabo', lastName: surname, ...privateStudent });
    await expect(studentsPage.visibleTabs()).toHaveText(TABS);

    await studentsPage.goToNextStep();
    await studentsPage.goToNextStep();
    await studentsPage.goToNextStep();
    await studentsPage.enrollInCourse({ courseLabel: target.courseLabel, teacherName: target.teacherName });
    await expect(studentsPage.wizardModal.locator('#nextBtn')).toBeVisible();
    await expect(studentsPage.wizardModal.locator('#saveBtn')).toBeHidden();

    await studentsPage.goToNextStep();
    await studentsPage.assignActivity(senior.optionLabel);
    const stagedRow = studentsPage.assignedActivityRow(senior.description);
    await expect(stagedRow).toBeVisible();
    await expect(stagedRow).toContainText('Senior');
    await expect(stagedRow).toContainText(slotText(senior.slot));
    await expect(studentsPage.wizardModal.locator('#saveBtn')).toBeVisible();
    await expect(studentsPage.wizardModal.locator('#previousBtn')).toBeVisible();
    await expect(studentsPage.wizardModal.locator('#nextBtn')).toBeHidden();

    await studentsPage.saveStudent();
    await expect(studentsPage.wizardModal).not.toHaveAttribute('open');
    await findOnRoster(studentsPage, surname);
    await studentsPage.toggleRowExpanded(surname);
    await expect(studentsPage.visibleCoursesSummary()).toContainText(target.courseLabel);
    await expect(studentsPage.visibleExtraCurricularsSummary()).toContainText(senior.description);

    const studentId = await studentIdBySurname(page, surname);
    await expectHolds(page, studentId, [senior]);

    await page.reload();
    await studentsPage.gotoStudents();
    await findOnRoster(studentsPage, surname);
    await studentsPage.toggleRowExpanded(surname);
    await expect(studentsPage.visibleCoursesSummary()).toContainText(target.courseLabel);
    await expect(studentsPage.visibleExtraCurricularsSummary()).toContainText(senior.description);
  });

  test('S2 edit mode: the tab is offered and writes immediately', async ({ page }) => {
    await signIn(page);
    const junior = await seedOneActivity(page, uniqueDescription('340IT39-S2'), 'Junior');
    const target = await seedEnrollmentTarget(page);
    const surname = uniqueSurname('PrivateAssign');
    const studentId = await seedPrivateCourseStudent(page, target, surname);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openExtraCurricularsTab(surname);
    await expect(studentsPage.visibleTabs()).toHaveText(TABS);
    await expect(studentsPage.noActivitiesMessage()).toHaveText(NO_ACTIVITIES);

    await studentsPage.assignActivity(junior.optionLabel);
    await expect(studentsPage.assignedActivityRow(junior.description)).toBeVisible();
    await expect(studentsPage.extraCurricularsStep().locator('#panel')).toBeHidden();

    await studentsPage.closeWizard();
    await studentsPage.openExtraCurricularsTab(surname);
    await expect(studentsPage.assignedActivityRow(junior.description)).toBeVisible();
    await expectHolds(page, studentId, [junior]);
  });

  test('S3 edit mode: Remove behaves as for a graded student', async ({ page }) => {
    await signIn(page);
    const junior = await seedOneActivity(page, uniqueDescription('340IT39-S3'), 'Junior');
    const target = await seedEnrollmentTarget(page);
    const surname = uniqueSurname('PrivateRemove');
    const studentId = await seedPrivateCourseStudent(page, target, surname);
    await assignActivity(page, studentId, junior.extraCurricularId);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openExtraCurricularsTab(surname);
    await studentsPage.removeActivity(junior.description);

    await expect(studentsPage.assignedActivityRow(junior.description)).toHaveCount(0);
    await expect(studentsPage.noActivitiesMessage()).toBeVisible();
    await expect(studentsPage.extraCurricularsStepMessage()).toHaveText('');

    await page.reload();
    await studentsPage.gotoStudents();
    await findOnRoster(studentsPage, surname);
    await studentsPage.toggleRowExpanded(surname);
    await expect(studentsPage.visibleExtraCurricularsSummary()).toContainText(NO_ACTIVITIES);
  });

  test('S4 negative: a Private student with no course cannot remove their last activity', async ({ page }) => {
    await signIn(page);
    const junior = await seedOneActivity(page, uniqueDescription('340IT39-S4'), 'Junior');
    const surname = uniqueSurname('PrivateLast');
    await seedPrivateActivityOnlyStudent(page, [junior.extraCurricularId], surname);
    const studentsPage = await openStudents(page);
    const deletes = recordDeletes(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openExtraCurricularsTab(surname);
    await studentsPage.removeActivity(junior.description);

    await expect(studentsPage.extraCurricularsStepMessage()).toHaveText(ENROLL_BEFORE_REMOVING);
    expect(deletes).toHaveLength(0);
    await expect(studentsPage.assignedActivityRow(junior.description)).toBeVisible();
  });
});

test.describe('Students — a Private-grade student\'s extended view shows their activities', { tag: ['@340IT40'] }, () => {
  test('S1 populated section, the same four sections as a graded student', async ({ page }) => {
    await signIn(page);
    const token = uniqueDescription('340IT40-S1');
    const junior = await seedOneActivity(page, `${token}-J`, 'Junior', { day: 'Monday', startTime: '15:00' });
    const senior = await seedOneActivity(page, `${token}-S`, 'Senior', { day: 'Tuesday', startTime: '16:00' });
    const surname = uniqueSurname('PrivateExpanded');
    await seedPrivateActivityOnlyStudent(page, [junior.extraCurricularId, senior.extraCurricularId], surname);
    const studentsPage = await openStudents(page);

    const expectPopulated = async (): Promise<void> => {
      await findOnRoster(studentsPage, surname);
      await expectExpandedRowLists(studentsPage, surname, [junior, senior]);
      await expect(studentsPage.visibleSiblingsSummary()).toBeVisible();
      await expect(studentsPage.visibleGuardiansSummary()).toBeVisible();
      await expect(studentsPage.visibleCoursesSummary()).toContainText(NO_COURSES);
      for (const activity of [junior, senior]) {
        const entry = studentsPage
          .visibleExtraCurricularsSummary()
          .locator('.summary__item')
          .filter({ hasText: activity.description });
        await expect(entry.locator('.summary__item-practice-times')).toHaveText(slotText(activity.slot));
      }
    };

    await expectPopulated();
    await page.reload();
    await studentsPage.gotoStudents();
    await expectPopulated();
  });

  test('S2 boundary: empty state for a Private student holding no activity', async ({ page }) => {
    await signIn(page);
    const target = await seedEnrollmentTarget(page);
    const surname = uniqueSurname('PrivateEmpty');
    await seedPrivateCourseStudent(page, target, surname);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.toggleRowExpanded(surname);

    await expect(studentsPage.visibleExtraCurricularsSummary()).toBeVisible();
    await expect(studentsPage.visibleExtraCurricularsSummary()).toContainText(NO_ACTIVITIES);
  });
});

test.describe('Students — a Junior student is offered only Junior activities', { tag: ['@340IT41'] }, () => {
  test('S1 edit mode: only Junior, note shown', async ({ page }) => {
    await signIn(page);
    const token = uniqueDescription('340IT41-S1');
    const junior = await seedOneActivity(page, `${token}-J`, 'Junior');
    const senior = await seedOneActivity(page, `${token}-S`, 'Senior');
    const target = await seedEnrollmentTarget(page);
    const surname = uniqueSurname('JuniorEdit');
    await seedEnrolledStudent(page, target, surname);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openExtraCurricularsTab(surname);
    await studentsPage.openAddActivityPanel();

    await expectOffered(studentsPage, junior.optionLabel);
    const options = await studentsPage.activityOptionTexts();
    expect(options).not.toContain(senior.optionLabel);
    for (const option of options) expect(option).toMatch(/\(Junior\)$/);
    await expect(studentsPage.activityPhaseNote()).toBeVisible();
    await expect(studentsPage.activityPhaseNote()).toHaveText(PHASE_NOTE);
  });

  test('S2 create mode: only Junior, note shown', async ({ page }) => {
    await signIn(page);
    const token = uniqueDescription('340IT41-S2');
    const junior = await seedOneActivity(page, `${token}-J`, 'Junior');
    const senior = await seedOneActivity(page, `${token}-S`, 'Senior');
    const studentsPage = await openStudents(page);

    await studentsPage.startCreatingStudent({ firstName: 'Naledi', lastName: uniqueSurname('JuniorCreate'), ...gradedStudent });
    await studentsPage.advanceToExtraCurriculars();
    await studentsPage.openAddActivityPanel();

    await expectOffered(studentsPage, junior.optionLabel);
    const options = await studentsPage.activityOptionTexts();
    expect(options).not.toContain(senior.optionLabel);
    for (const option of options) expect(option).toMatch(/\(Junior\)$/);
    await expect(studentsPage.activityPhaseNote()).toBeVisible();
  });
});

test.describe('Students — the API refuses a Senior activity for a Junior student', { tag: ['@340IT42'] }, () => {
  test('S1 refused, nothing assigned', async ({ page }) => {
    await signIn(page);
    const senior = await seedOneActivity(page, uniqueDescription('340IT42-S1'), 'Senior');
    const target = await seedEnrollmentTarget(page);
    const studentId = await seedEnrolledStudent(page, target);

    const result = await apiSend(page, 'POST', `/api/students/${studentId}/extra-curriculars`, {
      extraCurricularId: senior.extraCurricularId,
    });

    expect(result.status).toBe(400);
    expect(result.error).toBe(PHASE_REFUSAL);
    expect(await heldActivityIds(page, studentId)).not.toContain(senior.extraCurricularId);
  });

  test('S2 control: the same request for a Junior activity is accepted', async ({ page }) => {
    await signIn(page);
    const junior = await seedOneActivity(page, uniqueDescription('340IT42-S2'), 'Junior');
    const target = await seedEnrollmentTarget(page);
    const studentId = await seedEnrolledStudent(page, target);

    const result = await apiSend(page, 'POST', `/api/students/${studentId}/extra-curriculars`, {
      extraCurricularId: junior.extraCurricularId,
    });

    expect(result.status).toBe(201);
    await expectHolds(page, studentId, [junior]);
  });

  test('S3 control: a Private-grade student is accepted for the same Senior activity', async ({ page }) => {
    await signIn(page);
    const senior = await seedOneActivity(page, uniqueDescription('340IT42-S3'), 'Senior');
    const target = await seedEnrollmentTarget(page);
    const studentId = await seedPrivateCourseStudent(page, target, uniqueSurname('PrivateApi'));

    const result = await apiSend(page, 'POST', `/api/students/${studentId}/extra-curriculars`, {
      extraCurricularId: senior.extraCurricularId,
    });

    expect(result.status).toBe(201);
    await expectHolds(page, studentId, [senior]);
  });
});

/** A Grade4 Junior student holding a course and two Junior activities, J1 and J2. */
async function seedGradedStudentHoldingTwo(
  page: Page,
  label: string,
  surname: string,
): Promise<{ studentId: string; j1: Activity; j2: Activity }> {
  await signIn(page);
  const token = uniqueDescription(label);
  const j1 = await seedOneActivity(page, `${token}-J1`, 'Junior');
  const j2 = await seedOneActivity(page, `${token}-J2`, 'Junior');
  const target = await seedEnrollmentTarget(page);
  const studentId = await seedEnrolledStudent(page, target, surname);
  await assignActivity(page, studentId, j1.extraCurricularId);
  await assignActivity(page, studentId, j2.extraCurricularId);
  return { studentId, j1, j2 };
}

test.describe('Students — changing a graded student to Private keeps their activities', { tag: ['@340IT43'] }, () => {
  test('S1 through the wizard', async ({ page }) => {
    const surname = uniqueSurname('ToPrivate');
    const { studentId, j1, j2 } = await seedGradedStudentHoldingTwo(page, '340IT43-S1', surname);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.row(surname).locator('.students-table__btn--edit').click();
    await studentsPage.setGrade('Private');
    await expect(studentsPage.wizardModal.locator('#studentStep').locator('#class')).toBeHidden();
    await expect(studentsPage.wizardModal.locator('#studentStep').locator('#phase')).toBeHidden();
    await expect(studentsPage.visibleTabs()).toHaveText(TABS);
    await studentsPage.wizardModal.locator('#studentSaveBtn').click();

    await expect(studentsPage.wizardModal).not.toHaveAttribute('open');
    await findOnRoster(studentsPage, surname);
    await expect(studentsPage.row(surname)).toContainText('Private');
    await expect(studentsPage.row(surname)).toContainText('—');
    await expectExpandedRowLists(studentsPage, surname, [j1, j2]);

    await page.reload();
    await studentsPage.gotoStudents();
    await findOnRoster(studentsPage, surname);
    await expect(studentsPage.row(surname)).toContainText('Private');
    await expectExpandedRowLists(studentsPage, surname, [j1, j2]);
    expect(await heldActivityIds(page, studentId)).toEqual(
      expect.arrayContaining([j1.extraCurricularId, j2.extraCurricularId]),
    );

    await studentsPage.openExtraCurricularsTab(surname);
    await expect(studentsPage.assignedActivityRow(j1.description)).toBeVisible();
    await expect(studentsPage.assignedActivityRow(j2.description)).toBeVisible();
  });

  test('S2 through the API', async ({ page }) => {
    const surname = uniqueSurname('ToPrivateApi');
    const { studentId, j1, j2 } = await seedGradedStudentHoldingTwo(page, '340IT43-S2', surname);

    const result = await apiSend(page, 'PUT', `/api/students/${studentId}`, {
      firstName: 'Amara',
      lastName: surname,
      dateOfBirth: '2014-05-12',
      grade: 'Private',
      class: null,
      phase: null,
      language: 'English',
    });

    expect(result.status).toBe(200);
    expect(await heldActivityIds(page, studentId)).toEqual(
      expect.arrayContaining([j1.extraCurricularId, j2.extraCurricularId]),
    );
  });

  test('S3 boundary: cancelling an edit that switched to Private changes nothing', async ({ page }) => {
    const surname = uniqueSurname('ToPrivateCancel');
    const { j1, j2 } = await seedGradedStudentHoldingTwo(page, '340IT43-S3', surname);
    const studentsPage = await openStudents(page);
    const deletes = recordDeletes(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.row(surname).locator('.students-table__btn--edit').click();
    await studentsPage.setGrade('Private');
    await studentsPage.closeWizard();

    await expect(studentsPage.wizardModal).not.toHaveAttribute('open');
    await expect(studentsPage.row(surname)).toContainText('Junior');
    await expect(studentsPage.row(surname)).not.toContainText('Private');
    await expectExpandedRowLists(studentsPage, surname, [j1, j2]);
    expect(deletes).toHaveLength(0);
  });
});

test.describe('Students — activities staged in the create wizard survive a change to Private', { tag: ['@340IT44'] }, () => {
  async function startGradedAndStage(
    studentsPage: StudentsPage,
    surname: string,
    staged: Activity[],
  ): Promise<void> {
    const input: StudentInput = { firstName: 'Lindiwe', lastName: surname, ...gradedStudent };
    await studentsPage.startCreatingStudent(input);
    await studentsPage.advanceToExtraCurriculars();
    for (const activity of staged) await studentsPage.assignActivity(activity.optionLabel);
    for (let step = 0; step < 4; step++) await studentsPage.goToPreviousStep();
    await studentsPage.setGrade('Private');
    await studentsPage.advanceToExtraCurriculars();
    await expect(studentsPage.wizardModal.locator('#tabExtraCurriculars')).toHaveAttribute('aria-selected', 'true');
  }

  test('S1 staged activities survive the change to Private', async ({ page }) => {
    await signIn(page);
    const token = uniqueDescription('340IT44-S1');
    const j1 = await seedOneActivity(page, `${token}-J1`, 'Junior');
    const j2 = await seedOneActivity(page, `${token}-J2`, 'Junior');
    const studentsPage = await openStudents(page);
    const surname = uniqueSurname('StagedToPrivate');

    await startGradedAndStage(studentsPage, surname, [j1, j2]);
    await expect(studentsPage.assignedActivityRow(j1.description)).toBeVisible();
    await expect(studentsPage.assignedActivityRow(j2.description)).toBeVisible();
    await studentsPage.saveStudent();

    await expect(studentsPage.wizardModal).not.toHaveAttribute('open');
    await findOnRoster(studentsPage, surname);
    await expect(studentsPage.row(surname)).toContainText('Private');
    await expectExpandedRowLists(studentsPage, surname, [j1, j2]);

    const studentId = await studentIdBySurname(page, surname);
    await expectHolds(page, studentId, [j1, j2]);

    await page.reload();
    await studentsPage.gotoStudents();
    await findOnRoster(studentsPage, surname);
    await expectExpandedRowLists(studentsPage, surname, [j1, j2]);
  });

  test('S2 after the change, every phase is offered and staging continues', async ({ page }) => {
    await signIn(page);
    const token = uniqueDescription('340IT44-S2');
    const junior = await seedOneActivity(page, `${token}-J`, 'Junior');
    const senior = await seedOneActivity(page, `${token}-S`, 'Senior');
    const studentsPage = await openStudents(page);
    const surname = uniqueSurname('StagedMore');

    await startGradedAndStage(studentsPage, surname, [junior]);
    await studentsPage.openAddActivityPanel();
    await expectOffered(studentsPage, senior.optionLabel);
    expect(await studentsPage.activityOptionTexts()).not.toContain(junior.optionLabel);
    await expect(studentsPage.activityPhaseNote()).toBeHidden();

    await studentsPage.cancelAddActivityPanel();
    await studentsPage.assignActivity(senior.optionLabel);
    await studentsPage.saveStudent();

    await expect(studentsPage.wizardModal).not.toHaveAttribute('open');
    await findOnRoster(studentsPage, surname);
    await expect(studentsPage.row(surname)).toContainText('Private');
    const studentId = await studentIdBySurname(page, surname);
    await expectHolds(page, studentId, [junior, senior]);

    await page.reload();
    await studentsPage.gotoStudents();
    await findOnRoster(studentsPage, surname);
    await expectExpandedRowLists(studentsPage, surname, [junior, senior]);
  });
});

test.describe('Students — the Add Activity panel names each activity with its phase', { tag: ['@340IT51'] }, () => {
  const OPTION_PATTERN = /^.+ \((Junior|Senior)\)$/;

  test('S1 graded student, edit mode', async ({ page }) => {
    await signIn(page);
    const choir = await seedOneActivity(page, `${uniqueDescription('340IT51-S1')} Choir`, 'Junior');
    const target = await seedEnrollmentTarget(page);
    const surname = uniqueSurname('LabelGraded');
    await seedEnrolledStudent(page, target, surname);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openExtraCurricularsTab(surname);
    await studentsPage.openAddActivityPanel();

    await expectOffered(studentsPage, choir.optionLabel);
    for (const option of await studentsPage.activityOptionTexts()) expect(option).toMatch(OPTION_PATTERN);
    const panel = studentsPage.extraCurricularsStep().locator('#panel');
    await expect(panel.getByLabel('Activity', { exact: true })).toBeVisible();
    await expect(studentsPage.activityPanelPhaseControl()).toHaveCount(0);
    await expect(panel.locator('#phaseField')).toHaveCount(0);
    await expect(studentsPage.extraCurricularsStep().locator('#cancelBtn')).toBeVisible();
    await expect(studentsPage.extraCurricularsStep().locator('#assignBtn')).toBeVisible();
  });

  test('S2 Private-grade student, create mode', async ({ page }) => {
    await signIn(page);
    const orchestra = await seedOneActivity(page, `${uniqueDescription('340IT51-S2')} Orchestra`, 'Senior');
    const studentsPage = await openStudents(page);

    await studentsPage.startCreatingStudent({ firstName: 'Sipho', lastName: uniqueSurname('LabelPrivate'), ...privateStudent });
    await studentsPage.advanceToExtraCurriculars();
    await studentsPage.openAddActivityPanel();

    await expectOffered(studentsPage, orchestra.optionLabel);
    for (const option of await studentsPage.activityOptionTexts()) expect(option).toMatch(OPTION_PATTERN);
    await expect(studentsPage.activityPanelPhaseControl()).toHaveCount(0);
    await expect(studentsPage.extraCurricularsStep().locator('#panel').locator('#phaseField')).toHaveCount(0);
  });

  test('S3 negative: the new label stays in the panel', async ({ page }) => {
    await signIn(page);
    const choir = await seedOneActivity(page, `${uniqueDescription('340IT51-S3')} Choir`, 'Junior');
    const target = await seedEnrollmentTarget(page);
    const surname = uniqueSurname('LabelOutside');
    await seedEnrolledStudent(page, target, surname);
    const studentsPage = await openStudents(page);

    await findOnRoster(studentsPage, surname);
    await studentsPage.openExtraCurricularsTab(surname);
    await studentsPage.assignActivity(choir.optionLabel);

    const row = studentsPage.assignedActivityRow(choir.description);
    await expect(row).toBeVisible();
    await expect(row.locator('td').first()).toHaveText(choir.description);
    await expect(row).not.toContainText('(Junior)');
    await expect(row.locator('.ec-step__badge--junior')).toBeVisible();

    await studentsPage.closeWizard();
    await studentsPage.toggleRowExpanded(surname);
    const summary = studentsPage.visibleExtraCurricularsSummary();
    await expect(summary).toContainText(choir.description);
    await expect(summary).not.toContainText(choir.optionLabel);
  });
});
