import { test, expect } from '../../fixtures/base';
import { goToWaitingListPage } from '../../fixtures/testUsers';
import { StudentsPage } from '../../pages/students/StudentsPage';
import { seedEnrollmentTarget } from '../../fixtures/enrollment';
import { waitingListEntryExists } from '../../fixtures/db';
import {
  seedWaitingListEntry,
  seedCourseOfType,
  fetchLessonStructureId,
  fetchAnyEnrolmentTarget,
  attemptEnrolFromWaitingList,
  enrollExistingStudent,
  fetchStudentEnrollments,
  attemptUpdateWaitingListStudent,
  attemptRemoveWaitingListStudent,
  fetchStudentById,
} from '../../fixtures/waitingList';

// Enrolling off the list is a Coordinator's; seeding the student it acts on
// needs Teacher (POST /api/students is TeacherPolicy). One session holds both,
// except where a scenario's own subject is the role boundary.
const SEED_AND_ENROL_ROLES = ['Teacher', 'Coordinator'] as const;

/** Today as the date input and the API both spell it, in the browser's own timezone. */
function todayIso(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, '0');
  const day = `${now.getDate()}`.padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

test.describe('The Enrol action opens the enrolment form pre-filled from the entry', { tag: '@272IT15' }, () => {
  test('the form opens carrying the entry lesson, duration and instrument types, today, and no teacher', async ({
    page,
  }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_ENROL_ROLES]);
    const entry = await seedWaitingListEntry(page, {
      occurrenceType: 'DuringSchool',
      lessonType: 'Individual',
      durationType: 'Hour',
      instrumentType: 'Piano',
    });
    await page.reload();

    await waitingListPage.openEnrolModal(waitingListPage.rowFor('During School', entry.lastName));

    await expect(waitingListPage.enrolLessonType()).toHaveValue('Individual');
    await expect(waitingListPage.enrolDurationType()).toHaveValue('Hour');
    await expect(waitingListPage.enrolInstrumentType()).toHaveValue('Piano');
    await expect(waitingListPage.enrolDate()).toHaveValue(todayIso());

    // Not merely "some teacher" — the unselected placeholder, which is what
    // makes the teacher the one value the entry never implied.
    await expect(waitingListPage.enrolTeacher()).toHaveValue('');

    await expect(waitingListPage.enrolNotice()).toHaveText(
      `${entry.firstName} ${entry.lastName} will be removed from the waiting list once enrolled.`,
    );
  });

  test('the pre-fill follows the entry rather than a fixed default', async ({ page }) => {
    // Every value is the opposite of the scenario above's, so a hard-coded
    // default cannot satisfy both.
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_ENROL_ROLES]);
    const entry = await seedWaitingListEntry(page, {
      occurrenceType: 'AfterSchool',
      lessonType: 'Group',
      durationType: 'HalfHour',
      instrumentType: 'Guitar',
    });
    await page.reload();

    await waitingListPage.openEnrolModal(waitingListPage.rowFor('After School', entry.lastName));

    await expect(waitingListPage.enrolLessonType()).toHaveValue('Group');
    await expect(waitingListPage.enrolDurationType()).toHaveValue('HalfHour');
    await expect(waitingListPage.enrolInstrumentType()).toHaveValue('Guitar');
    await expect(waitingListPage.enrolDate()).toHaveValue(todayIso());
    await expect(waitingListPage.enrolTeacher()).toHaveValue('');
  });
});

test.describe('A confirmed enrolment takes the row off the list', { tag: '@272IT16' }, () => {
  test('the entry is consumed, a banner names the student, and they appear on the Students screen', async ({
    page,
  }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_ENROL_ROLES]);
    const target = await seedEnrollmentTarget(page);
    const entry = await seedWaitingListEntry(page, {
      occurrenceType: 'DuringSchool',
      lessonType: 'Individual',
      durationType: 'Hour',
      instrumentType: 'Piano',
    });
    // A course on the entry's own structure, so the picker has something to
    // offer under the occurrence type the student waited under.
    const courseId = await seedCourseOfType(page, entry.lessonStructureId, 'G2Recorder');
    await page.reload();

    await waitingListPage.openEnrolModal(waitingListPage.rowFor('During School', entry.lastName));
    await waitingListPage.enrolCourse().selectOption(courseId);
    await waitingListPage.chooseEnrolTeacher(target.teacherName);
    await waitingListPage.confirmEnrol();

    await expect(waitingListPage.enrolModal).toBeHidden();
    await expect(waitingListPage.successBanner).toHaveText(
      `${entry.firstName} ${entry.lastName} was enrolled and removed from the waiting list.`,
    );
    await expect(waitingListPage.rowFor('During School', entry.lastName)).toHaveCount(0);

    await page.reload();
    await expect(waitingListPage.rowFor('During School', entry.lastName)).toHaveCount(0);

    // The listing hides an enrolled student on its own, so its silence proves
    // nothing about the row. The table itself is what says the entry is gone.
    expect(await waitingListEntryExists(entry.waitingListEntryId)).toBe(false);

    const enrollments = await fetchStudentEnrollments(page, entry.studentId);
    expect(enrollments).toHaveLength(1);
    expect(`${enrollments[0].teacherFirstName} ${enrollments[0].teacherSurname}`).toBe(target.teacherName);

    const studentsPage = new StudentsPage(page);
    await studentsPage.gotoStudents();
    await studentsPage.filterByName(entry.lastName);
    await expect(studentsPage.row(entry.lastName)).toBeVisible();
  });

  test('an enrolment that cannot be submitted leaves the entry exactly where it was', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_ENROL_ROLES]);
    await seedEnrollmentTarget(page);
    const entry = await seedWaitingListEntry(page, {
      occurrenceType: 'DuringSchool',
      lessonType: 'Individual',
      durationType: 'Hour',
      instrumentType: 'Piano',
    });
    // Present so that the missing teacher is the only thing left to refuse on.
    const courseId = await seedCourseOfType(page, entry.lessonStructureId, 'G2Recorder');
    await page.reload();

    await waitingListPage.openEnrolModal(waitingListPage.rowFor('During School', entry.lastName));
    await waitingListPage.enrolCourse().selectOption(courseId);
    await expect(waitingListPage.enrolTeacher()).toHaveValue('');
    await waitingListPage.confirmEnrol();

    await expect(waitingListPage.enrolModal).toBeVisible();
    await expect(waitingListPage.successBanner).toBeHidden();
    expect(await fetchStudentEnrollments(page, entry.studentId)).toHaveLength(0);
    expect(await waitingListEntryExists(entry.waitingListEntryId)).toBe(true);

    await page.reload();
    await expect(waitingListPage.rowFor('During School', entry.lastName)).toBeVisible();
  });
});

test.describe('Cancelling the enrolment form submits nothing', { tag: '@272IT17' }, () => {
  test('real, submittable input is discarded and the row keeps its own values', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_ENROL_ROLES]);
    const target = await seedEnrollmentTarget(page);
    const entry = await seedWaitingListEntry(page, {
      occurrenceType: 'DuringSchool',
      lessonType: 'Individual',
      durationType: 'Hour',
      instrumentType: 'Piano',
    });
    await seedCourseOfType(page, entry.lessonStructureId, 'G2Recorder');
    await page.reload();

    await waitingListPage.openEnrolModal(waitingListPage.rowFor('During School', entry.lastName));

    // Cancelling has to discard something a confirmation would have accepted,
    // not an untouched form.
    await waitingListPage.enrolLessonType().selectOption('Group');
    await waitingListPage.enrolDurationType().selectOption('HalfHour');
    await waitingListPage.enrolInstrumentType().selectOption('Guitar');
    await waitingListPage.chooseEnrolTeacher(target.teacherName);
    await waitingListPage.cancelEnrol();

    await expect(waitingListPage.enrolModal).toBeHidden();
    await expect(waitingListPage.successBanner).toBeHidden();
    expect(await fetchStudentEnrollments(page, entry.studentId)).toHaveLength(0);
    expect(await waitingListEntryExists(entry.waitingListEntryId)).toBe(true);

    await page.reload();
    const row = waitingListPage.rowFor('During School', entry.lastName);
    await expect(row).toBeVisible();
    await expect(waitingListPage.meta(row)).toContainText('Individual');
    await expect(waitingListPage.meta(row)).toContainText('Hour');
    await expect(waitingListPage.meta(row)).toContainText('Piano');
  });
});

test.describe('An enrolled student is not shown on the Waiting List', { tag: '@272IT19' }, () => {
  test('a student enrolled off the list is gone from both lists and from the table', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_ENROL_ROLES]);
    const target = await seedEnrollmentTarget(page);
    const entry = await seedWaitingListEntry(page, {
      occurrenceType: 'DuringSchool',
      lessonType: 'Individual',
      durationType: 'Hour',
      instrumentType: 'Piano',
    });
    const courseId = await seedCourseOfType(page, entry.lessonStructureId, 'G2Recorder');
    await page.reload();

    await waitingListPage.openEnrolModal(waitingListPage.rowFor('During School', entry.lastName));
    await waitingListPage.enrolCourse().selectOption(courseId);
    await waitingListPage.chooseEnrolTeacher(target.teacherName);
    await waitingListPage.confirmEnrol();
    await expect(waitingListPage.enrolModal).toBeHidden();

    // Away and back, so the page is read fresh rather than from what the
    // confirmation left behind.
    const studentsPage = new StudentsPage(page);
    await studentsPage.gotoStudents();
    await waitingListPage.gotoWaitingList();

    await expect(waitingListPage.rowFor('During School', entry.lastName)).toHaveCount(0);
    await expect(waitingListPage.rowFor('After School', entry.lastName)).toHaveCount(0);

    // Both halves are required: the listing excludes enrolled students on its
    // own, so it would stay silent even if the entry had never been consumed.
    expect(await waitingListEntryExists(entry.waitingListEntryId)).toBe(false);
  });

  test('an entry that survives an enrolment is still in the table, and is no longer writable', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_ENROL_ROLES]);
    const target = await seedEnrollmentTarget(page);
    const entry = await seedWaitingListEntry(page, {
      occurrenceType: 'DuringSchool',
      lessonType: 'Individual',
      durationType: 'Hour',
      instrumentType: 'Piano',
    });
    // Enrolled through the roster's own path, which knows nothing of the entry
    // and so leaves it behind — the both-states record the listing hides.
    await enrollExistingStudent(page, entry.studentId, target);
    await page.reload();

    await expect(waitingListPage.rowFor('During School', entry.lastName)).toHaveCount(0);
    await expect(waitingListPage.rowFor('After School', entry.lastName)).toHaveCount(0);

    // The control that gives the consumption assertion above its meaning: the
    // listing is silent here too, and the row is still there.
    expect(await waitingListEntryExists(entry.waitingListEntryId)).toBe(true);

    // A student holding an entry and an enrolment is not a waiting-list
    // student, so neither waiting-list write path may resolve them — and their
    // record, which those paths would rewrite or delete, survives both.
    expect(await attemptUpdateWaitingListStudent(page, entry.studentId, 'Rewritten', entry.lastName)).toBe(404);
    expect(await attemptRemoveWaitingListStudent(page, entry.studentId)).toBe(404);

    const student = await fetchStudentById(page, entry.studentId);
    expect(student.status).toBe(200);
    expect(student.firstName).toBe(entry.firstName);
    expect(student.lastName).toBe(entry.lastName);
  });
});

test.describe('A Teacher cannot enrol a student off the waiting list', { tag: '@272IT31' }, () => {
  test('the row offers no Enrol action and a direct attempt is refused', async ({ page, browser }) => {
    // The course and teacher the attempt names have to exist for the refusal to
    // be about the caller's role rather than about a dangling reference, and
    // creating either is a Coordinator's. Seeded from a separate session that
    // never touches the one under test.
    const coordinatorContext = await browser.newContext();
    const coordinatorPage = await coordinatorContext.newPage();
    await goToWaitingListPage(coordinatorPage, ['Coordinator']);
    await seedEnrollmentTarget(coordinatorPage);
    await coordinatorContext.close();

    const waitingListPage = await goToWaitingListPage(page, ['Teacher']);
    const entry = await seedWaitingListEntry(page, {
      occurrenceType: 'DuringSchool',
      lessonType: 'Individual',
      durationType: 'Hour',
      instrumentType: 'Piano',
    });
    await page.reload();

    const row = waitingListPage.rowFor('During School', entry.lastName);
    await expect(row).toBeVisible();
    // No control to press, which is why the attempt below is a direct request.
    await expect(waitingListPage.enrolButton(row)).toHaveCount(0);

    const named = await fetchAnyEnrolmentTarget(page);
    expect(await attemptEnrolFromWaitingList(page, entry.studentId, named)).toBe(403);

    expect(await waitingListEntryExists(entry.waitingListEntryId)).toBe(true);
    expect(await fetchStudentEnrollments(page, entry.studentId)).toHaveLength(0);

    await page.reload();
    await expect(waitingListPage.rowFor('During School', entry.lastName)).toBeVisible();
  });
});

test.describe('The occurrence type is fixed at the value the student waited under', { tag: '@272IT36' }, () => {
  test('it reads During School, is annotated as locked, and offers no control at all', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_ENROL_ROLES]);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    await page.reload();

    await waitingListPage.openEnrolModal(waitingListPage.rowFor('During School', entry.lastName));

    await expect(waitingListPage.enrolOccurrenceType()).toHaveText('During School');
    await expect(waitingListPage.enrolOccurrenceTypeAnnotation()).toHaveText('Locked at waitlist');

    // A disabled select reads as fixed but is not one; nothing in the field
    // may be typed in, picked from or pressed.
    await expect(waitingListPage.enrolOccurrenceTypeControls()).toHaveCount(0);

    // The other five fields are changeable, so the absence above is specific
    // to the occurrence type rather than a modal that rendered no controls.
    await expect(waitingListPage.enrolLessonType()).toBeEnabled();
    await expect(waitingListPage.enrolDurationType()).toBeEnabled();
    await expect(waitingListPage.enrolInstrumentType()).toBeEnabled();
    await expect(waitingListPage.enrolTeacher()).toBeEnabled();
    await expect(waitingListPage.enrolDate()).toBeEditable();
  });

  test('the fixed value is the entry own, reading After School for an After School row', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_ENROL_ROLES]);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'AfterSchool' });
    await page.reload();

    await waitingListPage.openEnrolModal(waitingListPage.rowFor('After School', entry.lastName));

    await expect(waitingListPage.enrolOccurrenceType()).toHaveText('After School');
    await expect(waitingListPage.enrolOccurrenceTypeAnnotation()).toHaveText('Locked at waitlist');
    await expect(waitingListPage.enrolOccurrenceTypeControls()).toHaveCount(0);
  });
});

test.describe('Everything but the occurrence type is the Coordinator to change', { tag: '@272IT37' }, () => {
  test('the changed values are accepted and the enrolment keeps the waited-under occurrence type', async ({
    page,
  }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_ENROL_ROLES]);
    const target = await seedEnrollmentTarget(page);
    const entry = await seedWaitingListEntry(page, {
      occurrenceType: 'DuringSchool',
      lessonType: 'Individual',
      durationType: 'Hour',
      instrumentType: 'Piano',
    });

    // A course on the combination the Coordinator changes to, under the same
    // occurrence type. Instrument, so the enrolment records the instrument
    // type this scenario changes and the step that type calls for.
    const changedStructureId = await fetchLessonStructureId(page, {
      occurrenceType: 'DuringSchool',
      lessonType: 'Group',
      durationType: 'HalfHour',
    });
    const courseId = await seedCourseOfType(page, changedStructureId, 'Instrument');
    await page.reload();

    const enrolledDate = '2026-02-10';
    await waitingListPage.openEnrolModal(waitingListPage.rowFor('During School', entry.lastName));
    await waitingListPage.enrolLessonType().selectOption('Group');
    await waitingListPage.enrolDurationType().selectOption('HalfHour');
    await waitingListPage.enrolCourse().selectOption(courseId);
    await waitingListPage.enrolInstrumentType().selectOption('Guitar');
    await waitingListPage.enrolStep().selectOption('Step2A');
    await waitingListPage.enrolDate().fill(enrolledDate);
    await waitingListPage.chooseEnrolTeacher(target.teacherName);
    await waitingListPage.confirmEnrol();

    await expect(waitingListPage.enrolModal).toBeHidden();
    await expect(waitingListPage.successBanner).toContainText(`${entry.firstName} ${entry.lastName}`);
    await expect(waitingListPage.rowFor('During School', entry.lastName)).toHaveCount(0);
    expect(await waitingListEntryExists(entry.waitingListEntryId)).toBe(false);

    const enrollments = await fetchStudentEnrollments(page, entry.studentId);
    expect(enrollments).toHaveLength(1);
    expect(`${enrollments[0].teacherFirstName} ${enrollments[0].teacherSurname}`).toBe(target.teacherName);
    expect(enrollments[0].instrumentType).toBe('Guitar');
    expect(enrollments[0].enrolledDate).toBe(enrolledDate);
    expect(enrollments[0].lessonType).toBe('Group');
    expect(enrollments[0].durationType).toBe('HalfHour');

    // The load-bearing half: the changed values travelled, and the occurrence
    // type the student waited under did not.
    expect(enrollments[0].occurrenceType).toBe('DuringSchool');
  });
});

test.describe('An enrolment naming a different occurrence type is refused', { tag: '@272IT38' }, () => {
  test('a course delivered under the other occurrence type is refused and nothing is created', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_ENROL_ROLES]);
    const target = await seedEnrollmentTarget(page);
    const entry = await seedWaitingListEntry(page, {
      occurrenceType: 'DuringSchool',
      lessonType: 'Individual',
      durationType: 'Hour',
      instrumentType: 'Piano',
    });

    // Naming the other occurrence type means naming a course that carries it,
    // which is the only field the request has to express it through — and the
    // filtered picker never offers one, so there is no control to press.
    const otherStructureId = await fetchLessonStructureId(page, {
      occurrenceType: 'AfterSchool',
      lessonType: 'Individual',
      durationType: 'Hour',
    });
    const otherCourseId = await seedCourseOfType(page, otherStructureId, 'G2Recorder');
    await page.reload();

    const status = await attemptEnrolFromWaitingList(page, entry.studentId, {
      courseId: otherCourseId,
      teacherId: target.teacherId,
    });
    expect(status).toBe(400);

    // Neither the requested After School enrolment nor a During School one
    // substituted silently.
    expect(await fetchStudentEnrollments(page, entry.studentId)).toHaveLength(0);
    expect(await waitingListEntryExists(entry.waitingListEntryId)).toBe(true);

    await page.reload();
    await expect(waitingListPage.rowFor('During School', entry.lastName)).toBeVisible();
  });

  test('the same submission naming the entry own occurrence type is accepted', async ({ page }) => {
    // Without this, the refusal above would pass against an endpoint that
    // refuses every submission.
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_ENROL_ROLES]);
    const target = await seedEnrollmentTarget(page);
    const entry = await seedWaitingListEntry(page, {
      occurrenceType: 'DuringSchool',
      lessonType: 'Individual',
      durationType: 'Hour',
      instrumentType: 'Piano',
    });
    const courseId = await seedCourseOfType(page, entry.lessonStructureId, 'G2Recorder');
    await page.reload();

    const status = await attemptEnrolFromWaitingList(page, entry.studentId, {
      courseId,
      teacherId: target.teacherId,
    });
    expect(status).toBe(201);

    const enrollments = await fetchStudentEnrollments(page, entry.studentId);
    expect(enrollments).toHaveLength(1);
    expect(enrollments[0].occurrenceType).toBe('DuringSchool');
    expect(await waitingListEntryExists(entry.waitingListEntryId)).toBe(false);

    await page.reload();
    await expect(waitingListPage.rowFor('During School', entry.lastName)).toHaveCount(0);
  });
});
