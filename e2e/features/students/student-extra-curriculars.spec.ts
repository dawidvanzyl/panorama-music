import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import {
  createRegisteredUser,
  loginAsAdmin,
  uniqueTestEmail,
} from '../../fixtures/testUsers';
import { seedEnrollmentTarget, seedEnrolledStudent, studentIdBySurname } from '../../fixtures/enrollment';
import { landingUrl } from '../../fixtures/navigation';
import { StudentsPage } from '../../pages/students/StudentsPage';
import { ExtraCurricularsPage, slotText, type PracticeSlot } from '../../pages/extra-curriculars/ExtraCurricularsPage';
import { LoginPage } from '../../pages/identity/auth/LoginPage';
import type { UserRole } from '../../pages/identity/admin/AdminUsersPage';

/**
 * A student has no natural key, so a run is told apart by the surname it gives
 * its students: the clock in milliseconds plus the worker index, as
 * `course-enrollment.spec.ts` already does.
 */
function uniqueSurname(label: string): string {
  return `${label}${Date.now()}W${test.info().workerIndex}`;
}

/** Tells this run's seeded activities and users apart from another worker's. */
function uniqueToken(label: string): string {
  return `e2e-${label}-${Date.now()}-${test.info().workerIndex}`;
}

const studentDefaults = {
  dateOfBirth: '2014-05-12',
  grade: 'Grade4' as const,
  class: 'A1' as const,
  phase: 'Junior' as const,
  language: 'English' as const,
};

interface SeededActivity {
  description: string;
  slot: PracticeSlot;
  /**
   * The Add Activity panel's option label — the activity's description alone,
   * per #278's R11 display correction, superseding the older
   * "{description} — {day} {startTime}" label this suite used before it.
   */
  optionLabel: string;
  extraCurricularId: string;
  practiceTimeId: string;
}

interface SeededActivityWithOwner extends SeededActivity {
  /** The Coordinator who created it — needed to re-verify its state later, under their own login. */
  owner: Credentials;
}

interface Credentials {
  email: string;
  password: string;
}

/** Registers and signs a freshly invited user of these roles in, from inside `page`. */
async function loginAsNewUser(page: Page, label: string, roles: UserRole[]): Promise<Credentials> {
  const email = uniqueTestEmail(label);
  const password = 'ExtraCurricularAuthPass123!';
  await createRegisteredUser(page, email, password, roles);
  await loginAsExistingUser(page, email, password, roles);
  return { email, password };
}

async function loginAsExistingUser(page: Page, email: string, password: string, roles: UserRole[]): Promise<void> {
  const loginPage = new LoginPage(page);
  await loginPage.gotoLogin();
  await loginPage.login(email, password);
  await expect(page).toHaveURL(landingUrl(...roles));
}

/** Reads one activity by its (unique) description, from inside a page already signed in. */
async function getActivityByDescription(
  page: Page,
  description: string,
): Promise<{ extraCurricularId: string; practiceTimes: { practiceTimeId: string; day: string; startTime: string }[] }> {
  return page.evaluate(async (desc) => {
    const response = await fetch('/api/extra-curriculars', {
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    const activities = (await response.json()) as {
      extraCurricularId: string;
      description: string;
      practiceTimes: { practiceTimeId: string; day: string; startTime: string }[];
    }[];
    const match = activities.find((a) => a.description === desc);
    if (!match) throw new Error(`No activity found for "${desc}".`);
    return match;
  }, description);
}

/**
 * Creates a Junior-phase activity with one practice time, through the create
 * form, exactly as `extra-curricular-management.spec.ts` and
 * `extra-curricular-practice-times.spec.ts` already do — from inside a page
 * already signed in as whoever should own it.
 */
async function createJuniorActivityAs(page: Page, description: string, slot: PracticeSlot): Promise<SeededActivity> {
  const activitiesPage = new ExtraCurricularsPage(page);
  await activitiesPage.gotoExtraCurriculars();
  await activitiesPage.createActivity(description, 'Junior', [slot]);
  await expect(activitiesPage.row(description)).toBeVisible();

  const { extraCurricularId, practiceTimes } = await getActivityByDescription(page, description);
  return {
    description,
    slot,
    optionLabel: description,
    extraCurricularId,
    practiceTimeId: practiceTimes[0].practiceTimeId,
  };
}

/** A Junior activity created by a fresh, throwaway Coordinator. */
async function seedJuniorActivity(page: Page, description: string, slot: PracticeSlot): Promise<SeededActivity> {
  await loginAsNewUser(page, 'ec-coordinator', ['Coordinator']);
  return createJuniorActivityAs(page, description, slot);
}

/** Same as `seedJuniorActivity`, but also returns the owning Coordinator's credentials. */
async function seedJuniorActivityWithOwner(
  page: Page,
  description: string,
  slot: PracticeSlot,
): Promise<SeededActivityWithOwner> {
  const owner = await loginAsNewUser(page, 'ec-coordinator', ['Coordinator']);
  const activity = await createJuniorActivityAs(page, description, slot);
  return { ...activity, owner };
}

/**
 * A Senior-phase activity, created by a fresh, throwaway Coordinator. Used by
 * `10IT11` S2, which deliberately picks the phase furthest from anything a
 * Private-grade student (who has none) could be read as matching, so the
 * refusal cannot be mistaken for the ordinary phase-mismatch rule (`277UC7`).
 */
async function seedSeniorActivity(page: Page, description: string, slot: PracticeSlot): Promise<SeededActivity> {
  await loginAsNewUser(page, 'ec-coordinator', ['Coordinator']);
  const activitiesPage = new ExtraCurricularsPage(page);
  await activitiesPage.gotoExtraCurriculars();
  await activitiesPage.createActivity(description, 'Senior', [slot]);
  await expect(activitiesPage.row(description)).toBeVisible();

  const { extraCurricularId, practiceTimes } = await getActivityByDescription(page, description);
  return {
    description,
    slot,
    optionLabel: description,
    extraCurricularId,
    practiceTimeId: practiceTimes[0].practiceTimeId,
  };
}

/** A Junior student, enrolled in one course, seeded by Admin through the API. */
async function seedJuniorStudent(page: Page): Promise<string> {
  await loginAsAdmin(page);
  const target = await seedEnrollmentTarget(page);
  return seedEnrolledStudent(page, target);
}

/** Issues one request from inside the page, so it carries the signed-in caller's bearer token. */
async function apiStatus(page: Page, method: string, path: string, body?: unknown): Promise<number> {
  return page.evaluate(
    async ({ method, path, body }) => {
      const response = await fetch(path, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      return response.status;
    },
    { method, path, body },
  );
}

interface StudentActivity {
  extraCurricularId: string;
  description: string;
  phase: string;
  practiceTimes: { day: string; startTime: string }[];
}

/** The activities a student is assigned to, read as Admin. */
async function getStudentActivities(page: Page, studentId: string): Promise<StudentActivity[]> {
  return page.evaluate(async (id) => {
    const response = await fetch(`/api/students/${id}/extra-curriculars`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
    });
    return (await response.json()) as StudentActivity[];
  }, studentId);
}

test.describe('Extra-Curriculars — a student can be assigned to multiple activities', { tag: ['@10IT2'] }, () => {
  test('two activities staged during creation are saved and survive a reload, and a third joins them in edit mode', async ({
    page,
  }) => {
    const token = uniqueToken('10IT2');

    // Seeding: two Junior activities via a Coordinator, then an Admin session
    // to create the student through the wizard.
    const marimba = await seedJuniorActivity(page, `${token} Marimba Band`, { day: 'Monday', startTime: '15:00' });
    const recorder = await seedJuniorActivity(page, `${token} Recorder Group`, { day: 'Tuesday', startTime: '15:00' });

    await loginAsAdmin(page);
    const target = await seedEnrollmentTarget(page);
    const studentsPage = new StudentsPage(page);
    await studentsPage.gotoStudents();

    const surname = uniqueSurname('EC');

    // --- S1: two activities staged during creation are both saved and survive a reload ---
    await studentsPage.startCreatingStudent({ firstName: 'Amara', lastName: surname, ...studentDefaults });
    await studentsPage.goToNextStep(); // Student -> Siblings
    await studentsPage.goToNextStep(); // Siblings -> Guardians
    await studentsPage.goToNextStep(); // Guardians -> Courses
    await studentsPage.enrollInCourse({ courseLabel: target.courseLabel, teacherName: target.teacherName });
    await studentsPage.goToNextStep(); // Courses -> Extra-Curriculars

    await studentsPage.assignActivity(marimba.optionLabel);
    // The second assignment does not replace the first.
    await expect(studentsPage.assignedActivityRow(marimba.description)).toBeVisible();

    await studentsPage.assignActivity(recorder.optionLabel);
    await expect(studentsPage.assignedActivityRow(marimba.description)).toBeVisible();
    await expect(studentsPage.assignedActivityRow(recorder.description)).toBeVisible();

    await studentsPage.saveStudent();
    await expect(studentsPage.row(surname)).toBeVisible();

    const studentId = await studentIdBySurname(page, surname);

    // The wizard closes and the list reloads as soon as the student record
    // itself is created — the siblings/guardians/enrollments/extra-curricular
    // links it staged are each written afterwards, in their own background
    // round trip. `expect.poll` is what waits that out; a one-shot GET taken
    // the instant the row appears is a race against that background chain,
    // not a proof of anything about persistence.
    await expect
      .poll(async () => (await getStudentActivities(page, studentId)).map((activity) => activity.description), {
        timeout: 10_000,
      })
      .toEqual(expect.arrayContaining([marimba.description, recorder.description]));
    const afterSave = await getStudentActivities(page, studentId);
    const savedDescriptions = afterSave.map((activity) => activity.description);
    expect(savedDescriptions).toContain(marimba.description);
    expect(savedDescriptions).toContain(recorder.description);

    const marimbaSaved = afterSave.find((activity) => activity.description === marimba.description)!;
    const recorderSaved = afterSave.find((activity) => activity.description === recorder.description)!;
    expect(marimbaSaved.phase).toBe('Junior');
    expect(marimbaSaved.practiceTimes.map(({ day, startTime }) => ({ day, startTime }))).toEqual([
      { day: 'Monday', startTime: '15:00:00' },
    ]);
    expect(recorderSaved.phase).toBe('Junior');
    expect(recorderSaved.practiceTimes.map(({ day, startTime }) => ({ day, startTime }))).toEqual([
      { day: 'Tuesday', startTime: '15:00:00' },
    ]);

    // Reopening the student proves the multiplicity was persisted with the
    // student, not merely held in the wizard's in-memory state.
    await studentsPage.openExtraCurricularsTab(surname);
    await expect(studentsPage.assignedActivityRow(marimba.description)).toBeVisible();
    await expect(studentsPage.assignedActivityRow(recorder.description)).toBeVisible();

    // --- S2: a third activity assigned in edit mode joins the two already on the student ---
    const ensemble = await seedJuniorActivity(page, `${token} Recorder Ensemble`, {
      day: 'Wednesday',
      startTime: '15:00',
    });

    // Seeding the third activity switched the page's session to a fresh
    // Coordinator; reopen the student as Admin to continue in edit mode.
    await loginAsAdmin(page);
    await studentsPage.gotoStudents();
    await studentsPage.openExtraCurricularsTab(surname);

    await studentsPage.assignActivity(ensemble.optionLabel);

    // Edit mode writes on assignment, so the table shows all three
    // immediately, without a Save being pressed.
    await expect(studentsPage.assignedActivityRow(marimba.description)).toBeVisible();
    await expect(studentsPage.assignedActivityRow(recorder.description)).toBeVisible();
    await expect(studentsPage.assignedActivityRow(ensemble.description)).toBeVisible();

    // A GET issued straight after proves the immediate write reached
    // storage rather than only the rendered table — a materially different
    // code path from S1's staged batch write.
    const afterThird = await getStudentActivities(page, studentId);
    const thirdDescriptions = afterThird.map((activity) => activity.description);
    expect(thirdDescriptions).toContain(marimba.description);
    expect(thirdDescriptions).toContain(recorder.description);
    expect(thirdDescriptions).toContain(ensemble.description);
  });
});

test.describe(
  'Extra-Curriculars — the student-assignment and practice-time endpoints require authentication',
  { tag: ['@10IT10'] },
  () => {
    test('refuses an anonymous caller on all six endpoints', async ({ page }) => {
      // As in course-enrollment.spec.ts's 9IT6: an anonymous caller is
      // refused before anything is looked up, so random identifiers are used
      // throughout and nothing needs seeding. `page.request` attaches no
      // bearer token, which is what proves the anonymous case.
      const studentId = crypto.randomUUID();
      const activityId = crypto.randomUUID();
      const practiceTimeId = crypto.randomUUID();

      const listResponse = await page.request.get(`/api/students/${studentId}/extra-curriculars`);
      const assignableResponse = await page.request.get(`/api/students/${studentId}/extra-curriculars/assignable`);
      const assignResponse = await page.request.post(`/api/students/${studentId}/extra-curriculars`, {
        data: { extraCurricularId: activityId },
      });
      const removeResponse = await page.request.delete(`/api/students/${studentId}/extra-curriculars/${activityId}`);
      const addPracticeTimeResponse = await page.request.post(`/api/extra-curriculars/${activityId}/practice-times`, {
        data: { day: 'Monday', startTime: '15:00' },
      });
      const removePracticeTimeResponse = await page.request.delete(
        `/api/extra-curriculars/${activityId}/practice-times/${practiceTimeId}`,
      );

      expect(listResponse.status()).toBe(401);
      expect(assignableResponse.status()).toBe(401);
      expect(assignResponse.status()).toBe(401);
      expect(removeResponse.status()).toBe(401);
      expect(addPracticeTimeResponse.status()).toBe(401);
      expect(removePracticeTimeResponse.status()).toBe(401);
    });

    test("a Teacher-only caller may maintain a student's assignments but is refused the activity's practice times", async ({
      page,
    }) => {
      const token = uniqueToken('10IT10-S2');
      const studentId = await seedJuniorStudent(page);
      const activity = await seedJuniorActivityWithOwner(page, `${token} Practice Boundary`, {
        day: 'Monday',
        startTime: '15:00',
      });

      await loginAsNewUser(page, '10it10-teacher', ['Teacher']);

      const listStatus = await apiStatus(page, 'GET', `/api/students/${studentId}/extra-curriculars`);
      const assignableStatus = await apiStatus(page, 'GET', `/api/students/${studentId}/extra-curriculars/assignable`);
      const assignStatus = await apiStatus(page, 'POST', `/api/students/${studentId}/extra-curriculars`, {
        extraCurricularId: activity.extraCurricularId,
      });
      const removeStatus = await apiStatus(
        page,
        'DELETE',
        `/api/students/${studentId}/extra-curriculars/${activity.extraCurricularId}`,
      );
      const addPracticeTimeStatus = await apiStatus(
        page,
        'POST',
        `/api/extra-curriculars/${activity.extraCurricularId}/practice-times`,
        { day: 'Tuesday', startTime: '16:00' },
      );
      const removePracticeTimeStatus = await apiStatus(
        page,
        'DELETE',
        `/api/extra-curriculars/${activity.extraCurricularId}/practice-times/${activity.practiceTimeId}`,
      );

      // A Teacher already maintains student records elsewhere, and this
      // story's endpoints carry that same boundary.
      expect(listStatus).toBe(200);
      expect(assignableStatus).toBe(200);
      expect(assignStatus).toBe(201);
      expect(removeStatus).toBe(204);
      // Practice times are the Coordinator's own area — refused to a Teacher.
      expect(addPracticeTimeStatus).toBe(403);
      expect(removePracticeTimeStatus).toBe(403);

      // The 403 at the last step removed nothing: the activity still holds
      // exactly its one original practice time, confirmed as the Coordinator
      // who created it.
      await loginAsExistingUser(page, activity.owner.email, activity.owner.password, ['Coordinator']);
      const activitiesPage = new ExtraCurricularsPage(page);
      await activitiesPage.gotoExtraCurriculars();
      const row = activitiesPage.row(activity.description);
      await expect(activitiesPage.practiceTimesCell(row)).toHaveText(slotText(activity.slot));
    });

    test("a Coordinator-only caller may maintain an activity's practice times but is refused a student's assignments", async ({
      page,
    }) => {
      const token = uniqueToken('10IT10-S3');
      const studentId = await seedJuniorStudent(page);

      const coordinator = await loginAsNewUser(page, '10it10-coordinator', ['Coordinator']);
      const ownActivity = await createJuniorActivityAs(page, `${token} Own Activity`, {
        day: 'Wednesday',
        startTime: '14:00',
      });
      const heldActivity = await createJuniorActivityAs(page, `${token} Held Activity`, {
        day: 'Thursday',
        startTime: '14:00',
      });

      // Admin creates the "held" assignment before the Coordinator's own
      // steps run, giving step 6 a real assignment to attempt against.
      await loginAsAdmin(page);
      const assignHeldStatus = await apiStatus(page, 'POST', `/api/students/${studentId}/extra-curriculars`, {
        extraCurricularId: heldActivity.extraCurricularId,
      });
      expect(assignHeldStatus).toBe(201);

      await loginAsExistingUser(page, coordinator.email, coordinator.password, ['Coordinator']);

      const addPracticeTimeStatus = await apiStatus(
        page,
        'POST',
        `/api/extra-curriculars/${ownActivity.extraCurricularId}/practice-times`,
        { day: 'Wednesday', startTime: '15:00' },
      );
      expect(addPracticeTimeStatus).toBe(201);

      const afterAdd = await getActivityByDescription(page, ownActivity.description);
      expect(afterAdd.practiceTimes).toHaveLength(2);
      const addedPracticeTimeId = afterAdd.practiceTimes.find(
        (slot) => slot.practiceTimeId !== ownActivity.practiceTimeId,
      )!.practiceTimeId;

      const removePracticeTimeStatus = await apiStatus(
        page,
        'DELETE',
        `/api/extra-curriculars/${ownActivity.extraCurricularId}/practice-times/${addedPracticeTimeId}`,
      );
      // The route answers 200, not the newer Student-assignment group's 204 —
      // this is #276's own, previously shipped and proven contract
      // (`RemoveExtraCurricularPracticeTime` returns `Results.Ok()`, pinned by
      // `ExtraCurricularRoutesTests`), not something this story changes.
      expect(removePracticeTimeStatus).toBe(200);

      const listStatus = await apiStatus(page, 'GET', `/api/students/${studentId}/extra-curriculars`);
      const assignableStatus = await apiStatus(page, 'GET', `/api/students/${studentId}/extra-curriculars/assignable`);
      const assignStatus = await apiStatus(page, 'POST', `/api/students/${studentId}/extra-curriculars`, {
        extraCurricularId: ownActivity.extraCurricularId,
      });
      const removeHeldStatus = await apiStatus(
        page,
        'DELETE',
        `/api/students/${studentId}/extra-curriculars/${heldActivity.extraCurricularId}`,
      );

      // Refused on role, not on the resources not existing — real,
      // pre-existing resources are used throughout, so a 404 here would be
      // just as wrong as a 200.
      expect(listStatus).toBe(403);
      expect(assignableStatus).toBe(403);
      expect(assignStatus).toBe(403);
      expect(removeHeldStatus).toBe(403);

      // The practice-time count is back at one.
      const afterRemove = await getActivityByDescription(page, ownActivity.description);
      expect(afterRemove.practiceTimes).toHaveLength(1);
      expect(afterRemove.practiceTimes[0].practiceTimeId).toBe(ownActivity.practiceTimeId);

      // Admin confirms: no assignment to the Coordinator's activity was
      // created by the refused step 5, and the held assignment from the
      // precondition still exists — step 6's refusal removed nothing.
      await loginAsAdmin(page);
      const afterAll = await getStudentActivities(page, studentId);
      const ids = afterAll.map((activity) => activity.extraCurricularId);
      expect(ids).toContain(heldActivity.extraCurricularId);
      expect(ids).not.toContain(ownActivity.extraCurricularId);
    });
  },
);

test.describe('Extra-Curriculars — a Private-grade student takes no part in extra-curriculars', { tag: ['@10IT11'] }, () => {
  test("the wizard never offers the step, and the assignment endpoint refuses the student directly", async ({
    page,
  }) => {
    // --- S1: the wizard never offers the Extra-Curriculars step, in create mode or in edit mode ---
    await loginAsAdmin(page);
    const target = await seedEnrollmentTarget(page);
    const studentsPage = new StudentsPage(page);
    await studentsPage.gotoStudents();

    const surname = uniqueSurname('Private');
    await studentsPage.startCreatingStudent({
      firstName: 'Naledi',
      lastName: surname,
      dateOfBirth: '2014-05-12',
      grade: 'Private',
      language: 'English',
    });
    await studentsPage.goToNextStep(); // Student -> Siblings
    await studentsPage.goToNextStep(); // Siblings -> Guardians
    await studentsPage.goToNextStep(); // Guardians -> Courses
    await studentsPage.enrollInCourse({ courseLabel: target.courseLabel, teacherName: target.teacherName });

    // Courses carries Save directly — there is no further step to advance to,
    // because Extra-Curriculars was never inserted into a Private-grade
    // student's wizard.
    await expect(studentsPage.wizardModal.locator('#nextBtn')).toBeHidden();
    await expect(studentsPage.wizardModal.locator('#saveBtn')).toBeVisible();
    await expect(studentsPage.wizardModal.locator('#tabExtraCurriculars')).toBeHidden();

    await studentsPage.saveStudent();
    await expect(studentsPage.row(surname)).toBeVisible();

    // Reopening in edit mode: Student, Siblings, Guardians, Courses — Courses
    // is the last tab, and no Extra-Curriculars tab is offered.
    await studentsPage.openCoursesTab(surname);
    await expect(studentsPage.wizardModal.locator('#tabStudent')).toBeVisible();
    await expect(studentsPage.wizardModal.locator('#tabSiblings')).toBeVisible();
    await expect(studentsPage.wizardModal.locator('#tabGuardians')).toBeVisible();
    await expect(studentsPage.wizardModal.locator('#tabCourses')).toBeVisible();
    await expect(studentsPage.wizardModal.locator('#tabExtraCurriculars')).toBeHidden();
    await studentsPage.closeWizard();

    // --- S2: the assignment endpoint refuses a Private-grade student directly, independent of the UI ---
    const studentId = await studentIdBySurname(page, surname);
    const token = uniqueToken('10IT11');
    const activity = await seedSeniorActivity(page, `${token} Ineligible Activity`, {
      day: 'Monday',
      startTime: '15:00',
    });

    // Signed in as Admin, calling the endpoint directly — bypassing the
    // wizard entirely, since hiding the step is not the enforcement.
    await loginAsAdmin(page);
    const assignResult = await page.evaluate(
      async ({ studentId, extraCurricularId }) => {
        const response = await fetch(`/api/students/${studentId}/extra-curriculars`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
          },
          body: JSON.stringify({ extraCurricularId }),
        });
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        return { status: response.status, error: body.error };
      },
      { studentId, extraCurricularId: activity.extraCurricularId },
    );

    // A validation refusal, not a 404 — the student and the activity both
    // exist; it is the grade that is refused, not a missing resource. The
    // message is not pinned to an exact string the design does not fix, but
    // it must actually name the rule.
    expect(assignResult.status).toBe(400);
    expect(assignResult.error).toBeTruthy();
    expect(assignResult.error).toMatch(/private/i);

    // Nothing was persisted by the refused call.
    const assignedAfter = await getStudentActivities(page, studentId);
    expect(assignedAfter.map((a) => a.extraCurricularId)).not.toContain(activity.extraCurricularId);
  });
});
