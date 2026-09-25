import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToReportsPage, loginAsRoles } from '../../fixtures/testUsers';
import type { UserRole } from '../../pages/identity/admin/AdminUsersPage';
import { seedEnrollmentTarget, type SeededEnrollmentTarget } from '../../fixtures/enrollment';
import { seedWaitingListEntry, fetchAnyLessonStructureId } from '../../fixtures/waitingList';
import { insertWaitingListEntry } from '../../fixtures/db';
import { linkSiblings } from '../../fixtures/siblings';
import { landingUrl, sidebarEntry, SIDEBAR_ENTRIES } from '../../fixtures/navigation';
import {
  seedReportStudent,
  fetchReportFields,
  runReportViaApi,
  saveReportViaApi,
} from '../../fixtures/reports';
import { ReportsPage } from '../../pages/reports/ReportsPage';
import { ReportBuilderPage } from '../../pages/reports/ReportBuilderPage';
import { ReportResultsPage } from '../../pages/reports/ReportResultsPage';

/**
 * The QA database is shared and filled in parallel, so every scenario mints
 * its own token and uses it as its seeded students' surname, per the plan's
 * scoping convention.
 */
function uniqueToken(prefix = 'Rpt'): string {
  return `${prefix}${test.info().workerIndex}${Date.now()}${crypto.randomUUID().slice(0, 6).replace(/-/g, '')}`;
}

/** A date of birth from 2012 to 2019, to keep 11IT4's "Amy van Zyl" runs apart. */
function randomDobBetween2012And2019(): string {
  const year = 2012 + (Date.now() % 8);
  const month = String(1 + (Date.now() % 12)).padStart(2, '0');
  const day = String(1 + (Date.now() % 27)).padStart(2, '0');
  return `${year}-${month}-${day}`;
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

// ---------------------------------------------------------------------------
// 11IT1 — Grade `in` filter
// ---------------------------------------------------------------------------

test.describe(
  'Report Builder — filtering by Grade with the in operator',
  { tag: ['@11IT1'] },
  () => {
    test('Grade in [Grade 4, Grade 5] returns exactly those grades, A to Z', async ({ page }) => {
      const token = uniqueToken();
      const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
      const target = await seedEnrollmentTarget(page);

      await seedReportStudent(page, target, {
        firstName: 'Zoe',
        lastName: token,
        grade: 'Grade4',
        class: 'A1',
      });
      await seedReportStudent(page, target, {
        firstName: 'Adam',
        lastName: token,
        grade: 'Grade4',
        class: 'A2',
      });
      await seedReportStudent(page, target, {
        firstName: 'Bella',
        lastName: token,
        grade: 'Grade5',
        class: 'E1',
      });
      await seedReportStudent(page, target, {
        firstName: 'Carl',
        lastName: token,
        grade: 'Grade3',
      });
      await seedReportStudent(page, target, {
        firstName: 'Dina',
        lastName: token,
        grade: 'Grade6',
      });
      await seedWaitingListEntry(page, { occurrenceType: 'AfterSchool', lastName: token });

      await builder.addFilter();
      await builder.chooseAttribute(0, 'Student · Grade');
      await builder.chooseOperator(0, 'is any of');
      await builder.tickChecklistOptions(0, ['Grade 4', 'Grade 5']);
      await builder.closeChecklist();

      await builder.addFilter();
      await builder.chooseAttribute(1, 'Student · Name');
      await builder.typeTextValue(1, token);

      const results = await runAndGetResults(page, builder);

      await expect(results.allSections()).toHaveCount(3);
      const names = await results.allSections().allTextContents();
      expect(names[0]).toContain(`Adam ${token}`);
      expect(names[1]).toContain(`Bella ${token}`);
      expect(names[2]).toContain(`Zoe ${token}`);
      await expect(results.sectionFor(`Carl ${token}`)).toHaveCount(0);
      await expect(results.sectionFor(`Dina ${token}`)).toHaveCount(0);
      await expect(results.sectionFor(`Waiting ${token}`)).toHaveCount(0);
      await expect(results.subline).toContainText(/^3 students/);
    });

    test('the in value control shows the chosen labels', async ({ page }) => {
      const builder = await openBuilder(page);

      await builder.addFilter();
      await builder.chooseAttribute(0, 'Student · Grade');
      await builder.chooseOperator(0, 'is any of');
      await builder.tickChecklistOptions(0, ['Grade 4', 'Grade 5']);
      await builder.closeChecklist();

      await expect(builder.checklistToggle(0)).toHaveText('Grade 4 · Grade 5');
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT2 — no filters shows every enrolled student
// ---------------------------------------------------------------------------

test.describe(
  'Report Builder — no filters includes every enrolled student',
  { tag: ['@11IT2'] },
  () => {
    test('enrolled students appear, waiting-list-only ones do not', async ({ page }) => {
      const token = uniqueToken();
      const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
      const target = await seedEnrollmentTarget(page);

      await seedReportStudent(page, target, {
        firstName: 'Amara',
        lastName: token,
        grade: 'Grade2',
      });
      await seedReportStudent(page, target, {
        firstName: 'Pieter',
        lastName: token,
        grade: 'Private',
      });
      await seedWaitingListEntry(page, { occurrenceType: 'AfterSchool', lastName: token });

      await expect(builder.filtersEmptyMessage).toHaveText(
        'No filters applied — all students will appear.'
      );

      const results = await runAndGetResults(page, builder);

      await expect(results.sectionFor(`Amara ${token}`)).toHaveCount(1);
      await expect(results.sectionFor(`Pieter ${token}`)).toHaveCount(1);
      await expect(results.sectionFor(`Waiting ${token}`)).toHaveCount(0);

      const subline = (await results.subline.textContent())!;
      const expectedCount = await results.allSections().count();
      expect(subline).toMatch(new RegExp(`^${expectedCount} students?`));
    });

    test('a student with both a waiting-list entry and a course enrolment counts as enrolled', async ({
      page,
    }) => {
      const token = uniqueToken();
      const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
      const target = await seedEnrollmentTarget(page);

      const studentId = await seedReportStudent(page, target, {
        firstName: 'Both',
        lastName: token,
      });
      const lessonStructureId = await fetchAnyLessonStructureId(page);
      await insertWaitingListEntry({ studentId, lessonStructureId, instrumentType: 'Piano' });

      const results = await runAndGetResults(page, builder);

      await expect(results.sectionFor(`Both ${token}`)).toHaveCount(1);
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT3 — Has Sibling boolean filter
// ---------------------------------------------------------------------------

test.describe('Report Builder — filtering by Has Sibling', { tag: ['@11IT3'] }, () => {
  async function seedSiblingFixture(page: Page, token: string, otherToken: string) {
    const target = await seedEnrollmentTarget(page);
    const annaId = await seedReportStudent(page, target, { firstName: 'Anna', lastName: token });
    const benId = await seedReportStudent(page, target, { firstName: 'Ben', lastName: token });
    await seedReportStudent(page, target, { firstName: 'Cara', lastName: token });
    const dirkId = await seedReportStudent(page, target, { firstName: 'Dirk', lastName: token });
    const eveId = await seedReportStudent(page, target, { firstName: 'Eve', lastName: otherToken });

    await linkSiblings(page, annaId, benId);
    await linkSiblings(page, dirkId, eveId);
  }

  test('Has Sibling = Yes returns only linked students', async ({ page }) => {
    const token = uniqueToken();
    const otherToken = uniqueToken('Rpt2');
    const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
    await seedSiblingFixture(page, token, otherToken);

    await builder.addFilter();
    await builder.chooseAttribute(0, 'Student · Has Sibling');
    await expect(builder.operatorControl(0)).toBeHidden();
    await expect(builder.booleanToggleButton(0, 'Yes')).toHaveClass(
      /filter-row__toggle-option--active/
    );
    await builder.clickBooleanToggle(0, 'Yes');

    await builder.addFilter();
    await builder.chooseAttribute(1, 'Student · Name');
    await builder.typeTextValue(1, token);

    const results = await runAndGetResults(page, builder);

    await expect(results.sectionFor(`Anna ${token}`)).toHaveCount(1);
    await expect(results.sectionFor(`Ben ${token}`)).toHaveCount(1);
    await expect(results.sectionFor(`Dirk ${token}`)).toHaveCount(1);
    await expect(results.sectionFor(`Cara ${token}`)).toHaveCount(0);
    await expect(results.sectionFor(`Eve ${otherToken}`)).toHaveCount(0);
  });

  test('the No side of the toggle is applied', async ({ page }) => {
    const token = uniqueToken();
    const otherToken = uniqueToken('Rpt2');
    const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
    await seedSiblingFixture(page, token, otherToken);

    await builder.addFilter();
    await builder.chooseAttribute(0, 'Student · Has Sibling');
    await builder.clickBooleanToggle(0, 'No');

    await builder.addFilter();
    await builder.chooseAttribute(1, 'Student · Name');
    await builder.typeTextValue(1, token);

    const results = await runAndGetResults(page, builder);

    await expect(results.allSections()).toHaveCount(1);
    await expect(results.sectionFor(`Cara ${token}`)).toHaveCount(1);
    await expect(results.subline).toContainText(/^1 student ·/);
  });
});

// ---------------------------------------------------------------------------
// 11IT4 — case-insensitive contains on Name
// ---------------------------------------------------------------------------

test.describe('Report Builder — Name contains is case-insensitive', { tag: ['@11IT4'] }, () => {
  test('upper-case "ZYL" finds Amy van Zyl', async ({ page }) => {
    const token = uniqueToken();
    const dob = randomDobBetween2012And2019();
    const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
    const target = await seedEnrollmentTarget(page);

    await seedReportStudent(page, target, {
      firstName: 'Amy',
      lastName: 'van Zyl',
      dateOfBirth: dob,
    });
    await seedReportStudent(page, target, { firstName: 'Amy', lastName: token });

    await builder.addFilter();
    await builder.chooseAttribute(0, 'Student · Name');
    await builder.typeTextValue(0, 'ZYL');
    await builder.tickColumn('Date Of Birth');

    const results = await runAndGetResults(page, builder);

    const row = results.rows().filter({ hasText: 'Amy van Zyl' }).filter({ hasText: dob });
    await expect(row).toHaveCount(1);
    const cells = results.cells(row);
    await expect(cells.nth(0)).toHaveText('Amy van Zyl');
    await expect(cells.nth(1)).toHaveText(dob);
    await expect(results.sectionFor(`Amy ${token}`)).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 11IT5 — no matches
// ---------------------------------------------------------------------------

test.describe('Report Builder — filters matching no student', { tag: ['@11IT5'] }, () => {
  test('a name nobody holds', async ({ page }) => {
    const token = uniqueToken('RptNone');
    const builder = await openBuilder(page);

    await builder.addFilter();
    await builder.chooseAttribute(0, 'Student · Name');
    await builder.typeTextValue(0, token);

    const results = await runAndGetResults(page, builder);

    await expect(results.emptyMessage).toHaveText('No students match the current filters.');
    await expect(results.allSections()).toHaveCount(0);
    await expect(results.headerRow.locator('th')).toHaveCount(0);
  });

  test('filters that match separately but not together (AND)', async ({ page }) => {
    const token = uniqueToken();
    const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
    const target = await seedEnrollmentTarget(page);
    await seedReportStudent(page, target, { firstName: 'Lulu', lastName: token, grade: 'Grade4' });

    await builder.addFilter();
    await builder.chooseAttribute(0, 'Student · Name');
    await builder.typeTextValue(0, token);

    await builder.addFilter();
    await builder.chooseAttribute(1, 'Student · Grade');
    await builder.selectListValue(1, 'Grade 5');

    const results = await runAndGetResults(page, builder);

    await expect(results.emptyMessage).toHaveText('No students match the current filters.');
  });
});

// ---------------------------------------------------------------------------
// 11IT6 — Run report availability
// ---------------------------------------------------------------------------

test.describe(
  'Report Builder — Run report is unavailable while a filter has no value',
  { tag: ['@11IT6'] },
  () => {
    test('empty text value, then supplied', async ({ page }) => {
      const builder = await openBuilder(page);

      await expect(builder.runButton).toBeEnabled();

      await builder.addFilter();
      await expect(builder.runButton).toBeDisabled();

      await builder.typeTextValue(0, 'a');
      await expect(builder.runButton).toBeEnabled();

      await builder.typeTextValue(0, '');
      await expect(builder.runButton).toBeDisabled();
    });

    test('removing the empty row restores Run report', async ({ page }) => {
      const builder = await openBuilder(page);

      await builder.addFilter();
      await expect(builder.runButton).toBeDisabled();

      await builder.removeFilter(0);

      await expect(builder.runButton).toBeEnabled();
      await expect(builder.filtersEmptyMessage).toHaveText(
        'No filters applied — all students will appear.'
      );
    });

    test('an in filter with nothing checked', async ({ page }) => {
      const builder = await openBuilder(page);

      await builder.addFilter();
      await builder.chooseAttribute(0, 'Student · Class');
      await builder.chooseOperator(0, 'is any of');

      await builder.openChecklist(0);
      const checkboxes = builder
        .filterRow(0)
        .locator('pm-report-checklist-dropdown input[type="checkbox"]:checked');
      const checkedCount = await checkboxes.count();
      for (let i = 0; i < checkedCount; i++) {
        await checkboxes.first().click();
      }

      await expect(builder.runButton).toBeDisabled();

      await builder
        .filterRow(0)
        .locator('pm-report-checklist-dropdown .checklist__option input')
        .first()
        .click();

      await expect(builder.runButton).toBeEnabled();
    });

    test('whitespace only counts as empty', async ({ page }) => {
      const builder = await openBuilder(page);

      await builder.addFilter();
      await builder.typeTextValue(0, '   ');

      await expect(builder.runButton).toBeDisabled();
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT7 — Edit report / Run again
// ---------------------------------------------------------------------------

test.describe('Report Builder — Edit report and Run again', { tag: ['@11IT7'] }, () => {
  test('Edit report keeps the definition', async ({ page }) => {
    const token = uniqueToken();
    const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
    const target = await seedEnrollmentTarget(page);
    await seedReportStudent(page, target, { firstName: 'Ivy', lastName: token, grade: 'Grade4' });

    await builder.addFilter();
    await builder.chooseAttribute(0, 'Student · Grade');
    await builder.chooseOperator(0, 'is any of');
    await builder.tickChecklistOptions(0, ['Grade 4', 'Grade 5']);
    await builder.closeChecklist();

    await builder.addFilter();
    await builder.chooseAttribute(1, 'Student · Name');
    await builder.typeTextValue(1, token);

    await builder.tickColumn('Class');
    await builder.tickColumn('Language');

    const results = await runAndGetResults(page, builder);
    await results.editReport();

    await expect(builder.breadcrumb).toContainText('Reports');
    await expect(builder.breadcrumb).toContainText('New report');
    await expect(builder.filterRows()).toHaveCount(2);
    await expect(builder.filterRow(0).locator('#attribute')).toHaveValue('student.grade');
    await expect(builder.operatorControl(0)).toHaveValue('in');
    await expect(builder.checklistToggle(0)).toHaveText('Grade 4 · Grade 5');
    await expect(builder.filterRow(1).locator('#attribute')).toHaveValue('student.name');
    await expect(builder.operatorControl(1)).toHaveValue('contains');
    await expect(builder.filterRow(1).locator('.filter-row__value[type="text"]')).toHaveValue(
      token
    );
    await expect(builder.columnsCounter).toHaveText('3 / 10');

    const rerun = await runAndGetResults(page, builder);
    await expect(rerun.sectionFor(`Ivy ${token}`)).toHaveCount(1);
  });

  test('Run again reruns the same definition against current data', async ({ page }) => {
    const token = uniqueToken();
    const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
    const target = await seedEnrollmentTarget(page);
    await seedReportStudent(page, target, { firstName: 'Ivy', lastName: token, grade: 'Grade4' });
    await seedReportStudent(page, target, { firstName: 'Omar', lastName: token, grade: 'Grade6' });

    await builder.addFilter();
    await builder.chooseAttribute(0, 'Student · Grade');
    await builder.selectListValue(0, 'Grade 4');

    await builder.addFilter();
    await builder.chooseAttribute(1, 'Student · Name');
    await builder.typeTextValue(1, token);

    const results = await runAndGetResults(page, builder);
    await expect(results.allSections()).toHaveCount(1);
    await expect(results.sectionFor(`Ivy ${token}`)).toHaveCount(1);
    await expect(results.subline).toContainText(/^1 student ·/);

    await seedReportStudent(page, target, { firstName: 'Jade', lastName: token, grade: 'Grade4' });
    await seedReportStudent(page, target, { firstName: 'Kobus', lastName: token, grade: 'Grade6' });

    const headersBefore = await results.headers().allTextContents();
    await results.runAgain();
    await expect(results.subline).toContainText(/^2 students/);

    const names = await results.allSections().allTextContents();
    expect(names[0]).toContain(`Ivy ${token}`);
    expect(names[1]).toContain(`Jade ${token}`);
    await expect(results.sectionFor(`Omar ${token}`)).toHaveCount(0);
    await expect(results.sectionFor(`Kobus ${token}`)).toHaveCount(0);
    await expect(results.headers()).toHaveText(headersBefore);
  });
});

// ---------------------------------------------------------------------------
// 11IT10 — the Columns panel's opening state
// ---------------------------------------------------------------------------

test.describe(
  'Report Builder — the columns panel opens with only Student selected',
  { tag: ['@11IT10'] },
  () => {
    test('a fresh builder', async ({ page }) => {
      const builder = await openBuilder(page);

      await expect(builder.columnCheck('Student')).toHaveClass(/columns-panel__check--checked/);
      await expect(builder.columnRequiredLabel('Student')).toBeVisible();

      for (const header of [
        'Class',
        'Phase',
        'Language',
        'Date Of Birth',
        'Has Sibling',
        'Number Of Siblings',
        'Eldest',
      ]) {
        await expect(builder.columnCheck(header)).not.toHaveClass(/columns-panel__check--checked/);
      }

      await expect(builder.columnsCounter).toHaveText('1 / 10');
      await expect(builder.filtersEmptyMessage).toHaveText(
        'No filters applied — all students will appear.'
      );
    });

    test("Student can't be unticked", async ({ page }) => {
      const builder = await openBuilder(page);

      await builder.tickColumn('Student');

      await expect(builder.columnCheck('Student')).toHaveClass(/columns-panel__check--checked/);
      await expect(builder.columnsCounter).toHaveText('1 / 10');
    });

    test('Clear returns the builder to its opening state', async ({ page }) => {
      const builder = await openBuilder(page);

      await builder.tickColumn('Class');
      await builder.tickColumn('Eldest');
      await builder.addFilter();
      await builder.typeTextValue(0, 'x');

      await builder.clear();

      await expect(builder.filterRows()).toHaveCount(0);
      await expect(builder.columnCheck('Student')).toHaveClass(/columns-panel__check--checked/);
      await expect(builder.columnCheck('Class')).not.toHaveClass(/columns-panel__check--checked/);
      await expect(builder.columnsCounter).toHaveText('1 / 10');
    });

    test('Create report after Edit starts fresh', async ({ page }) => {
      const builder = await openBuilder(page);

      await builder.addFilter();
      await builder.typeTextValue(0, 'x');
      await builder.tickColumn('Class');

      const results = await runAndGetResults(page, builder);
      await results.editReport();

      const reportsPage = new ReportsPage(page);
      await builder.followReportsBreadcrumb();
      await expect(reportsPage.host).toBeVisible();
      await reportsPage.createReport();

      const freshBuilder = new ReportBuilderPage(page);
      await expect(freshBuilder.filtersEmptyMessage).toBeVisible();
      await expect(freshBuilder.filterRows()).toHaveCount(0);
      await expect(freshBuilder.columnCheck('Student')).toHaveClass(
        /columns-panel__check--checked/
      );
      await expect(freshBuilder.columnCheck('Class')).not.toHaveClass(
        /columns-panel__check--checked/
      );
      await expect(freshBuilder.columnsCounter).toHaveText('1 / 10');
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT12 — headers follow registry order
// ---------------------------------------------------------------------------

test.describe(
  'Report Builder — result headers follow registry order, not tick order',
  { tag: ['@11IT12'] },
  () => {
    test('headers follow registry order, not tick order', async ({ page }) => {
      const token = uniqueToken();
      const builder = await openBuilder(page, ['Teacher', 'Coordinator']);
      const target = await seedEnrollmentTarget(page);

      const ninaId = await seedReportStudent(page, target, {
        firstName: 'Nina',
        lastName: token,
        grade: 'Grade4',
        class: 'A2',
        dateOfBirth: '2014-01-01',
      });
      const theoId = await seedReportStudent(page, target, {
        firstName: 'Theo',
        lastName: token,
        grade: 'Grade2',
        class: 'E1',
        dateOfBirth: '2016-06-01',
      });
      await linkSiblings(page, ninaId, theoId);

      await builder.tickColumn('Eldest');
      await builder.tickColumn('Class');
      await builder.addFilter();
      await builder.chooseAttribute(0, 'Student · Name');
      await builder.typeTextValue(0, token);

      const results = await runAndGetResults(page, builder);

      await expect(results.headers()).toHaveText(['Student', 'Class', 'Eldest']);

      const ninaRow = results.rows().filter({ hasText: `Nina ${token}` });
      await expect(results.cells(ninaRow).nth(1)).toHaveText('4A2');
      await expect(results.cells(ninaRow).nth(2)).toHaveText('Yes');

      const theoRow = results.rows().filter({ hasText: `Theo ${token}` });
      await expect(results.cells(theoRow).nth(1)).toHaveText('2E1');
      await expect(results.cells(theoRow).nth(2)).toHaveText('No');
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT16 — the registry is the only source of attributes
// ---------------------------------------------------------------------------

test.describe(
  'Report Builder — filters and columns offer only the registry, never banking',
  { tag: ['@11IT16'] },
  () => {
    // The full registry, in group order (Student, Guardian, Course,
    // Extra-Curricular).
    const EXPECTED_FILTERS = [
      'Student · Name',
      'Student · Grade',
      'Student · Phase',
      'Student · Class',
      'Student · Language',
      'Student · Has Sibling',
      'Student · Eldest',
      'Guardian · Name',
      'Guardian · Relationship',
      'Guardian · Receives Correspondence',
      'Guardian · Responsible For Payment',
      'Guardian · Married',
      'Course · Course Type',
      'Course · Lesson Type',
      'Course · Duration',
      'Course · Occurrence',
      'Course · Instrument Type',
      'Course · Step Type',
      'Course · Teacher',
      'Extra-Curricular · Activity',
      'Extra-Curricular · Phase',
    ];
    const EXPECTED_COLUMNS = [
      'Student',
      'Class',
      'Phase',
      'Language',
      'Date Of Birth',
      'Has Sibling',
      'Number Of Siblings',
      'Eldest',
      'Guardian',
      'Cell',
      'Email',
      'Receives Correspondence',
      'Responsible For Payment',
      'Married',
      'Course Type',
      'Lesson Type',
      'Duration',
      'Occurrence',
      'Teacher',
      'Instrument Type',
      'Step Type',
      'Activity',
      'Phase',
      'Practice Times',
    ];

    test('the attribute dropdown offers exactly the registry, grouped', async ({ page }) => {
      const builder = await openBuilder(page);

      await builder.addFilter();

      await expect(builder.attributeDropdownOptions(0)).toHaveText(EXPECTED_FILTERS);
      expect(EXPECTED_FILTERS).toHaveLength(21);
      await expect(builder.filterRow(0).locator('#attribute')).not.toContainText(
        /bank|account|branch/i
      );
    });

    test('the columns panel offers exactly the registry, grouped', async ({ page }) => {
      const builder = await openBuilder(page);

      await expect(builder.columnItems()).toHaveCount(EXPECTED_COLUMNS.length);
      expect(EXPECTED_COLUMNS).toHaveLength(24);
      const itemTexts = await builder.columnItems().allTextContents();
      EXPECTED_COLUMNS.forEach((header, index) => {
        expect(itemTexts[index]).toContain(header);
      });
      expect(itemTexts.join(' ').toLowerCase()).not.toMatch(/bank|account|branch/);
    });

    test('the fields endpoint exposes exactly the registry', async ({ page }) => {
      await goToReportsPage(page);

      const { status, body } = await fetchReportFields(page);

      expect(status).toBe(200);
      expect((body.filters ?? []).map((f) => f.key)).toEqual([
        'student.name',
        'student.grade',
        'student.phase',
        'student.class',
        'student.language',
        'student.hasSiblings',
        'student.isEldest',
        'guardian.name',
        'guardian.relationship',
        'guardian.receivesCorrespondence',
        'guardian.responsibleForPayment',
        'guardian.married',
        'course.courseType',
        'course.lessonType',
        'course.durationType',
        'course.occurrenceType',
        'course.instrumentType',
        'course.stepType',
        'course.teacher',
        'extraCurricular.activity',
        'extraCurricular.phase',
      ]);
      expect((body.columns ?? []).map((c) => c.key).sort()).toEqual(
        [
          'student.name',
          'student.class',
          'student.phase',
          'student.language',
          'student.dateOfBirth',
          'student.hasSiblings',
          'student.numberOfSiblings',
          'student.isEldest',
          'guardian.name',
          'guardian.cell',
          'guardian.email',
          'guardian.receivesCorrespondence',
          'guardian.responsibleForPayment',
          'guardian.married',
          'course.courseType',
          'course.lessonType',
          'course.durationType',
          'course.occurrenceType',
          'course.instrumentType',
          'course.stepType',
          'course.teacher',
          'extraCurricular.activity',
          'extraCurricular.phase',
          'extraCurricular.practiceTimes',
        ].sort()
      );
      expect(JSON.stringify(body).toLowerCase()).not.toMatch(/bank|account|branch/);
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT17 — unregistered keys are refused server-side
// ---------------------------------------------------------------------------

test.describe(
  'Report run API — rejects any field, operator or value outside the registry',
  { tag: ['@11IT17'] },
  () => {
    async function seedQuinn(page: Page, token: string): Promise<SeededEnrollmentTarget> {
      const target = await seedEnrollmentTarget(page);
      await seedReportStudent(page, target, { firstName: 'Quinn', lastName: token });
      return target;
    }

    test('unknown filter field key', async ({ page }) => {
      const token = uniqueToken();
      await goToReportsPage(page, ['Teacher', 'Coordinator']);
      await seedQuinn(page, token);

      const { status, body } = await runReportViaApi(page, {
        filters: [{ field: 'teacher.accountNumber', operator: 'equals', values: ['1'] }],
        columns: ['student.name'],
      });

      expect(status).toBe(400);
      expect(body.sections).toBeUndefined();
      expect(body.studentCount).toBeUndefined();
      expect(JSON.stringify(body)).not.toContain('Quinn');
      expect(body.error).toContain('teacher.accountNumber');
    });

    test('unknown column key', async ({ page }) => {
      const token = uniqueToken();
      await goToReportsPage(page, ['Teacher', 'Coordinator']);
      await seedQuinn(page, token);

      const { status, body } = await runReportViaApi(page, {
        filters: [],
        columns: ['student.name', 'teacher.bankName'],
      });

      expect(status).toBe(400);
      expect(body.sections).toBeUndefined();
      expect(JSON.stringify(body)).not.toContain('Quinn');
    });

    test('valid request control', async ({ page }) => {
      const token = uniqueToken();
      await goToReportsPage(page, ['Teacher', 'Coordinator']);
      await seedQuinn(page, token);

      const { status, body } = await runReportViaApi(page, {
        filters: [{ field: 'student.name', operator: 'contains', values: [token] }],
        columns: ['student.name'],
      });

      expect(status).toBe(200);
      expect(body.sections).toHaveLength(1);
      expect(body.sections![0].rows[0][0]).toBe(`Quinn ${token}`);
    });

    test('operator or value outside the registry', async ({ page }) => {
      const token = uniqueToken();
      await goToReportsPage(page, ['Teacher', 'Coordinator']);
      await seedQuinn(page, token);

      const a = await runReportViaApi(page, {
        filters: [{ field: 'student.grade', operator: 'contains', values: ['Grade4'] }],
        columns: ['student.name'],
      });
      expect(a.status).toBe(400);
      expect(a.body.sections).toBeUndefined();

      const b = await runReportViaApi(page, {
        filters: [{ field: 'student.grade', operator: 'equals', values: ['Grade9'] }],
        columns: ['student.name'],
      });
      expect(b.status).toBe(400);
      expect(b.body.sections).toBeUndefined();

      const c = await runReportViaApi(page, {
        filters: [{ field: 'student.name', operator: 'contains', values: [] }],
        columns: ['student.name'],
      });
      expect(c.status).toBe(400);
      expect(c.body.sections).toBeUndefined();

      const d = await runReportViaApi(page, {
        filters: [{ field: 'student.name', operator: 'contains', values: [token, 'x'] }],
        columns: ['student.name'],
      });
      expect(d.status).toBe(400);
      expect(d.body.sections).toBeUndefined();
      expect(JSON.stringify(d.body)).not.toContain('Quinn');
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT18 — an unsaved run
// ---------------------------------------------------------------------------

test.describe(
  'Report results — an unsaved run is titled "New report" and leaves the list empty',
  { tag: ['@11IT18'] },
  () => {
    test('an unsaved run is titled "New report" and leaves the list empty', async ({ page }) => {
      const reportsPage = await goToReportsPage(page);
      const email = reportsPage.email;
      await reportsPage.createReport();
      const builder = new ReportBuilderPage(page);
      await expect(builder.filtersEmptyMessage).toBeVisible();

      const results = await runAndGetResults(page, builder);

      await expect(results.title).toHaveText('New report');
      await expect(results.breadcrumb).toContainText('Reports');
      await expect(results.breadcrumb).toContainText('New report');
      await expect(results.subline).toContainText('· Last run');
      await expect(results.caption).toHaveText(
        "Filters choose which students appear; each collection lists all of a student's records."
      );

      await results.followReportsBreadcrumb();
      await reportsPage.waitForLoaded();

      // Parallel specs may have saved reports of their own, so the list isn't
      // asserted empty — only that this run left no row behind for its creator.
      await expect(reportsPage.rowsByCreatedBy(email)).toHaveCount(0);
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT30 — sidebar and route access is Teacher-only
// ---------------------------------------------------------------------------

test.describe('Reports is offered to Teacher alone', { tag: ['@11IT30'] }, () => {
  test('control: a Teacher is offered Reports, last in the sidebar', async ({ page }) => {
    const reportsPage = await goToReportsPage(page, ['Teacher']);

    const lastEntry = SIDEBAR_ENTRIES[SIDEBAR_ENTRIES.length - 1];
    expect(lastEntry.id).toBe('reportsLink');
    await expect(sidebarEntry(page, 'reportsLink')).toBeVisible();

    await sidebarEntry(page, 'reportsLink').click();

    await expect(page).toHaveURL(/#\/reports$/);
    await expect(reportsPage.heading).toHaveText('Reports');
    await expect(reportsPage.subtitle).toHaveText('Saved student reports.');
    await expect(reportsPage.createButton).toBeVisible();
  });

  const NON_TEACHER_ROLE_SETS: { label: string; roles: UserRole[] }[] = [
    { label: 'coordinator', roles: ['Coordinator'] },
    { label: 'bankingcoordinator', roles: ['BankingCoordinator'] },
    { label: 'admin', roles: ['Admin'] },
  ];

  for (const { label, roles } of NON_TEACHER_ROLE_SETS) {
    test(`a ${label} sees no Reports entry and is turned away from every reports route`, async ({
      page,
    }) => {
      // A fresh Teacher saves a report first, so the loop below can also
      // prove the guard on the new saved-report route with a real id — a
      // 403/redirect can't be mistaken for a 404 on a made-up one.
      await loginAsRoles(page, ['Teacher']);
      const { status, body } = await saveReportViaApi(page, {
        name: `Guard ${label}`,
        definition: { filters: [], columns: ['student.name'] },
      });
      expect(status).toBe(201);
      const savedReportId = body.id;
      if (!savedReportId) throw new Error('save did not return an id');

      await goToReportsPage(page, roles);

      await expect(sidebarEntry(page, 'reportsLink')).toBeHidden();

      for (const path of [
        '/reports',
        '/reports/new',
        '/reports/results',
        `/reports/${savedReportId}`,
      ]) {
        await page.goto(`/#${path}`);
        await expect(page).toHaveURL(landingUrl(...roles));
        await expect(page.locator('pm-reports-page')).toHaveCount(0);
        await expect(page.locator('pm-report-builder-page')).toHaveCount(0);
        await expect(page.locator('pm-report-results-page')).toHaveCount(0);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// 11IT31 — the fields and run endpoints are Teacher-only
// ---------------------------------------------------------------------------

test.describe(
  'Report fields and run endpoints are refused to non-Teachers',
  { tag: ['@11IT31'] },
  () => {
    const NON_TEACHER_ROLE_SETS: { label: string; roles: UserRole[] }[] = [
      { label: 'coordinator', roles: ['Coordinator'] },
      { label: 'bankingcoordinator', roles: ['BankingCoordinator'] },
      { label: 'admin', roles: ['Admin'] },
    ];

    for (const { label, roles } of NON_TEACHER_ROLE_SETS) {
      test(`fields and run are forbidden to a ${label}`, async ({ page }) => {
        await goToReportsPage(page, roles);

        const fields = await fetchReportFields(page);
        expect(fields.status).toBe(403);
        expect(fields.body.filters).toBeUndefined();
        expect(fields.body.columns).toBeUndefined();

        const run = await runReportViaApi(page, { filters: [], columns: ['student.name'] });
        expect(run.status).toBe(403);
        expect(run.body.sections).toBeUndefined();
      });
    }

    test('control: a Teacher is allowed', async ({ page }) => {
      await goToReportsPage(page, ['Teacher']);

      const fields = await fetchReportFields(page);
      expect(fields.status).toBe(200);

      const run = await runReportViaApi(page, { filters: [], columns: ['student.name'] });
      expect(run.status).toBe(200);
    });
  }
);
