import { test, expect } from '../../fixtures/base';
import {
  expectListed,
  expectNoStudents,
  expectRoster,
  expectTeacherFilterReads,
  INSTRUMENT_COURSE_LABEL,
  listedInstrumentCourse,
  seedListedTeacher,
  seedWorkedExample,
  signInWithRecorder,
} from '../../fixtures/teacherFilter';
import { seedActivityOnlyStudent } from '../../fixtures/enrollment';
import { openStudents, seedListedActivity, seedStudent, uniqueToken } from '../../fixtures/studentPrint';

const ALL_TEACHERS = 'All Teachers';

const studentDefaults = {
  dateOfBirth: '2014-05-12',
  grade: 'Grade4' as const,
  class: 'A1' as const,
  phase: 'Junior' as const,
  language: 'English' as const,
};

test.describe('Students — selecting a teacher narrows the roster', { tag: ['@340IT3'] }, () => {
  test('S1 selecting a teacher lists exactly their students', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const example = await seedWorkedExample(page, target, token);
    const studentsPage = await openStudents(page);

    await studentsPage.filterByTeacher(example.anna.teacherName);

    await expectRoster(studentsPage, [example.thandi, example.pieter, example.sipho]);
    await expect(studentsPage.emptyRosterMessage()).toBeHidden();
    await expectTeacherFilterReads(studentsPage, example.anna.teacherName);
  });

  test('S2 a student with two teachers is listed under each, and only there', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const example = await seedWorkedExample(page, target, token);
    const studentsPage = await openStudents(page);

    await studentsPage.filterByTeacher(example.ravi.teacherName);
    await expectRoster(studentsPage, [example.thandi, example.aisha, example.emma]);

    await studentsPage.filterByTeacher(example.lerato.teacherName);
    await expectRoster(studentsPage, [example.sipho]);
  });

  test('S3 a teacher with no students lists no one', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const idle = await seedListedTeacher(page, 'Ida', `Idle${token}`);
    const busy = await seedListedTeacher(page, 'Bea', `Busy${token}`);
    await seedStudent(page, target, {
      firstName: 'Ava',
      lastName: token,
      enrolments: [{ courseId: target.courseId, teacherId: busy.teacherId }],
    });
    const studentsPage = await openStudents(page, token);
    await expectRoster(studentsPage, [`Ava ${token}`]);

    await studentsPage.filterByTeacher(idle.teacherName);

    await expectNoStudents(studentsPage);
  });

  test('S4 a course staged in the create wizard counts at once', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const fresh = await seedListedTeacher(page, 'Fay', `Fresh${token}`);
    const studentsPage = await openStudents(page, token);

    await studentsPage.createStudent(
      { firstName: 'Nadia', lastName: token, ...studentDefaults },
      { courseLabel: target.courseLabel, teacherName: fresh.teacherName },
    );
    await expectListed(studentsPage, `Nadia ${token}`);

    await studentsPage.filterByTeacher(fresh.teacherName);

    await expectRoster(studentsPage, [`Nadia ${token}`]);
  });

  test('S5 enrolling an existing student and correcting a course teacher count at once', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const first = await seedListedTeacher(page, 'Fia', `First${token}`);
    const second = await seedListedTeacher(page, 'Sam', `Second${token}`);
    const third = await seedListedTeacher(page, 'Tim', `Third${token}`);
    await listedInstrumentCourse(page);
    await seedStudent(page, target, {
      firstName: 'Ava',
      lastName: token,
      enrolments: [{ courseId: target.courseId, teacherId: first.teacherId }],
    });
    const studentsPage = await openStudents(page, token);
    const ava = `Ava ${token}`;
    await expectRoster(studentsPage, [ava]);

    await studentsPage.openCoursesTab(ava);
    await studentsPage.enrollInCourse({
      courseLabel: INSTRUMENT_COURSE_LABEL,
      teacherName: second.teacherName,
      instrumentLabel: 'Piano',
      stepLabel: '3A',
    });
    await expect(studentsPage.enrollmentListRow(INSTRUMENT_COURSE_LABEL)).toBeVisible();
    await studentsPage.closeWizard();
    await studentsPage.filterByTeacher(second.teacherName);
    await expectRoster(studentsPage, [ava]);

    await studentsPage.filterByTeacher('');
    await studentsPage.openCoursesTab(ava);
    await studentsPage.editEnrollment(target.courseLabel, { teacherName: third.teacherName });
    await expect(studentsPage.enrollmentListRow(target.courseLabel).locator('td').nth(1)).toHaveText(
      third.teacherName,
    );
    await studentsPage.closeWizard();

    await studentsPage.filterByTeacher(first.teacherName);
    await expectNoStudents(studentsPage);
    await studentsPage.filterByTeacher(third.teacherName);
    await expectRoster(studentsPage, [ava]);
  });

  test('S6 withdrawing a course drops its teacher at once', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const first = await seedListedTeacher(page, 'Fia', `First${token}`);
    const second = await seedListedTeacher(page, 'Sam', `Second${token}`);
    const piano = await listedInstrumentCourse(page);
    await seedStudent(page, target, {
      firstName: 'Ava',
      lastName: token,
      enrolments: [
        { courseId: target.courseId, teacherId: first.teacherId },
        { courseId: piano, teacherId: second.teacherId, instrumentType: 'Piano', stepType: 'Step3A' },
      ],
    });
    const studentsPage = await openStudents(page, token);
    const ava = `Ava ${token}`;
    await expectRoster(studentsPage, [ava]);

    await studentsPage.openCoursesTab(ava);
    await studentsPage.withdrawEnrollment(INSTRUMENT_COURSE_LABEL);
    await expect(studentsPage.enrollmentListRow(INSTRUMENT_COURSE_LABEL)).toHaveCount(0);
    await studentsPage.closeWizard();

    await studentsPage.filterByTeacher(second.teacherName);
    await expectNoStudents(studentsPage);
    await studentsPage.filterByTeacher(first.teacherName);
    await expectRoster(studentsPage, [ava]);
  });
});

test.describe('Students — All Teachers restores the roster', { tag: ['@340IT4'] }, () => {
  test('S1 All Teachers restores everyone the other filters admit', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const example = await seedWorkedExample(page, target, token);
    const studentsPage = await openStudents(page, token);
    await expectRoster(studentsPage, example.all);

    await studentsPage.filterByTeacher(example.anna.teacherName);
    await expectRoster(studentsPage, [example.thandi, example.pieter, example.sipho]);

    await studentsPage.filterByTeacher('');
    await expectRoster(studentsPage, example.all);
    await expectTeacherFilterReads(studentsPage, ALL_TEACHERS);
  });

  test('S2 with no other filter, the students a teacher hid come back', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const example = await seedWorkedExample(page, target, token);
    const studentsPage = await openStudents(page);

    await studentsPage.filterByTeacher(example.lerato.teacherName);
    await expectRoster(studentsPage, [example.sipho]);

    await studentsPage.filterByTeacher('');
    for (const name of example.all) {
      await expectListed(studentsPage, name);
    }
    await expectTeacherFilterReads(studentsPage, ALL_TEACHERS);
  });
});

test.describe('Students — a student with no course is listed under no teacher', { tag: ['@340IT5'] }, () => {
  test('S1 a graded student holding only an activity is listed under no teacher', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const alpha = await seedListedTeacher(page, 'Alf', `Alpha${token}`);
    const beta = await seedListedTeacher(page, 'Bet', `Beta${token}`);
    await seedStudent(page, target, {
      firstName: 'Ben',
      lastName: token,
      enrolments: [{ courseId: target.courseId, teacherId: alpha.teacherId }],
    });
    const choirId = await seedListedActivity(page, {
      description: `Choir ${token}`,
      phase: 'Junior',
      practiceTimes: [{ day: 'Tuesday', startTime: '14:00' }],
    });
    await seedActivityOnlyStudent(page, choirId, token);
    const studentsPage = await openStudents(page, token);

    await studentsPage.filterByTeacher(alpha.teacherName);
    await expectRoster(studentsPage, [`Ben ${token}`]);

    await studentsPage.filterByTeacher(beta.teacherName);
    await expectNoStudents(studentsPage);

    await studentsPage.filterByTeacher('');
    await expectRoster(studentsPage, [`Ben ${token}`, `Amara ${token}`]);
  });

  test('S2 a Private-grade student holding only an activity is listed under none of the teachers', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const example = await seedWorkedExample(page, target, token);
    const studentsPage = await openStudents(page, token);
    await expectRoster(studentsPage, example.all);

    await studentsPage.filterByTeacher(example.anna.teacherName);
    await expectRoster(studentsPage, [example.thandi, example.pieter, example.sipho]);
    await studentsPage.filterByTeacher(example.ravi.teacherName);
    await expectRoster(studentsPage, [example.thandi, example.aisha, example.emma]);
    await studentsPage.filterByTeacher(example.lerato.teacherName);
    await expectRoster(studentsPage, [example.sipho]);

    await studentsPage.filterByTeacher('');
    await expectRoster(studentsPage, example.all);
  });
});
