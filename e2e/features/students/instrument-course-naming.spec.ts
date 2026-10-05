import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { loginAsRoles } from '../../fixtures/testUsers';
import { seedEnrollmentTarget } from '../../fixtures/enrollment';
import {
  ensureCourseOfType,
  fetchLessonStructureId,
  type DurationType,
  type LessonType,
  type OccurrenceType,
} from '../../fixtures/waitingList';
import { StudentsPage } from '../../pages/students/StudentsPage';

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

const INSTRUMENT_COURSE = 'Instrument · Individual · Half Hour · During School';
const THEORY_COURSE = 'Theory · Group · Hour · After School';

async function ensureCourse(
  page: Page,
  courseType: string,
  lessonType: LessonType,
  durationType: DurationType,
  occurrenceType: OccurrenceType,
): Promise<void> {
  const lessonStructureId = await fetchLessonStructureId(page, { occurrenceType, lessonType, durationType });
  await ensureCourseOfType(page, lessonStructureId, courseType);
}

/**
 * Both roles on the one account: Coordinator seeds teachers and courses,
 * Teacher opens Students. The reload lets the enroll form, which fetches its
 * course and teacher lookups once on mount, see the just-seeded data.
 */
async function openStudentsWithCourses(page: Page) {
  await loginAsRoles(page, ['Teacher', 'Coordinator']);
  const target = await seedEnrollmentTarget(page);
  await ensureCourse(page, 'Instrument', 'Individual', 'HalfHour', 'DuringSchool');
  await ensureCourse(page, 'Theory', 'Group', 'Hour', 'AfterSchool');
  await page.reload();

  const studentsPage = new StudentsPage(page);
  await studentsPage.gotoStudents();
  return { studentsPage, target };
}

function cards(studentsPage: StudentsPage) {
  return studentsPage.visibleCoursesSummary().locator('.summary__item');
}

function headingOf(card: ReturnType<typeof cards>) {
  return card.locator('.summary__item-heading');
}

function assignmentOf(card: ReturnType<typeof cards>) {
  return card.locator('.summary__item-assignment');
}

test.describe('Extended view — an instrument course is named by its instrument', { tag: ['@340IT52'] }, () => {
  test('names a Piano course by its instrument over the teacher and step', async ({ page }) => {
    const { studentsPage, target } = await openStudentsWithCourses(page);
    const surname = uniqueSurname('Piano');

    await studentsPage.createStudent(
      { firstName: 'Amara', lastName: surname, ...studentDefaults },
      {
        courseLabel: INSTRUMENT_COURSE,
        teacherName: target.teacherName,
        instrumentLabel: 'Piano',
        stepLabel: '3A',
        enrolledDate: '2026-03-11',
      },
    );
    await expect(studentsPage.row(surname)).toBeVisible();

    await studentsPage.toggleRowExpanded(surname);

    const all = cards(studentsPage);
    await expect(all).toHaveCount(1);
    await expect(headingOf(all)).toHaveText('Piano · Individual · Half Hour · During School');
    await expect(assignmentOf(all)).toHaveText(`${target.teacherName} · Step 3A`);
    await expect(all.locator('.summary__item-enrolled')).toHaveText('Enrolled 2026-03-11');
    await expect(
      all.filter({ has: page.locator('.summary__item-heading', { hasText: /^Instrument · / }) }),
    ).toHaveCount(0);
  });

  test('names the course by the enrollment own instrument, read back from the record', async ({ page }) => {
    const { studentsPage, target } = await openStudentsWithCourses(page);
    const surname = uniqueSurname('Guitar');

    await studentsPage.createStudent(
      { firstName: 'Thabo', lastName: surname, ...studentDefaults },
      {
        courseLabel: INSTRUMENT_COURSE,
        teacherName: target.teacherName,
        instrumentLabel: 'Piano',
        stepLabel: '3A',
      },
    );
    await expect(studentsPage.row(surname)).toBeVisible();

    await studentsPage.openCoursesTab(surname);
    await studentsPage.editEnrollment(INSTRUMENT_COURSE, { instrumentLabel: 'Guitar' });
    await expect(studentsPage.enrollmentListRow(INSTRUMENT_COURSE).locator('td').nth(2)).toHaveText('Guitar');
    await studentsPage.closeWizard();

    await page.reload();
    await studentsPage.gotoStudents();
    await studentsPage.toggleRowExpanded(surname);

    const all = cards(studentsPage);
    await expect(all).toHaveCount(1);
    await expect(headingOf(all)).toHaveText('Guitar · Individual · Half Hour · During School');
    await expect(assignmentOf(all)).toHaveText(`${target.teacherName} · Step 3A`);
  });
});

test.describe('Extended view — other course types keep their course-type name', { tag: ['@340IT53'] }, () => {
  test('keeps the Theory course type as the name over the teacher and step', async ({ page }) => {
    const { studentsPage, target } = await openStudentsWithCourses(page);
    const surname = uniqueSurname('Theory');

    await studentsPage.createStudent(
      { firstName: 'Lerato', lastName: surname, ...studentDefaults },
      { courseLabel: THEORY_COURSE, teacherName: target.teacherName, stepLabel: '3B' },
    );
    await expect(studentsPage.row(surname)).toBeVisible();

    await studentsPage.toggleRowExpanded(surname);

    const all = cards(studentsPage);
    await expect(all).toHaveCount(1);
    await expect(headingOf(all)).toHaveText('Theory · Group · Hour · After School');
    await expect(assignmentOf(all)).toHaveText(`${target.teacherName} · Step 3B`);
  });

  test('shows Theory beside an instrument course', async ({ page }) => {
    const { studentsPage, target } = await openStudentsWithCourses(page);
    const surname = uniqueSurname('Both');

    await studentsPage.createStudent(
      { firstName: 'Naledi', lastName: surname, ...studentDefaults },
      {
        courseLabel: INSTRUMENT_COURSE,
        teacherName: target.teacherName,
        instrumentLabel: 'Piano',
        stepLabel: '3A',
      },
    );
    await expect(studentsPage.row(surname)).toBeVisible();

    await studentsPage.openCoursesTab(surname);
    await studentsPage.enrollInCourse({
      courseLabel: THEORY_COURSE,
      teacherName: target.teacherName,
      stepLabel: '2A',
    });
    await expect(studentsPage.enrollmentListRow(THEORY_COURSE)).toBeVisible();
    await studentsPage.closeWizard();

    await studentsPage.toggleRowExpanded(surname);

    const all = cards(studentsPage);
    await expect(all).toHaveCount(2);
    const piano = all.filter({ has: page.locator('.summary__item-heading', { hasText: /^Piano · / }) });
    const theory = all.filter({ has: page.locator('.summary__item-heading', { hasText: /^Theory · / }) });
    await expect(headingOf(piano)).toHaveText('Piano · Individual · Half Hour · During School');
    await expect(assignmentOf(piano)).toHaveText(`${target.teacherName} · Step 3A`);
    await expect(headingOf(theory)).toHaveText('Theory · Group · Hour · After School');
    await expect(assignmentOf(theory)).toHaveText(`${target.teacherName} · Step 2A`);
    await expect(
      all.filter({ has: page.locator('.summary__item-heading', { hasText: /^Instrument · / }) }),
    ).toHaveCount(0);
  });

  test('leaves a course type that records neither instrument nor step unchanged', async ({ page }) => {
    const { studentsPage, target } = await openStudentsWithCourses(page);
    const surname = uniqueSurname('Recorder');

    await studentsPage.createStudent(
      { firstName: 'Kagiso', lastName: surname, ...studentDefaults },
      { courseLabel: target.courseLabel, teacherName: target.teacherName },
    );
    await expect(studentsPage.row(surname)).toBeVisible();

    await studentsPage.toggleRowExpanded(surname);

    const all = cards(studentsPage);
    await expect(all).toHaveCount(1);
    await expect(headingOf(all)).toHaveText('Grade 2 Recorder · Group · Half Hour · During School');
    await expect(assignmentOf(all)).toHaveText(target.teacherName);
  });
});
