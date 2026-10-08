import { test, expect } from '../../fixtures/base';
import {
  expectNoStudents,
  expectRoster,
  expectTeacherFilterReads,
  seedWorkedExample,
  signInWithRecorder,
} from '../../fixtures/teacherFilter';
import { openStudents, uniqueToken } from '../../fixtures/studentPrint';

const ALL_TEACHERS = 'All Teachers';

test.describe('Students — the Teacher filter applies together with the other filters', { tag: ['@340IT6'] }, () => {
  test('S1 Teacher and Grade together', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const example = await seedWorkedExample(page, target, token);
    const studentsPage = await openStudents(page);

    await studentsPage.filterByTeacher(example.anna.teacherName);
    await studentsPage.filterByGrade('Grade5');
    await expectRoster(studentsPage, [example.thandi, example.sipho]);

    await studentsPage.filterByGrade('Grade3');
    await expectRoster(studentsPage, [example.pieter]);
  });

  test('S2 the order the two are chosen in does not matter', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const example = await seedWorkedExample(page, target, token);
    const studentsPage = await openStudents(page);

    await studentsPage.filterByGrade('Grade5');
    await studentsPage.filterByTeacher(example.anna.teacherName);

    await expectRoster(studentsPage, [example.thandi, example.sipho]);
  });

  test('S3 Teacher combines with Name, Phase and Class too', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const example = await seedWorkedExample(page, target, token);
    const studentsPage = await openStudents(page);

    await studentsPage.filterByTeacher(example.ravi.teacherName);
    await studentsPage.filterByPhase('Senior');
    await expectRoster(studentsPage, [example.aisha]);

    await studentsPage.filterByPhase('');
    await studentsPage.filterByTeacher(example.anna.teacherName);
    await studentsPage.filterByClass('E3');
    await expectRoster(studentsPage, [example.sipho]);

    await studentsPage.filterByClass('');
    await studentsPage.filterByName(example.thandi);
    await expectRoster(studentsPage, [example.thandi]);
  });
});

test.describe('Students — Teacher and Grade with no match', { tag: ['@340IT7'] }, () => {
  test('S1 Teacher and Grade with no match', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const example = await seedWorkedExample(page, target, token);
    const studentsPage = await openStudents(page);

    await studentsPage.filterByTeacher(example.lerato.teacherName);
    await studentsPage.filterByGrade('Grade2');

    await expectNoStudents(studentsPage);
  });

  test('S2 the empty state clears when a filter admits someone again', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const example = await seedWorkedExample(page, target, token);
    const studentsPage = await openStudents(page);
    await studentsPage.filterByTeacher(example.lerato.teacherName);
    await studentsPage.filterByGrade('Grade2');
    await expectNoStudents(studentsPage);

    await studentsPage.filterGradeSelect.selectOption('');

    await expectRoster(studentsPage, [example.sipho]);
    await expect(studentsPage.emptyRosterMessage()).toBeHidden();
  });
});

test.describe('Students — the other filters behave as before at All Teachers', { tag: ['@340IT8'] }, () => {
  test('S1 Name', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const example = await seedWorkedExample(page, target, token);
    const studentsPage = await openStudents(page);

    await studentsPage.filterByName(token);
    await expectRoster(studentsPage, example.all);

    await studentsPage.filterByName(`PIETER ${token}`);
    await expectRoster(studentsPage, [example.pieter]);
    await expectTeacherFilterReads(studentsPage, ALL_TEACHERS);
  });

  test('S2 Grade, including Private', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const example = await seedWorkedExample(page, target, token);
    const studentsPage = await openStudents(page, token);

    await studentsPage.filterByGrade('Grade5');
    await expectRoster(studentsPage, [example.thandi, example.sipho]);

    await studentsPage.filterByGrade('Private');
    await expectRoster(studentsPage, [example.noCourse]);
    await expectTeacherFilterReads(studentsPage, ALL_TEACHERS);
  });

  test('S3 Phase and Class, and a Private-grade student under them', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInWithRecorder(page);
    const example = await seedWorkedExample(page, target, token);
    const studentsPage = await openStudents(page, token);

    await studentsPage.filterByPhase('Senior');
    await expectRoster(studentsPage, [example.aisha]);

    await studentsPage.filterByPhase('Junior');
    await expectRoster(studentsPage, [example.thandi, example.pieter, example.sipho, example.emma]);

    await studentsPage.filterByPhase('');
    await studentsPage.filterByClass('E2');
    await expectRoster(studentsPage, [example.thandi]);

    await studentsPage.filterByGrade('Grade5');
    await studentsPage.filterByClass('E3');
    await expectRoster(studentsPage, [example.sipho]);
    await expectTeacherFilterReads(studentsPage, ALL_TEACHERS);
  });
});
