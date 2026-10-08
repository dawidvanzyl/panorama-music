import { test, expect } from '../../fixtures/base';
import {
  expectRoster,
  expectTeacherFilterReads,
  seedListedTeacher,
  signInWithRecorder,
} from '../../fixtures/teacherFilter';
import { openStudents, seedStudent, uniqueToken } from '../../fixtures/studentPrint';
import { deactivateTeacher, waitForTeacherInactive } from '../../fixtures/teachers';

const ALL_TEACHERS = 'All Teachers';

test.describe('Students — the Teacher filter is offered after Class', { tag: ['@340IT1'] }, () => {
  test('S1 the Teacher filter follows Class, defaults to All Teachers and lists the active teachers', async ({ page }) => {
    const token = uniqueToken();
    await signInWithRecorder(page);
    await seedListedTeacher(page, 'Anna', `Venter${token}`);
    await seedListedTeacher(page, 'Ravi', `Naidoo${token}`);
    await seedListedTeacher(page, 'Lerato', `Smit${token}`);

    const studentsPage = await openStudents(page);

    expect(await studentsPage.filterControlOrder()).toEqual(['name', 'grade', 'phase', 'class', 'teacher']);

    const classBox = await studentsPage.filterClassSelect.boundingBox();
    const teacherBox = await studentsPage.filterTeacherSelect.boundingBox();
    expect(classBox).not.toBeNull();
    expect(teacherBox).not.toBeNull();
    const onLaterLine = teacherBox!.y >= classBox!.y + classBox!.height;
    const sameLineToTheRight = teacherBox!.x >= classBox!.x + classBox!.width;
    expect(onLaterLine || sameLineToTheRight).toBe(true);

    await expectTeacherFilterReads(studentsPage, ALL_TEACHERS);
    expect(await studentsPage.selectedOptionText(studentsPage.filterGradeSelect)).toBe('All Grades');
    expect(await studentsPage.selectedOptionText(studentsPage.filterPhaseSelect)).toBe('All Phases');
    expect(await studentsPage.selectedOptionText(studentsPage.filterClassSelect)).toBe('All Classes');

    await expect
      .poll(async () => (await studentsPage.teacherOptionTexts()).filter((text) => text.endsWith(token)))
      .toEqual([`Ravi Naidoo${token}`, `Lerato Smit${token}`, `Anna Venter${token}`]);

    const options = await studentsPage.teacherOptionTexts();
    expect(options[0]).toBe(ALL_TEACHERS);
    expect(options.filter((text) => text === ALL_TEACHERS)).toHaveLength(1);
  });

  test('S2 a teacher added since the screen opened is offered once it is reopened', async ({ page }) => {
    const token = uniqueToken();
    await signInWithRecorder(page);
    await seedListedTeacher(page, 'Ella', `Early${token}`);

    const first = await openStudents(page);
    await expect
      .poll(async () => (await first.teacherOptionTexts()).filter((text) => text.endsWith(token)))
      .toEqual([`Ella Early${token}`]);

    await seedListedTeacher(page, 'Lena', `Late${token}`);
    const reopened = await openStudents(page);

    await expect
      .poll(async () => (await reopened.teacherOptionTexts()).filter((text) => text.endsWith(token)))
      .toEqual([`Ella Early${token}`, `Lena Late${token}`]);
    const options = await reopened.teacherOptionTexts();
    expect(options[0]).toBe(ALL_TEACHERS);
  });
});

test.describe('Students — a stood-down teacher is not offered', { tag: ['@340IT2'] }, () => {
  test('S1 a stood-down teacher is not offered', async ({ page }) => {
    const token = uniqueToken();
    await signInWithRecorder(page, ['BankingCoordinator']);
    await seedListedTeacher(page, 'Kim', `Keep${token}`);
    const gone = await seedListedTeacher(page, 'Gale', `Gone${token}`);
    await deactivateTeacher(page, gone.teacherId);
    await waitForTeacherInactive(page, gone.teacherId);

    const studentsPage = await openStudents(page);

    await expect
      .poll(async () => (await studentsPage.teacherOptionTexts()).includes(`Kim Keep${token}`))
      .toBe(true);
    const options = await studentsPage.teacherOptionTexts();
    expect(options.filter((text) => text.includes(`Gone${token}`))).toEqual([]);
    const values = await studentsPage.filterTeacherSelect
      .locator('option')
      .evaluateAll((elements) => elements.map((element) => (element as HTMLOptionElement).value));
    expect(values).not.toContain(gone.teacherId);
  });

  test('S2 a student whose only teacher was stood down is found only under All Teachers', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page, ['BankingCoordinator']);
    const keep = await seedListedTeacher(page, 'Kim', `Keep${token}`);
    const gone = await seedListedTeacher(page, 'Gale', `Gone${token}`);
    await seedStudent(page, target, {
      firstName: 'Ava',
      lastName: token,
      enrolments: [{ courseId: target.courseId, teacherId: gone.teacherId }],
    });
    await seedStudent(page, target, {
      firstName: 'Ben',
      lastName: token,
      enrolments: [{ courseId: target.courseId, teacherId: keep.teacherId }],
    });
    await deactivateTeacher(page, gone.teacherId);
    await waitForTeacherInactive(page, gone.teacherId);

    const studentsPage = await openStudents(page, token);

    await expectRoster(studentsPage, [`Ava ${token}`, `Ben ${token}`]);
    await studentsPage.filterByTeacher(keep.teacherName);
    await expectRoster(studentsPage, [`Ben ${token}`]);
    await studentsPage.filterByTeacher('');
    await expectRoster(studentsPage, [`Ava ${token}`, `Ben ${token}`]);
    expect((await studentsPage.teacherOptionTexts()).filter((text) => text.includes(`Gone${token}`))).toEqual([]);
    await expectTeacherFilterReads(studentsPage, ALL_TEACHERS);
  });
});

