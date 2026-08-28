import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { loginAsRoles } from '../../fixtures/testUsers';
import { seedEnrollmentTarget, studentIdBySurname } from '../../fixtures/enrollment';
import { StudentsPage } from '../../pages/students/StudentsPage';

/**
 * A student has no natural key, so a run is told apart by the surname it gives
 * its students: the clock in milliseconds plus the worker index, so two workers
 * would have to create inside the same millisecond to collide.
 */
function uniqueSurname(label: string): string {
  return `${label}${Date.now()}W${test.info().workerIndex}`;
}

const studentDefaults = {
  dateOfBirth: '2014-05-12',
  grade: 'Grade4' as const,
  class: 'A1' as const,
  phase: 'Junior' as const,
  language: 'English' as const,
};

/**
 * Signs in, seeds a course and teacher of each kind this spec needs, and opens
 * Student Management. Seeding runs before the screen is opened because the
 * enroll form reads the catalogue and roster once on mount.
 */
/**
 * Signs in with both Teacher and Coordinator, seeds a course and teacher of
 * each kind this spec needs, and opens Student Management. Seeding runs
 * before the screen is opened because the enroll form reads the catalogue and
 * roster once on mount. Both roles are needed on the one signed-in account:
 * Coordinator to create teachers and courses, Teacher to open and maintain
 * Student Management itself.
 */
async function openStudentsWithCourses(page: Page) {
  await loginAsRoles(page, ['Teacher', 'Coordinator']);
  const target = await seedEnrollmentTarget(page);
  const instrument = await seedInstrumentCourse(page);
  const theory = await seedTheoryCourse(page);

  const studentsPage = new StudentsPage(page);
  await studentsPage.gotoStudents();
  return { studentsPage, target, instrument, theory };
}

async function seedInstrumentCourse(page: Page): Promise<string> {
  await seedCourse(page, 'Instrument', 'Individual', 'HalfHour', 'DuringSchool');
  return 'Instrument · Individual · Half Hour · During School';
}

async function seedTheoryCourse(page: Page): Promise<string> {
  await seedCourse(page, 'Theory', 'Group', 'Hour', 'AfterSchool');
  return 'Theory · Group · Hour · After School';
}

/**
 * Issued from inside the page so the request carries the signed-in caller's
 * bearer token. A course of the same type and structure may already exist from
 * an earlier run — that is fine, since the enroll form offers whichever one it
 * finds under that label.
 */
async function seedCourse(
  page: Page,
  courseType: string,
  lessonType: string,
  durationType: string,
  occurrenceType: string,
): Promise<void> {
  const status = await page.evaluate(
    async ({ courseType, lessonType, durationType, occurrenceType }) => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
      };
      const structures = (await (await fetch('/api/lesson-structures', { headers })).json()) as {
        lessonStructureId: string;
        lessonType: string;
        durationType: string;
        occurrenceType: string;
      }[];
      const structure = structures.find(
        (s) => s.lessonType === lessonType && s.durationType === durationType && s.occurrenceType === occurrenceType,
      )!;
      const response = await fetch('/api/courses', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          courseType,
          cost: `${Date.now() % 100_000_000}.00`,
          lessonStructureId: structure.lessonStructureId,
        }),
      });
      return response.status;
    },
    { courseType, lessonType, durationType, occurrenceType },
  );

  expect(status).toBe(201);
}

test.describe('Enrollment — a student can hold several enrollments at once', { tag: ['@9IT1'] }, () => {
  test('enrolls a student in a second course alongside the first', async ({ page }) => {
    const { studentsPage, target, instrument } = await openStudentsWithCourses(page);
    const surname = uniqueSurname('Multi');

    // The first enrollment names its course, because leaving the choice to the
    // form would take whichever course happens to be offered first — any run's
    // leftovers included — and the assertion below is about this one.
    await studentsPage.createStudent(
      { firstName: 'Amara', lastName: surname, ...studentDefaults },
      { courseLabel: target.courseLabel, teacherName: target.teacherName },
    );
    await expect(studentsPage.row(surname)).toBeVisible();

    await studentsPage.openCoursesTab(surname);
    await expect(studentsPage.enrollmentListRow(target.courseLabel)).toBeVisible();

    await studentsPage.enrollInCourse({
      courseLabel: instrument,
      teacherName: target.teacherName,
      instrumentLabel: 'Piano',
      stepLabel: '2A',
    });

    await expect(studentsPage.enrollmentListRow(instrument)).toBeVisible();
    await expect(studentsPage.enrollmentListRow(target.courseLabel)).toBeVisible();
  });
});

test.describe('Enrollment — an enrollment assigns exactly one teacher', { tag: ['@9IT2'] }, () => {
  test('records the assigned teacher against the enrollment and shows it on the roster', async ({ page }) => {
    const { studentsPage, target } = await openStudentsWithCourses(page);
    const surname = uniqueSurname('Teacher');

    await studentsPage.createStudent(
      { firstName: 'Thabo', lastName: surname, ...studentDefaults },
      { courseLabel: target.courseLabel, teacherName: target.teacherName },
    );
    await expect(studentsPage.row(surname)).toBeVisible();

    await studentsPage.openCoursesTab(surname);
    const row = studentsPage.enrollmentListRow(target.courseLabel);
    await expect(row).toBeVisible();
    await expect(row).toContainText(target.teacherName);

    // The enroll form offers exactly one teacher select, so there is no way to
    // assign a second.
    await studentsPage.wizardModal.locator('#coursesStep').locator('#enrollBtn').click();
    await expect(
      studentsPage.wizardModal.locator('#coursesStep').locator('#enrollmentForm').locator('#teacher'),
    ).toHaveCount(1);
  });
});

test.describe('Enrollment — instrument and step are per enrollment', { tag: ['@9IT3'] }, () => {
  test('keeps each enrollment own instrument and step, and records neither where the course type does not', async ({
    page,
  }) => {
    const { studentsPage, target, instrument, theory } = await openStudentsWithCourses(page);
    const surname = uniqueSurname('Instrument');

    await studentsPage.createStudent(
      { firstName: 'Lerato', lastName: surname, ...studentDefaults },
      {
        courseLabel: instrument,
        teacherName: target.teacherName,
        instrumentLabel: 'Piano',
        stepLabel: '2A',
      },
    );
    await expect(studentsPage.row(surname)).toBeVisible();

    await studentsPage.openCoursesTab(surname);
    await studentsPage.enrollInCourse({
      courseLabel: theory,
      teacherName: target.teacherName,
      stepLabel: '3B',
    });
    await expect(studentsPage.enrollmentListRow(theory)).toBeVisible();

    await studentsPage.enrollInCourse({
      courseLabel: target.courseLabel,
      teacherName: target.teacherName,
    });
    await expect(studentsPage.enrollmentListRow(target.courseLabel)).toBeVisible();

    // Each row carries its own instrument and step, and an em dash stands in
    // wherever the course type records nothing.
    const instrumentCells = studentsPage.enrollmentListRow(instrument).locator('td');
    await expect(instrumentCells.nth(2)).toHaveText('Piano');
    await expect(instrumentCells.nth(3)).toHaveText('2A');

    const theoryCells = studentsPage.enrollmentListRow(theory).locator('td');
    await expect(theoryCells.nth(2)).toHaveText('—');
    await expect(theoryCells.nth(3)).toHaveText('3B');

    const recorderCells = studentsPage.enrollmentListRow(target.courseLabel).locator('td');
    await expect(recorderCells.nth(2)).toHaveText('—');
    await expect(recorderCells.nth(3)).toHaveText('—');
  });
});

test.describe('Enrollment — the enrolled date is recorded', { tag: ['@9IT4'] }, () => {
  test('persists the enrolled date entered on the form and shows it on the expanded row', async ({ page }) => {
    const { studentsPage, target } = await openStudentsWithCourses(page);
    const surname = uniqueSurname('Enrolled');

    await studentsPage.createStudent(
      { firstName: 'Naledi', lastName: surname, ...studentDefaults },
      { courseLabel: target.courseLabel, teacherName: target.teacherName, enrolledDate: '2026-03-11' },
    );
    await expect(studentsPage.row(surname)).toBeVisible();

    await studentsPage.toggleRowExpanded(surname);
    await expect(studentsPage.visibleCoursesSummary()).toContainText('Enrolled 2026-03-11');

    // Still the date it was enrolled on after a reload, read back from the
    // enrollment rather than defaulted again.
    await studentsPage.openCoursesTab(surname);
    await expect(studentsPage.enrollmentListRow(target.courseLabel)).toContainText('2026-03-11');
  });
});

test.describe('Enrollment — withdrawal removes the enrollment record', { tag: ['@9IT5'] }, () => {
  test('drops the withdrawn enrollment and leaves the student others in place', async ({ page }) => {
    const { studentsPage, target, instrument } = await openStudentsWithCourses(page);
    const surname = uniqueSurname('Withdraw');

    await studentsPage.createStudent(
      { firstName: 'Kagiso', lastName: surname, ...studentDefaults },
      { courseLabel: target.courseLabel, teacherName: target.teacherName },
    );
    await expect(studentsPage.row(surname)).toBeVisible();

    // A second enrollment, because a student must remain enrolled in at least
    // one course and their last one cannot be withdrawn.
    await studentsPage.openCoursesTab(surname);
    await studentsPage.enrollInCourse({
      courseLabel: instrument,
      teacherName: target.teacherName,
      instrumentLabel: 'Piano',
      stepLabel: '2A',
    });
    await expect(studentsPage.enrollmentListRow(instrument)).toBeVisible();

    await studentsPage.withdrawEnrollment(instrument);

    await expect(studentsPage.enrollmentListRow(instrument)).toHaveCount(0);
    await expect(studentsPage.enrollmentListRow(target.courseLabel)).toBeVisible();

    // Gone from the record itself, not merely from the rendered list.
    await studentsPage.closeWizard();
    await studentsPage.openCoursesTab(surname);
    await expect(studentsPage.enrollmentListRow(instrument)).toHaveCount(0);
  });

});

test.describe('Enrollment — a student must remain enrolled in at least one course', { tag: ['@9IT8'] }, () => {
  test('refuses to withdraw the student last remaining enrollment', async ({ page }) => {
    const { studentsPage, target } = await openStudentsWithCourses(page);
    const surname = uniqueSurname('LastOne');

    await studentsPage.createStudent(
      { firstName: 'Naledi', lastName: surname, ...studentDefaults },
      { courseLabel: target.courseLabel, teacherName: target.teacherName },
    );
    await expect(studentsPage.row(surname)).toBeVisible();

    await studentsPage.openCoursesTab(surname);
    await studentsPage.withdrawEnrollment(target.courseLabel, false);

    await expect(studentsPage.withdrawEnrollmentModal).not.toHaveAttribute('open', '');
    await expect(studentsPage.coursesStepMessage()).toContainText(
      'A student must remain enrolled in at least one course.',
    );
    await expect(studentsPage.enrollmentListRow(target.courseLabel)).toBeVisible();
  });
});

test.describe('Enrollment — an existing enrollment can be corrected', { tag: ['@9IT9'] }, () => {
  test('changes the assigned teacher, instrument and step on the enrollment row', async ({ page }) => {
    await loginAsRoles(page, ['Teacher', 'Coordinator']);
    const target = await seedEnrollmentTarget(page);
    // A second seeded target only for its teacher, so the correction has someone
    // to reassign the enrollment to.
    const replacement = await seedEnrollmentTarget(page);
    const instrument = await seedInstrumentCourse(page);

    const studentsPage = new StudentsPage(page);
    await studentsPage.gotoStudents();
    const surname = uniqueSurname('Correct');

    await studentsPage.createStudent(
      { firstName: 'Thabo', lastName: surname, ...studentDefaults },
      { courseLabel: instrument, teacherName: target.teacherName, instrumentLabel: 'Piano', stepLabel: '2A' },
    );
    await expect(studentsPage.row(surname)).toBeVisible();

    await studentsPage.openCoursesTab(surname);
    await studentsPage.editEnrollment(instrument, {
      teacherName: replacement.teacherName,
      instrumentLabel: 'Guitar',
      stepLabel: '3B',
    });

    const cells = studentsPage.enrollmentListRow(instrument).locator('td');
    await expect(cells.nth(1)).toHaveText(replacement.teacherName);
    await expect(cells.nth(2)).toHaveText('Guitar');
    await expect(cells.nth(3)).toHaveText('3B');

    // Corrected on the record itself, not merely in the rendered row.
    await studentsPage.closeWizard();
    await studentsPage.openCoursesTab(surname);
    const reread = studentsPage.enrollmentListRow(instrument).locator('td');
    await expect(reread.nth(1)).toHaveText(replacement.teacherName);
    await expect(reread.nth(2)).toHaveText('Guitar');
    await expect(reread.nth(3)).toHaveText('3B');
  });
});

test.describe('Enrollment — the endpoints require authentication', { tag: ['@9IT6'] }, () => {
  test('refuses an anonymous read and an anonymous enrollment', async ({ page }) => {
    const { studentsPage, target } = await openStudentsWithCourses(page);
    const surname = uniqueSurname('Auth');

    await studentsPage.createStudent({ firstName: 'Sipho', lastName: surname, ...studentDefaults });
    await expect(studentsPage.row(surname)).toBeVisible();

    const studentId = await studentIdBySurname(page, surname);

    const listResponse = await page.request.get(`/api/students/${studentId}/courses`);
    const enrollResponse = await page.request.post(`/api/students/${studentId}/courses`, {
      data: {
        courseId: target.courseId,
        teacherId: target.teacherId,
        instrumentType: null,
        stepType: null,
        enrolledDate: '2026-03-11',
      },
    });

    // The enrollment these two name need not exist: an anonymous caller is
    // refused before anything is looked up, which is the point being asserted.
    const enrollmentPath = `/api/students/${studentId}/courses/${crypto.randomUUID()}`;
    const updateResponse = await page.request.put(enrollmentPath, {
      data: { teacherId: target.teacherId, instrumentType: null, stepType: null },
    });
    const withdrawResponse = await page.request.delete(enrollmentPath);

    expect(listResponse.status()).toBe(401);
    expect(enrollResponse.status()).toBe(401);
    expect(updateResponse.status()).toBe(401);
    expect(withdrawResponse.status()).toBe(401);
  });
});
