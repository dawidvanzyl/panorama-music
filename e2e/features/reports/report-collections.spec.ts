import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToReportsPage } from '../../fixtures/testUsers';
import type { UserRole } from '../../pages/identity/admin/AdminUsersPage';
import { seedEnrollmentTarget } from '../../fixtures/enrollment';
import {
  fetchLessonStructureId,
  seedCourseOfType,
  enrollExistingStudent,
} from '../../fixtures/waitingList';
import { seedReportStudent, runReportViaApi } from '../../fixtures/reports';
import { addGuardianToStudent, guardianRelationshipIdByName } from '../../fixtures/guardians';
import { seedActivity, assignActivity } from '../../fixtures/extraCurriculars';
import { deactivateTeacher } from '../../fixtures/teachers';
import { ReportBuilderPage } from '../../pages/reports/ReportBuilderPage';
import { ReportResultsPage } from '../../pages/reports/ReportResultsPage';

/**
 * Every scenario mints its own token and uses it as its seeded students'
 * surname, and part of every activity description it creates — plan-qa's
 * scoping convention, which makes every scenario below parallel-safe.
 */
function uniqueToken(prefix = 'Coll'): string {
  return `${prefix}${test.info().workerIndex}${Date.now()}${crypto.randomUUID().slice(0, 6).replace(/-/g, '')}`;
}

async function openBuilder(
  page: Page,
  roles: UserRole[] = ['Teacher']
): Promise<ReportBuilderPage> {
  const reportsPage = await goToReportsPage(page, roles);
  await reportsPage.createReport();
  const builder = new ReportBuilderPage(page);
  await expect(builder.filtersEmptyMessage).toBeVisible();
  return builder;
}

async function runAndGetResults(
  page: Page,
  builder: ReportBuilderPage
): Promise<ReportResultsPage> {
  await builder.runReport();
  const results = new ReportResultsPage(page);
  await expect(page).toHaveURL(/#\/reports\/results$/);
  await expect(results.subline).toBeVisible();
  return results;
}

/** Adds the `Student · Name contains {token}` filter at the given row index. */
async function addNameFilter(
  builder: ReportBuilderPage,
  index: number,
  token: string
): Promise<void> {
  await builder.addFilter();
  await builder.chooseAttribute(index, 'Student · Name');
  await builder.typeTextValue(index, token);
}

async function seedInstrumentCourse(
  page: Page,
  durationType: 'HalfHour' | 'Hour'
): Promise<string> {
  const lessonStructureId = await fetchLessonStructureId(page, {
    occurrenceType: 'DuringSchool',
    lessonType: 'Individual',
    durationType,
  });
  return seedCourseOfType(page, lessonStructureId, 'Instrument');
}

async function seedTheoryCourse(page: Page): Promise<string> {
  const lessonStructureId = await fetchLessonStructureId(page, {
    occurrenceType: 'DuringSchool',
    lessonType: 'Group',
    durationType: 'Hour',
  });
  return seedCourseOfType(page, lessonStructureId, 'Theory');
}

async function fatherRelationshipId(page: Page): Promise<string> {
  return guardianRelationshipIdByName(page, 'Father');
}

// ---------------------------------------------------------------------------
// 11IT8 — Course · Teacher filter
// ---------------------------------------------------------------------------

test.describe('Report Builder — filtering by Course · Teacher', { tag: ['@11IT8'] }, () => {
  async function seedTwoTeacherFixture(page: Page, token: string) {
    const target1 = await seedEnrollmentTarget(page);
    const target2 = await seedEnrollmentTarget(page);

    await seedReportStudent(page, target1, { firstName: 'Ann', lastName: token });
    await seedReportStudent(page, target2, { firstName: 'Ben', lastName: token });
    const caraId = await seedReportStudent(page, target1, { firstName: 'Cara', lastName: token });
    await enrollExistingStudent(page, caraId, {
      courseId: target2.courseId,
      teacherId: target2.teacherId,
    });

    return { target1, target2 };
  }

  test("S1 — Teacher filter returns only that teacher's students", async ({ page }) => {
    const token = uniqueToken();
    const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
    const { target1 } = await seedTwoTeacherFixture(page, token);

    await builder.addFilter();
    await builder.chooseAttribute(0, 'Course · Teacher');
    await builder.selectListValue(0, target1.teacherName);
    await addNameFilter(builder, 1, token);

    const results = await runAndGetResults(page, builder);

    await expect(results.allSections()).toHaveCount(2);
    await expect(results.sectionFor(`Ann ${token}`)).toHaveCount(1);
    await expect(results.sectionFor(`Cara ${token}`)).toHaveCount(1);
    await expect(results.sectionFor(`Ben ${token}`)).toHaveCount(0);
    await expect(results.subline).toContainText(/^2 students/);
  });

  test('S2 — "is any of" two teachers returns the union, each student once', async ({ page }) => {
    const token = uniqueToken();
    const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
    const { target1, target2 } = await seedTwoTeacherFixture(page, token);

    await builder.addFilter();
    await builder.chooseAttribute(0, 'Course · Teacher');
    await builder.chooseOperator(0, 'is any of');
    await builder.tickChecklistOptions(0, [target1.teacherName, target2.teacherName]);
    await builder.closeChecklist();
    await addNameFilter(builder, 1, token);

    const results = await runAndGetResults(page, builder);

    await expect(results.allSections()).toHaveCount(3);
    await expect(results.sectionFor(`Ann ${token}`)).toHaveCount(1);
    await expect(results.sectionFor(`Ben ${token}`)).toHaveCount(1);
    await expect(results.sectionFor(`Cara ${token}`)).toHaveCount(1);
  });

  test('S3 — an inactive teacher is listed with the suffix and still filters', async ({ page }) => {
    const token = uniqueToken();
    const target1 = await seedEnrollmentTarget(page);
    const target2 = await seedEnrollmentTarget(page);
    await seedReportStudent(page, target2, { firstName: 'Ben', lastName: token });

    await goToReportsPage(page, ['Teacher', 'Coordinator', 'BankingCoordinator']);
    await deactivateTeacher(page, target2.teacherId);

    const builder = await openBuilder(page, ['Teacher', 'Coordinator', 'BankingCoordinator']);

    await builder.addFilter();
    await builder.chooseAttribute(0, 'Course · Teacher');
    const options = await builder.filterValueOptions(0);
    expect(options).toContain(target1.teacherName);
    expect(options).toContain(`${target2.teacherName} (inactive)`);

    await builder.selectListValue(0, `${target2.teacherName} (inactive)`);
    await addNameFilter(builder, 1, token);

    const results = await runAndGetResults(page, builder);

    await expect(results.allSections()).toHaveCount(1);
    await expect(results.sectionFor(`Ben ${token}`)).toHaveCount(1);
  });

  test('S4 — a Teacher value that does not exist is refused', async ({ page }) => {
    await goToReportsPage(page, ['Teacher']);

    const { status, body } = await runReportViaApi(page, {
      filters: [{ field: 'course.teacher', operator: 'equals', values: [crypto.randomUUID()] }],
      columns: ['student.name'],
    });

    expect(status).toBe(400);
    expect(body.sections).toBeUndefined();
    expect(body.studentCount).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 11IT9 — Guardian and Extra-Curricular filters combine (AND); attribute grouping
// ---------------------------------------------------------------------------

test.describe(
  'Report Builder — Guardian and Extra-Curricular filters combine',
  { tag: ['@11IT9'] },
  () => {
    test("S1 — both filters must hold, each by any of the student's records", async ({ page }) => {
      const token = uniqueToken();
      const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
      const target = await seedEnrollmentTarget(page);
      const fatherId = await fatherRelationshipId(page);

      const { extraCurricularId } = await seedActivity(page, {
        description: `Choir ${token}`,
        phase: 'Junior',
        practiceTimes: [{ day: 'Monday', startTime: '14:00' }],
      });

      const annId = await seedReportStudent(page, target, { firstName: 'Ann', lastName: token });
      await addGuardianToStudent(page, annId, {
        receivesCorrespondence: true,
        guardianRelationshipId: fatherId,
      });
      await assignActivity(page, annId, extraCurricularId);

      const benId = await seedReportStudent(page, target, { firstName: 'Ben', lastName: token });
      await addGuardianToStudent(page, benId, {
        receivesCorrespondence: true,
        guardianRelationshipId: fatherId,
      });

      const caraId = await seedReportStudent(page, target, { firstName: 'Cara', lastName: token });
      await addGuardianToStudent(page, caraId, {
        receivesCorrespondence: false,
        guardianRelationshipId: fatherId,
      });
      await assignActivity(page, caraId, extraCurricularId);

      const danId = await seedReportStudent(page, target, { firstName: 'Dan', lastName: token });
      await addGuardianToStudent(page, danId, {
        receivesCorrespondence: true,
        guardianRelationshipId: fatherId,
      });
      await addGuardianToStudent(page, danId, {
        receivesCorrespondence: false,
        guardianRelationshipId: fatherId,
      });
      await assignActivity(page, danId, extraCurricularId);

      await builder.addFilter();
      await builder.chooseAttribute(0, 'Guardian · Receives Correspondence');
      await builder.clickBooleanToggle(0, 'Yes');

      await builder.addFilter();
      await builder.chooseAttribute(1, 'Extra-Curricular · Activity');
      await builder.selectListValue(1, `Choir ${token} (Junior)`);

      await addNameFilter(builder, 2, token);

      const results = await runAndGetResults(page, builder);

      await expect(results.allSections()).toHaveCount(2);
      await expect(results.sectionFor(`Ann ${token}`)).toHaveCount(1);
      await expect(results.sectionFor(`Dan ${token}`)).toHaveCount(1);
      await expect(results.sectionFor(`Ben ${token}`)).toHaveCount(0);
      await expect(results.sectionFor(`Cara ${token}`)).toHaveCount(0);
    });

    test("S2 — the attribute dropdown is grouped and each row carries its collection's badge", async ({
      page,
    }) => {
      const builder = await openBuilder(page);

      await builder.addFilter();

      expect(await builder.attributeGroupLabels(0)).toEqual([
        'Student',
        'Guardian',
        'Course',
        'Extra-Curricular',
      ]);
      expect(await builder.attributeGroupOptions(0, 'Guardian')).toEqual([
        'Guardian · Name',
        'Guardian · Relationship',
        'Guardian · Receives Correspondence',
        'Guardian · Responsible For Payment',
        'Guardian · Married',
      ]);
      expect(await builder.attributeGroupOptions(0, 'Course')).toEqual([
        'Course · Course Type',
        'Course · Lesson Type',
        'Course · Duration',
        'Course · Occurrence',
        'Course · Instrument Type',
        'Course · Step Type',
        'Course · Teacher',
      ]);
      expect(await builder.attributeGroupOptions(0, 'Extra-Curricular')).toEqual([
        'Extra-Curricular · Activity',
        'Extra-Curricular · Phase',
      ]);

      await builder.chooseAttribute(0, 'Guardian · Married');
      await expect(builder.filterRowBadge(0)).toHaveText('GRD');

      await builder.chooseAttribute(0, 'Course · Course Type');
      await expect(builder.filterRowBadge(0)).toHaveText('CRS');

      await builder.chooseAttribute(0, 'Extra-Curricular · Phase');
      await expect(builder.filterRowBadge(0)).toHaveText('ECA');

      await builder.chooseAttribute(0, 'Student · Grade');
      await expect(builder.filterRowBadge(0)).toHaveText('STU');

      const optionTexts = await builder.attributeDropdownOptions(0).allTextContents();
      expect(optionTexts.join(' ').toLowerCase()).not.toMatch(/bank|account|branch/);
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT11 — ten columns ticked: availability
// ---------------------------------------------------------------------------

test.describe(
  'Report Builder — at ten columns every unticked column is unavailable',
  { tag: ['@11IT11'] },
  () => {
    test('S1 — at ten, every unticked column is unavailable; unticking one frees them all', async ({
      page,
    }) => {
      const builder = await openBuilder(page);

      await expect(builder.columnsCounter).toHaveText('1 / 10');

      await builder.tickColumnByKey('student.class');
      await builder.tickColumnByKey('student.language');
      await builder.tickColumnByKey('student.dateOfBirth');
      await builder.tickColumnByKey('guardian.cell');
      await builder.tickColumnByKey('course.courseType');
      await builder.tickColumnByKey('course.teacher');
      await builder.tickColumnByKey('extraCurricular.phase');

      await expect(builder.columnsCounter).toHaveText('10 / 10');

      const unavailable = [
        'student.phase',
        'student.hasSiblings',
        'student.numberOfSiblings',
        'student.isEldest',
        'guardian.email',
        'guardian.receivesCorrespondence',
        'guardian.responsibleForPayment',
        'guardian.married',
        'course.lessonType',
        'course.durationType',
        'course.occurrenceType',
        'course.instrumentType',
        'course.stepType',
        'extraCurricular.practiceTimes',
      ];
      for (const key of unavailable) {
        expect(await builder.isColumnUnavailable(key)).toBe(true);
      }

      await builder.tickColumnByKey('guardian.married');
      await expect(builder.columnsCounter).toHaveText('10 / 10');
      expect(await builder.isColumnTicked('guardian.married')).toBe(false);

      await builder.tickColumnByKey('student.class');
      await expect(builder.columnsCounter).toHaveText('9 / 10');

      for (const key of unavailable) {
        expect(await builder.isColumnUnavailable(key)).toBe(false);
      }

      await builder.tickColumnByKey('guardian.email');
      await expect(builder.columnsCounter).toHaveText('10 / 10');
    });

    test('S2 — at nine, a dependant whose anchor is unticked is unavailable (boundary, P4)', async ({
      page,
    }) => {
      const builder = await openBuilder(page);

      for (const key of [
        'student.class',
        'student.phase',
        'student.language',
        'student.dateOfBirth',
        'student.hasSiblings',
        'student.numberOfSiblings',
        'student.isEldest',
        'course.courseType',
      ]) {
        await builder.tickColumnByKey(key);
      }
      await expect(builder.columnsCounter).toHaveText('9 / 10');

      for (const key of [
        'guardian.name',
        'extraCurricular.activity',
        'course.lessonType',
        'course.durationType',
        'course.occurrenceType',
        'course.teacher',
        'course.instrumentType',
        'course.stepType',
      ]) {
        expect(await builder.isColumnUnavailable(key)).toBe(false);
      }
      for (const key of [
        'guardian.cell',
        'guardian.email',
        'guardian.receivesCorrespondence',
        'guardian.responsibleForPayment',
        'guardian.married',
        'extraCurricular.phase',
        'extraCurricular.practiceTimes',
      ]) {
        expect(await builder.isColumnUnavailable(key)).toBe(true);
      }

      await builder.tickColumnByKey('guardian.name');
      await expect(builder.columnsCounter).toHaveText('10 / 10');
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT13 — student-level cells first row only; collection values repeat
// ---------------------------------------------------------------------------

test.describe(
  'Report Builder — student-level cells on row one only, collection values repeat',
  { tag: ['@11IT13'] },
  () => {
    test('S1 — two guardians and two Instrument courses: two rows, blank student cells on row two', async ({
      page,
    }) => {
      const token = uniqueToken();
      const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
      const target = await seedEnrollmentTarget(page);
      const fatherId = await fatherRelationshipId(page);
      const pianoCourseId = await seedInstrumentCourse(page, 'HalfHour');
      const guitarCourseId = await seedInstrumentCourse(page, 'Hour');

      const amyId = await seedReportStudent(page, target, {
        firstName: 'Amy',
        lastName: token,
        grade: 'Grade4',
        class: 'A1',
        enrolments: [
          {
            courseId: pianoCourseId,
            teacherId: target.teacherId,
            instrumentType: 'Piano',
            stepType: 'Step1A',
          },
          {
            courseId: guitarCourseId,
            teacherId: target.teacherId,
            instrumentType: 'Guitar',
            stepType: 'Step2A',
          },
        ],
      });
      const g1 = await addGuardianToStudent(page, amyId, {
        firstName: 'G1',
        surname: token,
        guardianRelationshipId: fatherId,
      });
      const g2 = await addGuardianToStudent(page, amyId, {
        firstName: 'G2',
        surname: token,
        guardianRelationshipId: fatherId,
      });

      await builder.tickColumnByKey('student.class');
      await builder.tickColumnByKey('guardian.name');
      await builder.tickColumnByKey('course.courseType');
      await addNameFilter(builder, 0, token);

      const results = await runAndGetResults(page, builder);

      await expect(results.headers()).toHaveText(['Student', 'Class', 'Guardian', 'Course Type']);

      const rows = results.sectionRows(`Amy ${token}`);
      await expect(rows).toHaveCount(2);

      const row1 = results.cells(rows.nth(0));
      const row2 = results.cells(rows.nth(1));
      await expect(row1.nth(0)).toHaveText(`Amy ${token}`);
      await expect(row1.nth(1)).toHaveText('4A1');
      await expect(row1.nth(3)).toHaveText('Instrument');
      await expect(row2.nth(0)).toHaveText('');
      await expect(row2.nth(1)).toHaveText('');
      await expect(row2.nth(3)).toHaveText('Instrument');

      const guardianCells = [await row1.nth(2).textContent(), await row2.nth(2).textContent()];
      expect(guardianCells.sort()).toEqual(
        [`${g1.fullName} · Father`, `${g2.fullName} · Father`].sort()
      );
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT14 — no guardians, two courses: blank guardian cells
// ---------------------------------------------------------------------------

test.describe(
  'Report Builder — a student with no guardians has blank Guardian cells',
  { tag: ['@11IT14'] },
  () => {
    test('S1 — two courses, no guardians: two rows, blank guardian cells', async ({ page }) => {
      const token = uniqueToken();
      const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
      const target = await seedEnrollmentTarget(page);
      const theoryCourseId = await seedTheoryCourse(page);

      await seedReportStudent(page, target, {
        firstName: 'Bo',
        lastName: token,
        enrolments: [
          { courseId: target.courseId, teacherId: target.teacherId },
          { courseId: theoryCourseId, teacherId: target.teacherId, stepType: 'Step1A' },
        ],
      });

      await builder.tickColumnByKey('guardian.name');
      await builder.tickColumnByKey('course.courseType');
      await addNameFilter(builder, 0, token);

      const results = await runAndGetResults(page, builder);

      const rows = results.sectionRows(`Bo ${token}`);
      await expect(rows).toHaveCount(2);
      const row1 = results.cells(rows.nth(0));
      const row2 = results.cells(rows.nth(1));
      await expect(row1.nth(0)).toHaveText(`Bo ${token}`);
      await expect(row1.nth(1)).toHaveText('');
      await expect(row2.nth(0)).toHaveText('');
      await expect(row2.nth(1)).toHaveText('');
      const courseTypeTexts = [await row1.nth(2).textContent(), await row2.nth(2).textContent()];
      expect(courseTypeTexts).toEqual(['Theory', 'Grade 2 Recorder']);
    });

    test('S2 — boundary: one course, no guardians, still one row', async ({ page }) => {
      const token = uniqueToken();
      const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
      const target = await seedEnrollmentTarget(page);

      await seedReportStudent(page, target, {
        firstName: 'Cy',
        lastName: token,
        enrolments: [{ courseId: target.courseId, teacherId: target.teacherId }],
      });

      await builder.tickColumnByKey('guardian.name');
      await builder.tickColumnByKey('course.courseType');
      await addNameFilter(builder, 0, token);

      const results = await runAndGetResults(page, builder);

      const rows = results.sectionRows(`Cy ${token}`);
      await expect(rows).toHaveCount(1);
      const cells = results.cells(rows.nth(0));
      await expect(cells.nth(0)).toHaveText(`Cy ${token}`);
      await expect(cells.nth(1)).toHaveText('');
      await expect(cells.nth(2)).toHaveText('Grade 2 Recorder');
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT15 — ticking a dependant ticks its anchor; unticking the anchor unticks it
// ---------------------------------------------------------------------------

test.describe(
  'Report Builder — a dependant column ticks and unticks with its anchor',
  { tag: ['@11IT15'] },
  () => {
    test('S1 — ticking a dependant ticks its anchor; unticking the anchor unticks it', async ({
      page,
    }) => {
      const builder = await openBuilder(page);
      await expect(builder.columnsCounter).toHaveText('1 / 10');

      await builder.tickColumnByKey('guardian.cell');
      expect(await builder.isColumnTicked('guardian.name')).toBe(true);
      expect(await builder.isColumnTicked('guardian.cell')).toBe(true);
      await expect(builder.columnsCounter).toHaveText('3 / 10');

      await builder.tickColumnByKey('guardian.name');
      expect(await builder.isColumnTicked('guardian.name')).toBe(false);
      expect(await builder.isColumnTicked('guardian.cell')).toBe(false);
      await expect(builder.columnsCounter).toHaveText('1 / 10');
    });

    test('S2 — unticking a dependant leaves its anchor; Course columns have no anchor', async ({
      page,
    }) => {
      const builder = await openBuilder(page);

      await builder.tickColumnByKey('guardian.cell');
      await expect(builder.columnsCounter).toHaveText('3 / 10');

      await builder.tickColumnByKey('guardian.cell');
      expect(await builder.isColumnTicked('guardian.name')).toBe(true);
      await expect(builder.columnsCounter).toHaveText('2 / 10');

      await builder.tickColumnByKey('course.teacher');
      await expect(builder.columnsCounter).toHaveText('3 / 10');
      for (const key of [
        'course.courseType',
        'course.lessonType',
        'course.durationType',
        'course.occurrenceType',
        'course.instrumentType',
        'course.stepType',
      ]) {
        expect(await builder.isColumnTicked(key)).toBe(false);
      }
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT33 — filter/project independence: Guardian · Married
// ---------------------------------------------------------------------------

test.describe(
  'Report Builder — a Guardian · Married filter includes the student once with every guardian listed',
  { tag: ['@11IT33'] },
  () => {
    test('S1 — one matching guardian includes the student once, with every guardian listed', async ({
      page,
    }) => {
      const token = uniqueToken();
      const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
      const target = await seedEnrollmentTarget(page);
      const fatherId = await fatherRelationshipId(page);

      const eveId = await seedReportStudent(page, target, { firstName: 'Eve', lastName: token });
      const g1 = await addGuardianToStudent(page, eveId, {
        firstName: 'G1',
        surname: token,
        married: true,
        guardianRelationshipId: fatherId,
      });
      const g2 = await addGuardianToStudent(page, eveId, {
        firstName: 'G2',
        surname: token,
        married: false,
        guardianRelationshipId: fatherId,
      });

      const fayId = await seedReportStudent(page, target, { firstName: 'Fay', lastName: token });
      await addGuardianToStudent(page, fayId, { married: false, guardianRelationshipId: fatherId });

      await builder.addFilter();
      await builder.chooseAttribute(0, 'Guardian · Married');
      await builder.clickBooleanToggle(0, 'Yes');
      await addNameFilter(builder, 1, token);
      await builder.tickColumnByKey('guardian.name');

      const results = await runAndGetResults(page, builder);

      await expect(results.allSections()).toHaveCount(1);
      await expect(results.sectionFor(`Eve ${token}`)).toHaveCount(1);
      await expect(results.sectionFor(`Fay ${token}`)).toHaveCount(0);

      const rows = results.sectionRows(`Eve ${token}`);
      await expect(rows).toHaveCount(2);
      const guardianCells = [
        await results.cells(rows.nth(0)).nth(1).textContent(),
        await results.cells(rows.nth(1)).nth(1).textContent(),
      ];
      expect(guardianCells.sort()).toEqual(
        [`${g1.fullName} · Father`, `${g2.fullName} · Father`].sort()
      );
      await expect(results.subline).toContainText(/^1 student/);
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT34 — filter/project independence: Guardian and Course Type together
// ---------------------------------------------------------------------------

test.describe(
  'Report Builder — two guardians and three courses zip into three rows, not six',
  { tag: ['@11IT34'] },
  () => {
    test('S1 — two guardians x three courses zip into three rows', async ({ page }) => {
      const token = uniqueToken();
      const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
      const target = await seedEnrollmentTarget(page);
      const fatherId = await fatherRelationshipId(page);
      const theoryCourseId = await seedTheoryCourse(page);
      const pianoCourseId = await seedInstrumentCourse(page, 'HalfHour');

      const gusId = await seedReportStudent(page, target, {
        firstName: 'Gus',
        lastName: token,
        enrolments: [
          { courseId: target.courseId, teacherId: target.teacherId },
          { courseId: theoryCourseId, teacherId: target.teacherId, stepType: 'Step1A' },
          {
            courseId: pianoCourseId,
            teacherId: target.teacherId,
            instrumentType: 'Piano',
            stepType: 'Step1A',
          },
        ],
      });
      await addGuardianToStudent(page, gusId, {
        firstName: 'G1',
        surname: token,
        guardianRelationshipId: fatherId,
      });
      await addGuardianToStudent(page, gusId, {
        firstName: 'G2',
        surname: token,
        guardianRelationshipId: fatherId,
      });

      await builder.tickColumnByKey('guardian.name');
      await builder.tickColumnByKey('course.courseType');
      await addNameFilter(builder, 0, token);

      const results = await runAndGetResults(page, builder);

      await expect(results.allSections()).toHaveCount(1);
      const rows = results.sectionRows(`Gus ${token}`);
      await expect(rows).toHaveCount(3);

      const guardianCells = [
        await results.cells(rows.nth(0)).nth(1).textContent(),
        await results.cells(rows.nth(1)).nth(1).textContent(),
        await results.cells(rows.nth(2)).nth(1).textContent(),
      ];
      expect(guardianCells.slice(0, 2).every((c) => c && c.includes(`${token} · Father`))).toBe(
        true
      );
      expect(guardianCells[2]).toBe('');

      const courseTypeCells = [
        await results.cells(rows.nth(0)).nth(2).textContent(),
        await results.cells(rows.nth(1)).nth(2).textContent(),
        await results.cells(rows.nth(2)).nth(2).textContent(),
      ];
      expect(courseTypeCells).toEqual(['Theory', 'Grade 2 Recorder', 'Instrument']);
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT35 — filter/project independence: Course Type filter, Course Type projected
// ---------------------------------------------------------------------------

test.describe(
  'Report Builder — a Course Type filter includes the student once with every course listed',
  { tag: ['@11IT35'] },
  () => {
    test('S1 — the filter selects the student; the projection lists all their courses', async ({
      page,
    }) => {
      const token = uniqueToken();
      const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
      const target = await seedEnrollmentTarget(page);
      const theoryCourseId = await seedTheoryCourse(page);
      const guitarCourseId = await seedInstrumentCourse(page, 'Hour');
      const pianoCourseId = await seedInstrumentCourse(page, 'HalfHour');

      await seedReportStudent(page, target, {
        firstName: 'Hal',
        lastName: token,
        enrolments: [
          { courseId: theoryCourseId, teacherId: target.teacherId, stepType: 'Step2A' },
          {
            courseId: guitarCourseId,
            teacherId: target.teacherId,
            instrumentType: 'Guitar',
            stepType: 'Step2A',
          },
        ],
      });
      await seedReportStudent(page, target, {
        firstName: 'Ida',
        lastName: token,
        enrolments: [
          {
            courseId: pianoCourseId,
            teacherId: target.teacherId,
            instrumentType: 'Piano',
            stepType: 'Step1A',
          },
        ],
      });

      await builder.addFilter();
      await builder.chooseAttribute(0, 'Course · Course Type');
      await builder.selectListValue(0, 'Theory');
      await addNameFilter(builder, 1, token);
      await builder.tickColumnByKey('course.courseType');

      const results = await runAndGetResults(page, builder);

      await expect(results.allSections()).toHaveCount(1);
      await expect(results.sectionFor(`Hal ${token}`)).toHaveCount(1);
      await expect(results.sectionFor(`Ida ${token}`)).toHaveCount(0);

      const rows = results.sectionRows(`Hal ${token}`);
      await expect(rows).toHaveCount(2);
      await expect(results.cells(rows.nth(0)).nth(1)).toHaveText('Theory');
      await expect(results.cells(rows.nth(1)).nth(1)).toHaveText('Instrument');
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT36 — an unprojected collection filter never multiplies rows
// ---------------------------------------------------------------------------

test.describe(
  'Report Builder — an Extra-Curricular filter selects students without multiplying rows',
  { tag: ['@11IT36'] },
  () => {
    async function seedActivityFixture(page: Page, token: string) {
      const target = await seedEnrollmentTarget(page);
      const x = await seedActivity(page, {
        description: `Band ${token}`,
        phase: 'Junior',
        practiceTimes: [{ day: 'Monday', startTime: '14:00' }],
      });
      const y = await seedActivity(page, {
        description: `Art ${token}`,
        phase: 'Junior',
        practiceTimes: [{ day: 'Tuesday', startTime: '15:00' }],
      });

      const joId = await seedReportStudent(page, target, { firstName: 'Jo', lastName: token });
      await assignActivity(page, joId, x.extraCurricularId);
      await assignActivity(page, joId, y.extraCurricularId);

      const kimId = await seedReportStudent(page, target, { firstName: 'Kim', lastName: token });
      await assignActivity(page, kimId, x.extraCurricularId);

      const leeId = await seedReportStudent(page, target, { firstName: 'Lee', lastName: token });
      await assignActivity(page, leeId, y.extraCurricularId);

      await seedReportStudent(page, target, { firstName: 'Max', lastName: token });

      return { x, y };
    }

    test('S1 — an unprojected collection filter never multiplies rows', async ({ page }) => {
      const token = uniqueToken();
      const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
      await seedActivityFixture(page, token);

      await builder.addFilter();
      await builder.chooseAttribute(0, 'Extra-Curricular · Activity');
      await builder.selectListValue(0, `Band ${token} (Junior)`);
      await addNameFilter(builder, 1, token);
      await builder.tickColumnByKey('student.class');

      const results = await runAndGetResults(page, builder);

      await expect(results.allSections()).toHaveCount(2);
      await expect(results.sectionFor(`Jo ${token}`)).toHaveCount(1);
      await expect(results.sectionFor(`Kim ${token}`)).toHaveCount(1);
      await expect(results.sectionRows(`Jo ${token}`)).toHaveCount(1);
      await expect(results.sectionRows(`Kim ${token}`)).toHaveCount(1);
      await expect(results.sectionFor(`Lee ${token}`)).toHaveCount(0);
      await expect(results.sectionFor(`Max ${token}`)).toHaveCount(0);
      await expect(results.subline).toContainText(/^2 students/);
    });

    test('S2 — contrast: projecting the collection lists every activity, whatever the filter', async ({
      page,
    }) => {
      const token = uniqueToken();
      const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
      await seedActivityFixture(page, token);

      await builder.addFilter();
      await builder.chooseAttribute(0, 'Extra-Curricular · Activity');
      await builder.selectListValue(0, `Band ${token} (Junior)`);
      await addNameFilter(builder, 1, token);
      await builder.tickColumnByKey('student.class');
      await builder.tickColumnByKey('extraCurricular.activity');

      const results = await runAndGetResults(page, builder);

      const joRows = results.sectionRows(`Jo ${token}`);
      await expect(joRows).toHaveCount(2);
      const joActivities = [
        await results.cells(joRows.nth(0)).last().textContent(),
        await results.cells(joRows.nth(1)).last().textContent(),
      ];
      expect(joActivities).toEqual([`Art ${token}`, `Band ${token}`]);

      const kimRows = results.sectionRows(`Kim ${token}`);
      await expect(kimRows).toHaveCount(1);
      await expect(results.cells(kimRows.nth(0)).last()).toHaveText(`Band ${token}`);
    });
  }
);
