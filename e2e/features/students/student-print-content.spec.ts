import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import {
  boxOf,
  localIsoDate,
  openStudents,
  readExtendedView,
  seedGuardian,
  seedListedActivity,
  seedSiblingLink,
  seedStudent,
  signInToSeed,
  stubPrint,
  uniqueToken,
} from '../../fixtures/studentPrint';
import {
  seedActivityOnlyStudent,
  seedPrivateActivityOnlyStudent,
} from '../../fixtures/enrollment';
import { assignActivity } from '../../fixtures/extraCurriculars';
import { guardianRelationshipIdByName, fetchGuardians } from '../../fixtures/guardians';
import { ensureCourseOfType, fetchLessonStructureId, fetchStudentEnrollments } from '../../fixtures/waitingList';
import { switchToPrintMedia } from '../../fixtures/printMedia';
import { StudentPrintRecordPage } from '../../pages/students/StudentPrintRecordPage';
import type { StudentsPage } from '../../pages/students/StudentsPage';

/** Expands the row, reads the extended view on screen, then prints and inspects the printout. */
async function printStudent(page: Page, studentsPage: StudentsPage, studentId: string, name: string) {
  await studentsPage.expandUntilPrintOffered(name, studentId);
  const extended = await readExtendedView(studentsPage);
  const today = await localIsoDate(page);
  await stubPrint(page);
  await studentsPage.printButtonOf(studentId).click();
  await switchToPrintMedia(page);
  const record = new StudentPrintRecordPage(page);
  await expect(record.record).toBeVisible();
  return { record, extended, today };
}

async function textOf(locator: ReturnType<StudentPrintRecordPage['section']>): Promise<string> {
  return (await locator.textContent()) ?? '';
}

test.describe('Printed record — opening line, name and details', { tag: ['@340IT14'] }, () => {
  test('S1 opening line, name and details of a graded student', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const studentId = await seedStudent(page, target, {
      firstName: 'Thandi',
      lastName: token,
      grade: 'Grade5',
      phase: 'Junior',
      class: 'E2',
      language: 'English',
      dateOfBirth: '2015-03-12',
    });
    const studentsPage = await openStudents(page, token);

    const { record, today } = await printStudent(page, studentsPage, studentId, `Thandi ${token}`);

    expect(await textOf(record.printedOn)).toBe(`Printed on ${today}`);
    await expect(record.record.getByText(/^Printed on/)).toHaveCount(1);
    await expect(record.blockLines().nth(0)).toHaveAttribute('id', 'printedOn');
    await expect(record.blockLines().nth(1)).toHaveAttribute('id', 'studentName');
    expect(await textOf(record.studentName)).toBe(`Thandi ${token}`);
    expect(await record.detailPairs()).toEqual([
      { label: 'Grade', value: 'Grade 5' },
      { label: 'Phase', value: 'Junior' },
      { label: 'Class', value: 'E2' },
      { label: 'Language', value: 'English' },
      { label: 'Date of Birth', value: '2015-03-12' },
    ]);

    const printedOn = await boxOf(record.printedOn);
    const name = await boxOf(record.studentName);
    const details = await boxOf(record.details);
    const siblings = await boxOf(record.section('siblings'));
    expect(name.y).toBeGreaterThanOrEqual(printedOn.bottom - 1);
    expect(details.y).toBeGreaterThanOrEqual(name.bottom - 1);
    expect(siblings.y).toBeGreaterThanOrEqual(details.bottom - 1);
  });
});

test.describe('Printed record — fields that do not apply are left out', { tag: ['@340IT15'] }, () => {
  test('S1 Private student, Phase and Class omitted', async ({ page }) => {
    const token = uniqueToken();
    await signInToSeed(page);
    const activityId = await seedListedActivity(page, {
      description: `Choir ${token}`,
      phase: 'Junior',
      practiceTimes: [{ day: 'Tuesday', startTime: '14:00' }],
    });
    const studentId = await seedPrivateActivityOnlyStudent(page, [activityId], token);
    const studentsPage = await openStudents(page, token);

    const { record } = await printStudent(page, studentsPage, studentId, `Amara ${token}`);

    const pairs = await record.detailPairs();
    expect(pairs.map((pair) => pair.label)).toEqual(['Grade', 'Language', 'Date of Birth']);
    expect(pairs[0].value).toBe('Private');
    for (const pair of pairs) {
      expect(pair.value.trim()).not.toBe('');
    }
  });

  test('S2 contrast: a graded student keeps Phase and Class', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const studentId = await seedStudent(page, target, {
      firstName: 'Amara',
      lastName: token,
      grade: 'Grade4',
      phase: 'Junior',
      class: 'A1',
    });
    const studentsPage = await openStudents(page, token);

    const { record } = await printStudent(page, studentsPage, studentId, `Amara ${token}`);

    const pairs = await record.detailPairs();
    expect(pairs.map((pair) => pair.label)).toEqual(['Grade', 'Phase', 'Class', 'Language', 'Date of Birth']);
  });
});

test.describe('Printed record — every date is ISO', { tag: ['@340IT16'] }, () => {
  test('S1 every date is ISO', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const studentId = await seedStudent(page, target, {
      firstName: 'Amara',
      lastName: token,
      dateOfBirth: '2013-11-07',
    });
    const [stored] = await fetchStudentEnrollments(page, studentId);
    const studentsPage = await openStudents(page, token);

    const { record, today } = await printStudent(page, studentsPage, studentId, `Amara ${token}`);

    const opening = await textOf(record.printedOn);
    expect(opening).toMatch(/^Printed on \d{4}-\d{2}-\d{2}$/);
    expect(opening).toBe(`Printed on ${today}`);
    const pairs = await record.detailPairs();
    expect(pairs.find((pair) => pair.label === 'Date of Birth')?.value).toBe('2013-11-07');
    const courses = await record.printedCourses();
    expect(courses).toHaveLength(1);
    expect(courses[0].enrolled).toBe(`Enrolled ${stored.enrolledDate}`);
    expect(courses[0].enrolled).toMatch(/^Enrolled \d{4}-\d{2}-\d{2}$/);
  });
});

test.describe('Printed record — sections match the extended view', { tag: ['@340IT17'] }, () => {
  test('S1 full record matches the extended view, section by section', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const structureId = await fetchLessonStructureId(page, {
      occurrenceType: 'DuringSchool',
      lessonType: 'Individual',
      durationType: 'HalfHour',
    });
    const instrument = await ensureCourseOfType(page, structureId, 'Instrument');
    const studentId = await seedStudent(page, target, {
      firstName: 'Thandi',
      lastName: token,
      enrolments: [
        { courseId: target.courseId, teacherId: target.teacherId },
        {
          courseId: instrument.courseId,
          teacherId: target.teacherId,
          instrumentType: 'Piano',
          stepType: 'Step3A',
        },
      ],
    });
    const naledi = await seedStudent(page, target, {
      firstName: 'Naledi',
      lastName: token,
      grade: 'Grade7',
      class: 'A1',
    });
    const jabu = await seedStudent(page, target, { firstName: 'Jabu', lastName: token, grade: 'Grade4', class: 'E1' });
    await seedSiblingLink(page, studentId, naledi);
    await seedSiblingLink(page, studentId, jabu);

    const father = await guardianRelationshipIdByName(page, 'Father');
    const mother = await guardianRelationshipIdByName(page, 'Mother');
    await seedGuardian(page, studentId, {
      firstName: 'Sipho',
      surname: token,
      guardianRelationshipId: father,
      cell: '082 555 0142',
      email: 'sipho@riverside.example',
      receivesCorrespondence: true,
      responsibleForPayment: true,
    });
    await seedGuardian(page, studentId, {
      firstName: 'Lindiwe',
      surname: token,
      guardianRelationshipId: mother,
      cell: '083 555 0177',
      email: null,
      married: true,
    });

    const choirId = await seedListedActivity(page, {
      description: `Choir ${token}`,
      phase: 'Junior',
      practiceTimes: [{ day: 'Tuesday', startTime: '14:00' }],
    });
    const ensembleId = await seedListedActivity(page, {
      description: `Recorder Ensemble ${token}`,
      phase: 'Junior',
      practiceTimes: [{ day: 'Friday', startTime: '14:00' }],
    });
    await assignActivity(page, studentId, choirId);
    await assignActivity(page, studentId, ensembleId);

    const studentsPage = await openStudents(page, token);
    const { record, extended } = await printStudent(page, studentsPage, studentId, `Thandi ${token}`);

    await expect(record.record.locator('.print-record__heading')).toHaveText([
      'Siblings',
      'Guardians',
      'Courses',
      'Extra-Curriculars',
    ]);
    const tops: number[] = [];
    for (const name of ['siblings', 'guardians', 'courses', 'extraCurriculars'] as const) {
      tops.push((await boxOf(record.sectionHeading(name))).y);
    }
    expect(tops).toEqual([...tops].sort((a, b) => a - b));
    expect(new Set(tops).size).toBe(4);

    expect(extended.siblings).toHaveLength(2);
    expect(await textOf(record.siblingsLine)).toBe(extended.siblings.join(', '));

    const printedGuardians = await record.printedGuardians();
    expect(printedGuardians).toHaveLength(2);
    expect(extended.guardians).toHaveLength(2);
    printedGuardians.forEach((printed, index) => {
      expect(printed.heading).toBe(extended.guardians[index].heading);
      expect(printed.contacts).toEqual([extended.guardians[index].contact]);
      expect(printed.flags).toBe(extended.guardians[index].flags);
    });
    const sipho = extended.guardians.findIndex((g) => g.heading.startsWith(`Sipho ${token}`));
    const lindiwe = extended.guardians.findIndex((g) => g.heading.startsWith(`Lindiwe ${token}`));
    expect(printedGuardians[sipho].contacts).toEqual(['082 555 0142 · sipho@riverside.example']);
    expect(printedGuardians[sipho].flags).toBe('Correspondence, Payment');
    expect(printedGuardians[lindiwe].contacts).toEqual(['083 555 0177']);
    expect(printedGuardians[lindiwe].flags).toBe('Married');

    const printedCourses = await record.printedCourses();
    expect(printedCourses).toHaveLength(2);
    expect(printedCourses).toEqual(extended.courses);
    const piano = printedCourses.find((c) => c.heading === 'Piano · Individual · Half Hour · During School');
    expect(piano?.assignment).toBe(`${target.teacherName} · Step 3A`);
    const recorder = printedCourses.find((c) => c.heading.startsWith('Grade 2 Recorder'));
    expect(recorder?.assignment).toBe(target.teacherName);

    expect(extended.activities).toHaveLength(2);
    expect(await textOf(record.extraCurricularsLine)).toBe(extended.activities.map((a) => a.description).join(', '));
  });

  test('S2 a guardian with no contact and no flags prints the heading alone', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const studentId = await seedStudent(page, target, { firstName: 'Thandi', lastName: token });
    await seedGuardian(page, studentId, {
      firstName: 'Sipho',
      surname: token,
      cell: null,
      email: null,
      receivesCorrespondence: false,
      responsibleForPayment: false,
      married: false,
    });
    const stored = await fetchGuardians(page, studentId);
    expect(stored).toHaveLength(1);
    expect(stored[0].cell ?? '').toBe('');
    const studentsPage = await openStudents(page, token);

    const { record, extended } = await printStudent(page, studentsPage, studentId, `Thandi ${token}`);

    expect(extended.guardians).toHaveLength(1);
    expect(extended.guardians[0].contact).toBeNull();
    expect(extended.guardians[0].flags).toBeNull();
    const printed = await record.printedGuardians();
    expect(printed).toHaveLength(1);
    expect(printed[0].lineCount).toBe(1);
    expect(printed[0].heading).toBe(extended.guardians[0].heading);
    expect(printed[0].text).toBe(printed[0].heading);
  });
});

test.describe('Printed record — activities print by description only', { tag: ['@340IT18'] }, () => {
  test('S1 descriptions only', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const choir = `Choir ${token}`;
    const ensemble = `Recorder Ensemble ${token}`;
    const choirId = await seedListedActivity(page, {
      description: choir,
      phase: 'Junior',
      practiceTimes: [
        { day: 'Tuesday', startTime: '14:00' },
        { day: 'Thursday', startTime: '07:30' },
      ],
    });
    const ensembleId = await seedListedActivity(page, {
      description: ensemble,
      phase: 'Junior',
      practiceTimes: [{ day: 'Friday', startTime: '14:00' }],
    });
    const studentId = await seedStudent(page, target, { firstName: 'Thandi', lastName: token });
    await assignActivity(page, studentId, choirId);
    await assignActivity(page, studentId, ensembleId);
    const studentsPage = await openStudents(page, token);

    const { record, extended } = await printStudent(page, studentsPage, studentId, `Thandi ${token}`);

    expect(extended.activities).toHaveLength(2);
    const onScreen = extended.activities.map((a) => a.practiceTimes).join(' ');
    expect(onScreen).toContain('14:00');
    expect(onScreen).toContain('07:30');
    const line = extended.activities.map((a) => a.description).join(', ');
    expect(await textOf(record.extraCurricularsLine)).toBe(line);
    const heading = await textOf(record.sectionHeading('extraCurriculars'));
    const section = await textOf(record.section('extraCurriculars'));
    expect(section.replace(/\s/g, '')).toBe(`${heading}${line}`.replace(/\s/g, ''));
  });
});

test.describe('Printed record — a Private student prints activities', { tag: ['@340IT19'] }, () => {
  test("S1 Private student's activities print", async ({ page }) => {
    const token = uniqueToken();
    await signInToSeed(page);
    const juniorId = await seedListedActivity(page, {
      description: `Choir ${token}`,
      phase: 'Junior',
      practiceTimes: [{ day: 'Tuesday', startTime: '14:00' }],
    });
    const seniorId = await seedListedActivity(page, {
      description: `Orchestra ${token}`,
      phase: 'Senior',
      practiceTimes: [{ day: 'Wednesday', startTime: '15:00' }],
    });
    const studentId = await seedPrivateActivityOnlyStudent(page, [juniorId, seniorId], token);
    const studentsPage = await openStudents(page, token);

    const { record, extended } = await printStudent(page, studentsPage, studentId, `Amara ${token}`);

    expect(extended.activities).toHaveLength(2);
    await expect(record.section('extraCurriculars')).toBeVisible();
    expect(await textOf(record.sectionHeading('extraCurriculars'))).toBe('Extra-Curriculars');
    await expect(record.record.locator('section').last()).toHaveAttribute('id', 'extraCurricularsSection');
    expect(await textOf(record.extraCurricularsLine)).toBe(extended.activities.map((a) => a.description).join(', '));
  });
});

test.describe('Printed record — empty sections print the extended view message', { tag: ['@340IT20'] }, () => {
  test('S1 three empty sections', async ({ page }) => {
    const token = uniqueToken();
    await signInToSeed(page);
    const activityId = await seedListedActivity(page, {
      description: `Choir ${token}`,
      phase: 'Junior',
      practiceTimes: [{ day: 'Tuesday', startTime: '14:00' }],
    });
    const studentId = await seedActivityOnlyStudent(page, activityId, token);
    const studentsPage = await openStudents(page, token);

    const { record, extended } = await printStudent(page, studentsPage, studentId, `Amara ${token}`);

    expect(await textOf(record.emptyState('siblings'))).toBe(extended.emptyMessages.siblings);
    expect(await textOf(record.emptyState('guardians'))).toBe(extended.emptyMessages.guardians);
    expect(await textOf(record.emptyState('courses'))).toBe(extended.emptyMessages.courses);
    expect(extended.emptyMessages.siblings).toBe('No siblings linked.');
    expect(extended.emptyMessages.guardians).toBe('No guardians linked.');
    expect(extended.emptyMessages.courses).toBe('No course enrollments.');
    await expect(record.guardianEntries()).toHaveCount(0);
    await expect(record.courseEntries()).toHaveCount(0);
    await expect(record.emptyState('extraCurriculars')).toHaveCount(0);
    expect(await textOf(record.extraCurricularsLine)).toBe(`Choir ${token}`);
  });

});

test.describe('Printed record — no activities prints the extended view message', { tag: ['@340IT21'] }, () => {
  test('S1 no activities', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const studentId = await seedStudent(page, target, { firstName: 'Thandi', lastName: token });
    const studentsPage = await openStudents(page, token);

    const { record, extended } = await printStudent(page, studentsPage, studentId, `Thandi ${token}`);

    expect(await textOf(record.emptyState('extraCurriculars'))).toBe(extended.emptyMessages.activities);
    expect(extended.emptyMessages.activities).toBe('No extra-curricular activities assigned.');
    await expect(record.courseEntries()).toHaveCount(1);
    await expect(record.emptyState('courses')).toHaveCount(0);
  });
});
