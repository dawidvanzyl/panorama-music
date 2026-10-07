import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import {
  boxOf,
  emailFitting,
  measureTextWidth,
  openStudents,
  readExtendedView,
  seedGuardian,
  seedListedActivity,
  seedNamedTeacher,
  seedStudent,
  signInToSeed,
  stubPrint,
  textWidths,
  twoCourseEnrolments,
  uniqueToken,
  waitForListLength,
  wordLineCount,
} from '../../fixtures/studentPrint';
import { assignActivity } from '../../fixtures/extraCurriculars';
import { attemptUpdateGuardian, fetchGuardians, guardianRelationshipIdByName } from '../../fixtures/guardians';
import {
  PRINTABLE_WIDTH_PX,
  ancestorChain,
  bottomEdgeWithinDocumentScrollHeight,
  chainHasNoClippingAncestor,
  chainHasNoHorizontalOverflow,
  documentHasNoHorizontalScroll,
  isNotClipped,
  isTallerThanOneLine,
  switchToPrintMedia,
} from '../../fixtures/printMedia';
import { StudentPrintRecordPage } from '../../pages/students/StudentPrintRecordPage';
import type { StudentsPage } from '../../pages/students/StudentsPage';

const COLUMN_WIDTH_LIMIT_PX = (PRINTABLE_WIDTH_PX - 24) / 2 - 2;
const FULL_WIDTH_LIMIT_PX = PRINTABLE_WIDTH_PX - 2;
const BOLD_BODY_FONT = "bold 13px 'Inter', system-ui, sans-serif";

/** Expands the row, then prints it and switches to the printable width. */
async function printStudent(
  page: Page,
  studentsPage: StudentsPage,
  studentId: string,
  name: string,
  viewportHeight = 1000,
) {
  await studentsPage.expandUntilPrintOffered(name, studentId);
  const extended = await readExtendedView(studentsPage);
  await stubPrint(page);
  await studentsPage.printButtonOf(studentId).click();
  await switchToPrintMedia(page, viewportHeight);
  const record = new StudentPrintRecordPage(page);
  await expect(record.record).toBeVisible();
  return { record, extended };
}

async function expectNothingRunsPastThePage(page: Page, record: StudentPrintRecordPage): Promise<void> {
  expect(chainHasNoHorizontalOverflow(await ancestorChain(record.record))).toBe(true);
  expect(await documentHasNoHorizontalScroll(page)).toBe(true);
  const box = await boxOf(record.record);
  expect(box.right).toBeLessThanOrEqual(page.viewportSize()!.width + 1);
}

async function expectEveryLineUnclipped(record: StudentPrintRecordPage): Promise<void> {
  const lines = await record.blockLines().all();
  expect(lines.length).toBeGreaterThan(0);
  for (const line of lines) {
    expect(await isNotClipped(line)).toBe(true);
  }
}

async function expectWithinRecord(record: StudentPrintRecordPage, line: Locator): Promise<void> {
  const recordBox = await boxOf(record.record);
  const lineBox = await boxOf(line);
  expect(lineBox.x).toBeGreaterThanOrEqual(recordBox.x - 1);
  expect(lineBox.right).toBeLessThanOrEqual(recordBox.right + 1);
}

function words(text: string): string[] {
  return text.split(' ').filter((word) => word !== '');
}

async function expectEveryWordFitsAndLiesOnOneLine(line: Locator, text: string, limit: number): Promise<void> {
  const parts = words(text);
  const widths = await textWidths(line, parts);
  widths.forEach((width, index) => {
    expect(width, `"${parts[index]}" must fit its line for the check to apply`).toBeLessThan(limit);
  });
  for (const word of parts) {
    expect(await wordLineCount(line, word), `"${word}" lies on one line`).toBe(1);
  }
}

async function seedShortEmailGuardians(page: Page, studentId: string, token: string, count: number) {
  const names = ['Sipho', 'Lindiwe', 'Themba'];
  for (let index = 0; index < count; index++) {
    await seedGuardian(page, studentId, {
      firstName: names[index],
      surname: token,
      cell: `08${index} 555 0142`,
      email: `${names[index].toLowerCase()}@school.example.org`,
    });
  }
}

test.describe('Printed record — nothing is cut off or runs past the page', { tag: ['@340IT22'] }, () => {
  test('S1 long values fit and wrap whole', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const teacher = await seedNamedTeacher(page, 'Hendrika Wilhelmina', `van der Westhuizen-Pretorius ${token}`);
    const enrolments = await twoCourseEnrolments(page, target, teacher.teacherId);
    const firstName = 'Maximiliana Alexandrina Christabel Josephine';
    const surname = `Featherstonehaugh-${token}`;
    const studentId = await seedStudent(page, target, { firstName, lastName: surname, enrolments });

    const email = await emailFitting(page, {
      prefix: `nomsa.${token}`,
      domain: 'riverside.example.org',
      emailMin: 200,
      emailMax: 320,
    });
    for (const [first, last] of [
      ['Bernadette Marguerite Josephine', `van der Westhuizen-Oosthuizen ${token}`],
      ['Annelize Wilhelmina Cornelia', `Pretorius-Kruger du Plessis ${token}`],
    ]) {
      await seedGuardian(page, studentId, {
        firstName: first,
        surname: last,
        cell: '082 555 0142',
        email,
        receivesCorrespondence: true,
        responsibleForPayment: true,
        married: true,
      });
    }
    for (const description of [
      `Intermediate Chamber Ensemble and Orchestral Rehearsals ${token}`,
      `Junior Marimba and Percussion Development Workshop ${token}`,
      `Combined Recorder Consort and Singing Practice Group ${token}`,
    ]) {
      const activityId = await seedListedActivity(page, {
        description,
        phase: 'Junior',
        practiceTimes: [{ day: 'Monday', startTime: '15:00' }],
      });
      await assignActivity(page, studentId, activityId);
    }
    const studentsPage = await openStudents(page, token);

    const { record, extended } = await printStudent(page, studentsPage, studentId, `${firstName} ${surname}`);

    await expectNothingRunsPastThePage(page, record);
    await expectEveryLineUnclipped(record);
    await expect(record.studentName).toHaveText(`${firstName} ${surname}`);
    expect(await isTallerThanOneLine(record.studentName)).toBe(true);
    await expectEveryWordFitsAndLiesOnOneLine(record.studentName, `${firstName} ${surname}`, PRINTABLE_WIDTH_PX - 2);

    const printedGuardians = await record.printedGuardians();
    expect(printedGuardians.map((g) => g.heading)).toEqual(extended.guardians.map((g) => g.heading));
    expect(printedGuardians.map((g) => g.contacts.join(' · '))).toEqual(
      extended.guardians.map((g) => g.contact ?? ''),
    );
    expect(await record.printedCourses()).toEqual(extended.courses);
    await expect(record.extraCurricularsLine).toHaveText(
      extended.activities.map((a) => a.description).join(', '),
    );
    expect(await record.record.textContent()).not.toContain('…');
  });

  test('S2 a hyphenated word that fits its line is never broken at its hyphen', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const firstName = 'Annabel-Christabel Maximiliana';
    const surname = `Featherstonehaugh-${token}`;
    const studentId = await seedStudent(page, target, { firstName, lastName: surname });
    const mother = await guardianRelationshipIdByName(page, 'Mother');

    let hyphenated = `Merwe-Oosthuizen-${token}`;
    if ((await measureTextWidth(page, hyphenated, BOLD_BODY_FONT)) >= COLUMN_WIDTH_LIMIT_PX) {
      hyphenated = `Merwe-Oost-${token}`;
    }
    const guardianSurname = `van der ${hyphenated}`;
    await seedGuardian(page, studentId, {
      firstName: 'Bernadette Marguerite Josephine',
      surname: guardianSurname,
      guardianRelationshipId: mother,
      cell: '082 555 0142',
      email: 'bernadette@school.example.org',
    });
    await seedGuardian(page, studentId, {
      firstName: 'Sipho',
      surname: token,
      email: 'sipho@school.example.org',
    });
    const studentsPage = await openStudents(page, token);

    const { record, extended } = await printStudent(page, studentsPage, studentId, `${firstName} ${surname}`);

    const entry = record.guardianEntries().filter({ hasText: guardianSurname });
    await expect(entry).toHaveCount(1);
    const heading = entry.locator('.print-record__entry-heading');
    const widths = await textWidths(heading, [hyphenated]);
    expect(widths[0], 'the hyphenated word must fit one column line').toBeLessThan(COLUMN_WIDTH_LIMIT_PX);
    expect(await isTallerThanOneLine(heading)).toBe(true);
    expect(await wordLineCount(heading, hyphenated)).toBe(1);
    const expectedHeading = extended.guardians.find((g) => g.heading.includes(guardianSurname))!.heading;
    await expect(heading).toHaveText(expectedHeading);

    const nameWidths = await textWidths(record.studentName, ['Annabel-Christabel', surname]);
    nameWidths.forEach((width) => expect(width).toBeLessThan(PRINTABLE_WIDTH_PX - 2));
    expect(await wordLineCount(record.studentName, 'Annabel-Christabel')).toBe(1);
  });

  test('S3 an email wider than the whole page stays on the page', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const studentId = await seedStudent(page, target, { firstName: 'Thandi', lastName: token });
    const email = await emailFitting(page, {
      prefix: `very.long.address.${token}`,
      domain: 'riverside.example.org',
      emailMin: 780,
    });
    expect(email.length).toBeLessThanOrEqual(254);
    await seedGuardian(page, studentId, { firstName: 'Sipho', surname: token, cell: null, email });
    const studentsPage = await openStudents(page, token);

    const { record } = await printStudent(page, studentsPage, studentId, `Thandi ${token}`);

    const contact = record.record.locator('.print-record__contact');
    await expect(contact).toHaveCount(1);
    const [width] = await textWidths(contact, [email]);
    expect(width, 'the address must be wider than the printable width').toBeGreaterThan(PRINTABLE_WIDTH_PX);
    expect(await isNotClipped(contact)).toBe(true);
    await expectWithinRecord(record, contact);
    await expectNothingRunsPastThePage(page, record);
    await expect(contact).toHaveText(email);
  });

  test('S4 any word wider than its line wraps; the words that fit stay whole', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const firstName = 'Hubertblaineswolfeschlegelsteinhausenbergerdorffvoralternwarengewissenhaft';
    const studentId = await seedStudent(page, target, { firstName, lastName: token });
    const father = await guardianRelationshipIdByName(page, 'Father');

    let longSurname = `Wolfeschlegelsteinhausenbergerdorff${token}`;
    while ((await measureTextWidth(page, longSurname, BOLD_BODY_FONT)) < COLUMN_WIDTH_LIMIT_PX + 40) {
      longSurname += 'x';
    }
    await seedGuardian(page, studentId, {
      firstName: 'Nomsa',
      surname: longSurname,
      guardianRelationshipId: father,
      cell: '082 555 0142',
      email: 'nomsa@school.example.org',
    });
    await seedGuardian(page, studentId, {
      firstName: 'Sipho',
      surname: token,
      cell: '083 555 0177',
      email: 'sipho@school.example.org',
    });
    const studentsPage = await openStudents(page, token);

    const { record, extended } = await printStudent(page, studentsPage, studentId, `${firstName} ${token}`);

    const entry = record.guardianEntries().filter({ hasText: longSurname });
    await expect(entry).toHaveCount(1);
    const heading = entry.locator('.print-record__entry-heading');
    const [surnameWidth] = await textWidths(heading, [longSurname]);
    expect(surnameWidth, 'the surname must be wider than a column line').toBeGreaterThan(COLUMN_WIDTH_LIMIT_PX);
    const [firstNameWidth, tokenWidth] = await textWidths(record.studentName, [firstName, token]);
    expect(firstNameWidth, 'the first name must be wider than the page').toBeGreaterThan(PRINTABLE_WIDTH_PX);
    expect(tokenWidth, 'the token surname must fit its line').toBeLessThan(PRINTABLE_WIDTH_PX - 2);

    const recordBox = await boxOf(record.record);
    const entryBox = await boxOf(entry);
    const headingBox = await boxOf(heading);
    expect(entryBox.width).toBeLessThanOrEqual(recordBox.width / 2 + 1);
    expect(await isTallerThanOneLine(heading)).toBe(true);
    expect(await isNotClipped(heading)).toBe(true);
    expect(headingBox.right).toBeLessThanOrEqual(entryBox.right + 1);
    const expectedHeading = extended.guardians.find((g) => g.heading.includes(longSurname))!.heading;
    await expect(heading).toHaveText(expectedHeading);
    expect(await wordLineCount(heading, 'Nomsa')).toBe(1);
    expect(await wordLineCount(heading, 'Father')).toBe(1);

    expect(await isTallerThanOneLine(record.studentName)).toBe(true);
    expect(await isNotClipped(record.studentName)).toBe(true);
    await expectWithinRecord(record, record.studentName);
    await expect(record.studentName).toHaveText(`${firstName} ${token}`);
    expect(await wordLineCount(record.studentName, token)).toBe(1);
    await expectNothingRunsPastThePage(page, record);
  });
});

test.describe('Printed record — Guardians and Courses in two columns', { tag: ['@340IT23'] }, () => {
  async function seedStudentWithGuardians(page: Page, guardianCount: number) {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const enrolments = await twoCourseEnrolments(page, target);
    const studentId = await seedStudent(page, target, { firstName: 'Thandi', lastName: token, enrolments });
    await seedShortEmailGuardians(page, studentId, token, guardianCount);
    const studentsPage = await openStudents(page, token);
    return { studentsPage, studentId, name: `Thandi ${token}` };
  }

  test('S1 two short emails, two columns each', async ({ page }) => {
    const { studentsPage, studentId, name } = await seedStudentWithGuardians(page, 2);

    const { record } = await printStudent(page, studentsPage, studentId, name);

    const recordBox = await boxOf(record.record);
    const guardians = record.guardianEntries();
    await expect(guardians).toHaveCount(2);
    const first = await boxOf(guardians.nth(0));
    const second = await boxOf(guardians.nth(1));
    expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(2);
    expect(second.x).toBeGreaterThanOrEqual(first.right);
    expect(first.width).toBeLessThanOrEqual(recordBox.width / 2 + 1);
    expect(second.width).toBeLessThanOrEqual(recordBox.width / 2 + 1);

    const courses = record.courseEntries();
    await expect(courses).toHaveCount(2);
    const firstCourse = await boxOf(courses.nth(0));
    const secondCourse = await boxOf(courses.nth(1));
    expect(Math.abs(firstCourse.y - secondCourse.y)).toBeLessThanOrEqual(2);
    expect(secondCourse.x).toBeGreaterThanOrEqual(firstCourse.right);
  });

  test('S2 three guardians wrap into a second row', async ({ page }) => {
    const { studentsPage, studentId, name } = await seedStudentWithGuardians(page, 3);

    const { record } = await printStudent(page, studentsPage, studentId, name);

    const guardians = record.guardianEntries();
    await expect(guardians).toHaveCount(3);
    const first = await boxOf(guardians.nth(0));
    const second = await boxOf(guardians.nth(1));
    const third = await boxOf(guardians.nth(2));
    expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(2);
    expect(second.x).toBeGreaterThanOrEqual(first.right);
    expect(Math.abs(third.x - first.x)).toBeLessThanOrEqual(2);
    expect(third.y).toBeGreaterThanOrEqual(Math.max(first.bottom, second.bottom) - 1);
  });
});

test.describe('Printed record — a wide email puts Guardians in one column', { tag: ['@340IT24'] }, () => {
  async function seedWideEmailStudent(page: Page) {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const enrolments = await twoCourseEnrolments(page, target);
    const studentId = await seedStudent(page, target, { firstName: 'Thandi', lastName: token, enrolments });
    const wideEmail = await emailFitting(page, {
      prefix: `sipho.${token}`,
      domain: 'riverside.example.org',
      emailMin: 470,
      emailMax: 620,
    });
    const guardianA = await seedGuardian(page, studentId, {
      firstName: 'Sipho',
      surname: token,
      cell: null,
      email: wideEmail,
    });
    await seedGuardian(page, studentId, {
      firstName: 'Lindiwe',
      surname: token,
      cell: '083 555 0177',
      email: 'lindiwe@school.example.org',
    });
    return { token, studentId, guardianA, wideEmail };
  }

  test('S1 one long email drops Guardians to one column', async ({ page }) => {
    const { token, studentId, wideEmail } = await seedWideEmailStudent(page);
    const studentsPage = await openStudents(page, token);

    const { record } = await printStudent(page, studentsPage, studentId, `Thandi ${token}`);

    const guardians = record.guardianEntries();
    await expect(guardians).toHaveCount(2);
    const first = await boxOf(guardians.nth(0));
    const second = await boxOf(guardians.nth(1));
    expect(Math.abs(first.x - second.x)).toBeLessThanOrEqual(2);
    expect(second.y).toBeGreaterThanOrEqual(first.bottom - 1);

    const contact = guardians.filter({ hasText: `Sipho ${token}` }).locator('.print-record__contact');
    await expect(contact).toHaveCount(1);
    const [width] = await textWidths(contact, [wideEmail]);
    expect(width).toBeGreaterThanOrEqual(450);
    expect(width).toBeLessThanOrEqual(650);
    await expect(contact).toHaveText(wideEmail);
    expect(await isTallerThanOneLine(contact)).toBe(false);
    expect(await isNotClipped(contact)).toBe(true);
    await expectWithinRecord(record, contact);

    const courses = record.courseEntries();
    const firstCourse = await boxOf(courses.nth(0));
    const secondCourse = await boxOf(courses.nth(1));
    expect(Math.abs(firstCourse.y - secondCourse.y)).toBeLessThanOrEqual(2);
    expect(secondCourse.x).toBeGreaterThanOrEqual(firstCourse.right);
  });

  test('S2 contrast: without the long email, two columns', async ({ page }) => {
    const { token, studentId, guardianA } = await seedWideEmailStudent(page);
    const shortEmail = 'sipho@school.example.org';
    const status = await attemptUpdateGuardian(page, guardianA.guardianId, {
      firstName: 'Sipho',
      surname: token,
      cell: null,
      email: shortEmail,
    });
    expect(status).toBe(200);
    await expect
      .poll(async () => (await fetchGuardians(page, studentId)).map((g) => g.email))
      .toContain(shortEmail);
    await waitForListLength(page, `/api/students/${studentId}/guardians`, 2);
    const studentsPage = await openStudents(page, token);

    const { record } = await printStudent(page, studentsPage, studentId, `Thandi ${token}`);

    const guardians = record.guardianEntries();
    await expect(guardians).toHaveCount(2);
    const first = await boxOf(guardians.nth(0));
    const second = await boxOf(guardians.nth(1));
    expect(Math.abs(first.y - second.y)).toBeLessThanOrEqual(2);
    expect(second.x).toBeGreaterThanOrEqual(first.right);
  });
});

test.describe('Printed record — an email that does not fit beside the cell moves beneath it', { tag: ['@340IT25'] }, () => {
  test('S1 two columns, pair too wide: the email moves beneath', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const studentId = await seedStudent(page, target, { firstName: 'Thandi', lastName: token });
    const cell = '082 555 0142';
    const email = await emailFitting(page, {
      prefix: `nomsa.${token}`,
      domain: 'school.example.org',
      emailMax: 335,
      cell,
      pairMin: 365,
    });
    await seedGuardian(page, studentId, { firstName: 'Nomsa', surname: token, cell, email });
    await seedGuardian(page, studentId, {
      firstName: 'Lindiwe',
      surname: token,
      cell: '083 555 0177',
      email: 'lindiwe@school.example.org',
    });
    const studentsPage = await openStudents(page, token);

    const { record } = await printStudent(page, studentsPage, studentId, `Thandi ${token}`);

    const guardians = record.guardianEntries();
    await expect(guardians).toHaveCount(2);
    const columns = await boxOf(guardians.nth(0));
    const sibling = await boxOf(guardians.nth(1));
    expect(Math.abs(columns.y - sibling.y)).toBeLessThanOrEqual(2);

    const entryA = guardians.filter({ hasText: `Nomsa ${token}` });
    const contactsA = entryA.locator('.print-record__contact');
    await expect(contactsA).toHaveCount(2);
    const [pairWidth] = await textWidths(contactsA.first(), [`${cell} · ${email}`]);
    const [emailWidth] = await textWidths(contactsA.first(), [email]);
    expect(emailWidth, 'the address alone must fit a column line').toBeLessThan(COLUMN_WIDTH_LIMIT_PX);
    expect(pairWidth, 'the cell and address together must not fit').toBeGreaterThan(COLUMN_WIDTH_LIMIT_PX);
    await expect(contactsA.nth(0)).toHaveText(cell);
    await expect(contactsA.nth(1)).toHaveText(email);
    const entryBox = await boxOf(entryA);
    const firstLine = await boxOf(contactsA.nth(0));
    const secondLine = await boxOf(contactsA.nth(1));
    expect(secondLine.y).toBeGreaterThanOrEqual(firstLine.bottom - 1);
    expect(Math.abs(firstLine.x - entryBox.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(secondLine.x - entryBox.x)).toBeLessThanOrEqual(2);
    for (const line of [contactsA.nth(0), contactsA.nth(1)]) {
      expect(await isTallerThanOneLine(line)).toBe(false);
      expect(await isNotClipped(line)).toBe(true);
    }

    const contactsB = guardians.filter({ hasText: `Lindiwe ${token}` }).locator('.print-record__contact');
    await expect(contactsB).toHaveCount(1);
    await expect(contactsB).toHaveText('083 555 0177 · lindiwe@school.example.org');
  });

  test('S2 one column, pair too wide for the full width: the email moves beneath', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const studentId = await seedStudent(page, target, { firstName: 'Thandi', lastName: token });
    const cell = '+27 82 555 0142 / 082 555 0143';
    expect(cell.length).toBeLessThanOrEqual(30);
    const email = await emailFitting(page, {
      prefix: `nomsa.mokoena.${token}`,
      domain: 'riverside.example.org',
      emailMin: 530,
      emailMax: 690,
      cell,
      pairMin: 740,
    });
    await seedGuardian(page, studentId, { firstName: 'Nomsa', surname: token, cell, email });
    await seedGuardian(page, studentId, {
      firstName: 'Lindiwe',
      surname: token,
      cell: '083 555 0177',
      email: 'lindiwe@school.example.org',
    });
    const studentsPage = await openStudents(page, token);

    const { record } = await printStudent(page, studentsPage, studentId, `Thandi ${token}`);

    const guardians = record.guardianEntries();
    await expect(guardians).toHaveCount(2);
    const first = await boxOf(guardians.nth(0));
    const second = await boxOf(guardians.nth(1));
    expect(Math.abs(first.x - second.x)).toBeLessThanOrEqual(2);
    expect(second.y).toBeGreaterThanOrEqual(first.bottom - 1);

    const contactsA = guardians.filter({ hasText: `Nomsa ${token}` }).locator('.print-record__contact');
    await expect(contactsA).toHaveCount(2);
    const [emailWidth] = await textWidths(contactsA.first(), [email]);
    const [pairWidth] = await textWidths(contactsA.first(), [`${cell} · ${email}`]);
    expect(emailWidth, 'the address alone must be wider than a column').toBeGreaterThan(COLUMN_WIDTH_LIMIT_PX);
    expect(emailWidth, 'the address alone must fit the full width').toBeLessThan(FULL_WIDTH_LIMIT_PX);
    expect(pairWidth, 'the cell and address together must not fit the full width').toBeGreaterThan(FULL_WIDTH_LIMIT_PX);
    await expect(contactsA.nth(0)).toHaveText(cell);
    await expect(contactsA.nth(1)).toHaveText(email);
    for (const line of [contactsA.nth(0), contactsA.nth(1)]) {
      expect(await isTallerThanOneLine(line)).toBe(false);
      expect(await isNotClipped(line)).toBe(true);
    }
    const contactsB = guardians.filter({ hasText: `Lindiwe ${token}` }).locator('.print-record__contact');
    await expect(contactsB).toHaveText('083 555 0177 · lindiwe@school.example.org');
  });
});

test.describe('Printed record — a long record continues over several pages', { tag: ['@340IT26'] }, () => {
  test('S1 a long record lays out in full', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const enrolments = await twoCourseEnrolments(page, target);
    const studentId = await seedStudent(page, target, { firstName: 'Thandi', lastName: token, enrolments });
    for (let index = 1; index <= 30; index++) {
      await seedGuardian(page, studentId, {
        firstName: `Guardian${`${index}`.padStart(2, '0')}`,
        surname: token,
        cell: '082 555 0142',
        email: `guardian${index}@school.example.org`,
        receivesCorrespondence: true,
        responsibleForPayment: true,
        married: true,
      });
    }
    await waitForListLength(page, `/api/students/${studentId}/guardians`, 30);
    const studentsPage = await openStudents(page, token);

    const { record } = await printStudent(page, studentsPage, studentId, `Thandi ${token}`, 600);

    await expect(record.guardianEntries()).toHaveCount(30);
    await expect(record.courseEntries()).toHaveCount(2);
    const documentHeight = await page.evaluate(() => document.documentElement.scrollHeight);
    expect(documentHeight).toBeGreaterThanOrEqual(2 * 600);
    expect(await bottomEdgeWithinDocumentScrollHeight(record.guardianEntries().last())).toBe(true);
    expect(await bottomEdgeWithinDocumentScrollHeight(record.courseEntries().last())).toBe(true);
    expect(chainHasNoClippingAncestor(await ancestorChain(record.record))).toBe(true);

    const entryBreaks = await record.record
      .locator('.print-record__entry')
      .evaluateAll((entries) => entries.map((entry) => getComputedStyle(entry).breakInside));
    expect(entryBreaks).toHaveLength(32);
    expect(entryBreaks.every((value) => value === 'avoid')).toBe(true);

    const guardiansBox = await boxOf(record.section('guardians'));
    const coursesBox = await boxOf(record.section('courses'));
    const activitiesBox = await boxOf(record.section('extraCurriculars'));
    expect(coursesBox.y).toBeGreaterThanOrEqual(guardiansBox.bottom - 1);
    expect(activitiesBox.y).toBeGreaterThanOrEqual(coursesBox.bottom - 1);
  });
});
