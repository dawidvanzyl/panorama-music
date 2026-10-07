import type { Locator, Page } from '@playwright/test';
import { test, expect } from './base';
import { loginAsRoles } from './testUsers';
import { seedEnrollmentTarget, waitForSeededEntry, type SeededEnrollmentTarget } from './enrollment';
import { seedReportStudent, type SeedReportStudentOptions } from './reports';
import { addGuardianToStudent, type GuardianSeedInput, type SeededGuardian } from './guardians';
import { linkSiblings } from './siblings';
import { seedActivity, type SeedActivityOptions } from './extraCurriculars';
import { StudentsPage } from '../pages/students/StudentsPage';

/**
 * A surname unique to one test. It never contains a word the record itself
 * prints (Print, Phase, Class, Grade, Private, Junior, Senior), so a seeded
 * name can never satisfy an assertion about the record's own wording.
 */
export function uniqueToken(): string {
  const random = crypto.randomUUID().slice(0, 4).replace(/-/g, '');
  return `Zq${test.info().workerIndex}${Date.now().toString(36)}${random}`;
}

/** Signs in holding Teacher and Coordinator, and seeds the course and teacher students are enrolled with. */
export async function signInToSeed(page: Page): Promise<SeededEnrollmentTarget> {
  await loginAsRoles(page, ['Teacher', 'Coordinator']);
  return seedEnrollmentTarget(page);
}

/** Loads the Students screen afresh, so everything seeded so far is listed, optionally narrowed to a name. */
export async function openStudents(page: Page, nameFilter?: string): Promise<StudentsPage> {
  await page.reload();
  const studentsPage = new StudentsPage(page);
  await studentsPage.gotoStudents();
  if (nameFilter) {
    await studentsPage.filterByName(nameFilter);
  }
  return studentsPage;
}

/** Seeds a student and waits until every enrolment has committed. */
export async function seedStudent(
  page: Page,
  target: SeededEnrollmentTarget,
  options: SeedReportStudentOptions,
): Promise<string> {
  const studentId = await seedReportStudent(page, target, options);
  const courseIds = options.enrolments?.map((e) => e.courseId) ?? [target.courseId];
  for (const courseId of courseIds) {
    await waitForSeededEntry(page, `/api/students/${studentId}/courses`, 'courseId', courseId);
  }
  return studentId;
}

export async function seedGuardian(
  page: Page,
  studentId: string,
  input: GuardianSeedInput = {},
): Promise<SeededGuardian> {
  const guardian = await addGuardianToStudent(page, studentId, input);
  await waitForSeededEntry(page, `/api/students/${studentId}/guardians`, 'guardianId', guardian.guardianId);
  return guardian;
}

/** Links two students as siblings and waits until the link is readable. */
export async function seedSiblingLink(page: Page, studentId: string, siblingId: string): Promise<void> {
  await linkSiblings(page, studentId, siblingId);
  await waitForSeededEntry(page, `/api/students/${studentId}/siblings`, 'studentId', siblingId);
}

/** Creates an activity and waits until it is listed, so it can be assigned. */
export async function seedListedActivity(page: Page, options: SeedActivityOptions): Promise<string> {
  const { extraCurricularId } = await seedActivity(page, options);
  await waitForSeededEntry(page, '/api/extra-curriculars', 'extraCurricularId', extraCurricularId);
  return extraCurricularId;
}

/** Waits until a list endpoint returns exactly this many entries. */
export async function waitForListLength(page: Page, path: string, length: number): Promise<void> {
  await expect
    .poll(
      async () =>
        page.evaluate(async (path) => {
          const response = await fetch(path, {
            headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
          });
          if (!response.ok) return -1;
          return ((await response.json()) as unknown[]).length;
        }, path),
      { timeout: 15_000 },
    )
    .toBe(length);
}

/** The browser's local date as `YYYY-MM-DD`. */
export async function localIsoDate(page: Page): Promise<string> {
  return page.evaluate(() => {
    const now = new Date();
    const month = `${now.getMonth() + 1}`.padStart(2, '0');
    const day = `${now.getDate()}`.padStart(2, '0');
    return `${now.getFullYear()}-${month}-${day}`;
  });
}

/** Replaces `window.print` with a counter that opens no dialog. */
export async function stubPrint(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __printCalls: number }).__printCalls = 0;
    window.print = () => {
      (window as unknown as { __printCalls: number }).__printCalls += 1;
    };
  });
}

export async function printCallCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __printCalls: number }).__printCalls ?? 0);
}

/** Simulates the print dialog closing. */
export async function closePrintDialog(page: Page): Promise<void> {
  await page.evaluate(() => {
    window.dispatchEvent(new Event('afterprint'));
  });
}

export interface ApiRequestLog {
  /** The position to measure from. */
  mark(): number;
  since(mark: number): string[];
}

/** Records every `/api/` request the page makes, as `METHOD /path`. */
export function trackApiRequests(page: Page): ApiRequestLog {
  const requests: string[] = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (url.pathname.startsWith('/api/')) {
      requests.push(`${request.method()} ${url.pathname}`);
    }
  });
  return {
    mark: () => requests.length,
    since: (mark) => requests.slice(mark),
  };
}

/** Every element of the locator, in document order, as its text content. */
export async function textsOf(locator: Locator): Promise<string[]> {
  return locator.evaluateAll((elements) => elements.map((element) => element.textContent ?? ''));
}

export interface ExtendedGuardian {
  heading: string;
  contact: string | null;
  flags: string | null;
}

export interface ExtendedCourse {
  heading: string;
  assignment: string;
  enrolled: string;
}

export interface ExtendedActivity {
  description: string;
  practiceTimes: string;
}

export interface ExtendedView {
  siblings: string[];
  guardians: ExtendedGuardian[];
  courses: ExtendedCourse[];
  activities: ExtendedActivity[];
  emptyMessages: { siblings: string; guardians: string; courses: string; activities: string };
}

/** Reads the expanded row's four sections, as they show on screen. */
export async function readExtendedView(studentsPage: StudentsPage): Promise<ExtendedView> {
  const siblingsSummary = studentsPage.visibleSiblingsSummary();
  const guardiansSummary = studentsPage.visibleGuardiansSummary();
  const coursesSummary = studentsPage.visibleCoursesSummary();
  const activitiesSummary = studentsPage.visibleExtraCurricularsSummary();

  const guardians = await guardiansSummary.locator('.summary__item').evaluateAll((items) =>
    items.map((item) => ({
      heading: item.querySelector('.summary__item-heading')?.textContent ?? '',
      contact: item.querySelector('.summary__item-contact')?.textContent ?? null,
      flags: item.querySelector('.summary__item-flags')?.textContent ?? null,
    })),
  );
  const courses = await coursesSummary.locator('.summary__item').evaluateAll((items) =>
    items.map((item) => ({
      heading: item.querySelector('.summary__item-heading')?.textContent ?? '',
      assignment: item.querySelector('.summary__item-assignment')?.textContent ?? '',
      enrolled: item.querySelector('.summary__item-enrolled')?.textContent ?? '',
    })),
  );
  const activities = await activitiesSummary.locator('.summary__item').evaluateAll((items) =>
    items.map((item) => ({
      description: item.querySelector('.summary__item-heading')?.textContent ?? '',
      practiceTimes: item.querySelector('.summary__item-practice-times')?.textContent ?? '',
    })),
  );

  return {
    siblings: await textsOf(siblingsSummary.locator('.summary__item')),
    guardians,
    courses,
    activities,
    emptyMessages: {
      siblings: (await siblingsSummary.locator('.summary__empty').textContent()) ?? '',
      guardians: (await guardiansSummary.locator('.summary__empty').textContent()) ?? '',
      courses: (await coursesSummary.locator('.summary__empty').textContent()) ?? '',
      activities: (await activitiesSummary.locator('.summary__empty').textContent()) ?? '',
    },
  };
}

/** The width of each given text, measured at the font the line element is set in. */
export async function textWidths(line: Locator, texts: string[]): Promise<number[]> {
  return line.evaluate((element, texts) => {
    const style = getComputedStyle(element);
    const context = document.createElement('canvas').getContext('2d')!;
    context.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    return texts.map((text) => context.measureText(text).width);
  }, texts);
}

/**
 * How many line boxes the first occurrence of `word` inside `line` occupies.
 * A word that lies on one line yields exactly one.
 */
export async function wordLineCount(line: Locator, word: string): Promise<number> {
  return line.evaluate((element, word) => {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode();
    while (node) {
      const start = (node.nodeValue ?? '').indexOf(word);
      if (start >= 0) {
        const range = document.createRange();
        range.setStart(node, start);
        range.setEnd(node, start + word.length);
        return range.getClientRects().length;
      }
      node = walker.nextNode();
    }
    return -1;
  }, word);
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  right: number;
  bottom: number;
}

export async function boxOf(locator: Locator): Promise<Box> {
  const box = await locator.boundingBox();
  expect(box, 'the element must be laid out').not.toBeNull();
  const { x, y, width, height } = box!;
  return { x, y, width, height, right: x + width, bottom: y + height };
}

/** The Print control's three-step use: stub, choose, count. Returns once the stubbed print has been called. */
export async function choosePrint(page: Page, studentsPage: StudentsPage, studentId: string): Promise<void> {
  await stubPrint(page);
  await studentsPage.printButtonOf(studentId).click();
  expect(await printCallCount(page)).toBeGreaterThan(0);
}
