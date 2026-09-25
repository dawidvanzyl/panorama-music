import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToReportsPage } from '../../fixtures/testUsers';
import type { UserRole } from '../../pages/identity/admin/AdminUsersPage';
import { seedEnrollmentTarget } from '../../fixtures/enrollment';
import { seedReportStudent } from '../../fixtures/reports';
import { linkSiblings } from '../../fixtures/siblings';
import { addGuardianToStudent } from '../../fixtures/guardians';
import { ReportsPage } from '../../pages/reports/ReportsPage';
import { ReportBuilderPage } from '../../pages/reports/ReportBuilderPage';
import { ReportResultsPage } from '../../pages/reports/ReportResultsPage';
import {
  switchToPrintMedia,
  ownBackgroundIsLight,
  ownBackgroundIsWhite,
  ownBackgroundIsLightGrey,
  ownTextIsNearBlack,
  ownTextIsMuted,
  computesPrintColorAdjustExact,
  ancestorChain,
  chainHasNoHorizontalOverflow,
  chainHasNoClippingAncestor,
  documentHasNoHorizontalScroll,
  isNotClipped,
  isTallerThanOneLine,
  bottomEdgeWithinDocumentScrollHeight,
} from '../../fixtures/printMedia';

/**
 * The QA database is shared and filled in parallel, so every scenario mints
 * its own token and uses it as its seeded students' surname, keeping one
 * worker's rows out of another's results.
 */
function uniqueToken(prefix = 'Print'): string {
  return `${prefix}${test.info().workerIndex}${Date.now()}${crypto.randomUUID().slice(0, 6).replace(/-/g, '')}`;
}

/**
 * Signs in and lands on the Reports list, without opening the builder yet —
 * the builder loads its registry options when it opens (no cache), so every
 * scenario here seeds before opening it.
 */
async function loginForReports(page: Page, roles: UserRole[] = ['Teacher']): Promise<ReportsPage> {
  return goToReportsPage(page, roles);
}

/** Opens the builder from an already-landed Reports list, once seeding is done. */
async function openBuilderFrom(reportsPage: ReportsPage, page: Page): Promise<ReportBuilderPage> {
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

/** Extracts the `yyyy-MM-dd HH:mm` run timestamp from the on-screen sub-line's "Last run {…}" segment. */
async function readRunTimestamp(results: ReportResultsPage): Promise<string> {
  const text = (await results.subline.textContent()) ?? '';
  const match = text.match(/Last run (\d{4}-\d{2}-\d{2} \d{2}:\d{2})/);
  if (!match) throw new Error(`Sub-line did not carry a run timestamp: "${text}"`);
  return match[1];
}

/**
 * Replaces `window.print` with a call counter that opens no dialog — the
 * real dialog would block a headless run.
 */
async function recordPrintCalls(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __printCalls: number }).__printCalls = 0;
    window.print = () => {
      (window as unknown as { __printCalls: number }).__printCalls += 1;
    };
  });
}

async function printCallCount(page: Page): Promise<number> {
  return page.evaluate(() => (window as unknown as { __printCalls: number }).__printCalls ?? 0);
}

// ---------------------------------------------------------------------------
// 11IT41 — Print invokes the browser's native print
// ---------------------------------------------------------------------------

test.describe('Report Results — Print invokes the browser print', { tag: ['@11IT41'] }, () => {
  test('Print invokes the browser print once, re-querying nothing', async ({ page }) => {
    const token = uniqueToken();
    const reportsPage = await loginForReports(page, ['Teacher', 'Coordinator']);
    const target = await seedEnrollmentTarget(page);
    await seedReportStudent(page, target, { firstName: 'Ava', lastName: token });
    await seedReportStudent(page, target, { firstName: 'Ben', lastName: token });

    const builder = await openBuilderFrom(reportsPage, page);
    await addNameFilter(builder, 0, token);
    const results = await runAndGetResults(page, builder);

    const headersBefore = await results.headers().allTextContents();
    const rowsBefore = await results.rows().allTextContents();

    await recordPrintCalls(page);
    const reportRequestUrls: string[] = [];
    page.on('request', (request) => {
      if (request.url().includes('/api/reports')) reportRequestUrls.push(request.url());
    });

    await results.print();

    expect(await printCallCount(page)).toBe(1);
    expect(reportRequestUrls).toEqual([]);
    await expect(page).toHaveURL(/#\/reports\/results$/);
    await expect(results.headers()).toHaveText(headersBefore);
    await expect(results.rows()).toHaveText(rowsBefore);
  });

  test('the offered actions read Edit report, Run again, Save report, Print, and Print is enabled', async ({
    page,
  }) => {
    const token = uniqueToken();
    const reportsPage = await loginForReports(page, ['Teacher', 'Coordinator']);
    const target = await seedEnrollmentTarget(page);
    await seedReportStudent(page, target, { firstName: 'Cleo', lastName: token });

    const builder = await openBuilderFrom(reportsPage, page);
    await addNameFilter(builder, 0, token);
    const results = await runAndGetResults(page, builder);

    expect(await results.actionLabels()).toEqual([
      'Edit report',
      'Run again',
      'Save report',
      'Print',
    ]);
    await expect(results.printButton).toBeEnabled();
  });
});

// ---------------------------------------------------------------------------
// 11IT42 — a report rendered for print is light, chrome-free, under one header
// ---------------------------------------------------------------------------

test.describe(
  'Report Results — rendered for print, the chrome is hidden under one light header',
  { tag: ['@11IT42'] },
  () => {
    test('a filtered report prints light, chrome-free, under one header', async ({ page }) => {
      const token = uniqueToken();
      const reportsPage = await loginForReports(page, ['Teacher', 'Coordinator']);
      const target = await seedEnrollmentTarget(page);
      const annaId = await seedReportStudent(page, target, {
        firstName: 'Anna',
        lastName: token,
        grade: 'Grade4',
      });
      const benId = await seedReportStudent(page, target, {
        firstName: 'Ben',
        lastName: token,
        grade: 'Grade5',
      });
      await linkSiblings(page, annaId, benId);
      await seedReportStudent(page, target, {
        firstName: 'Cara',
        lastName: token,
        grade: 'Grade4',
      });

      const builder = await openBuilderFrom(reportsPage, page);
      await builder.addFilter();
      await builder.chooseAttribute(0, 'Student · Grade');
      await builder.chooseOperator(0, 'is any of');
      await builder.tickChecklistOptions(0, ['Grade 4', 'Grade 5']);
      await builder.closeChecklist();

      await builder.addFilter();
      await builder.chooseAttribute(1, 'Student · Has Sibling');
      await builder.clickBooleanToggle(1, 'Yes');

      await addNameFilter(builder, 2, token);

      const results = await runAndGetResults(page, builder);

      const runTimestamp = await readRunTimestamp(results);
      const headersBefore = await results.headers().allTextContents();
      const rowsBefore = await results.rows().allTextContents();

      await switchToPrintMedia(page);

      // --- Chrome hidden ---
      await expect(page.locator('pm-nav-bar')).toBeHidden();
      await expect(page.locator('pm-sidebar')).toBeHidden();
      await expect(page.locator('pm-app-footer')).toBeHidden();
      await expect(results.breadcrumb).toBeHidden();
      await expect(results.title).toBeHidden();
      await expect(results.subline).toBeHidden();
      await expect(results.editButton).toBeHidden();
      await expect(results.runAgainButton).toBeHidden();
      await expect(results.printButton).toBeHidden();

      // --- One header ---
      // results.title and .breadcrumb are already proven hidden above, so
      // printTitle being the sole visible "New report" text is proven by its
      // own visibility, not by counting text matches (a hidden duplicate
      // would still match a text-content count).
      await expect(results.printHeader).toBeVisible();
      await expect(results.printTitle).toBeVisible();
      await expect(results.printTitle).toHaveText('New report');
      await expect(results.printRunLine).toBeVisible();
      await expect(results.printRunLine).toHaveText(`Run ${runTimestamp} · 2 students`);
      await expect(results.printFilters).toBeVisible();
      await expect(results.printFilters).toHaveText(
        `Filters: Grade in Grade 4, Grade 5 · Has Sibling = Yes · Student · Name contains ${token}`
      );
      await expect(results.printRunLine).not.toContainText('Created by');

      // --- Same report ---
      await expect(results.caption).toBeVisible();
      await expect(results.headers()).toHaveText(headersBefore);
      await expect(results.rows()).toHaveText(rowsBefore);
      await expect(results.sectionFor(`Anna ${token}`)).toHaveCount(1);
      await expect(results.sectionFor(`Ben ${token}`)).toHaveCount(1);
      await expect(results.sectionFor(`Cara ${token}`)).toHaveCount(0);

      // --- Light background ---
      expect(await ownBackgroundIsWhite(page.locator('html'))).toBe(true);
      expect(await ownBackgroundIsWhite(page.locator('body'))).toBe(true);
      const ownedSurfaces = [
        page.locator('.pm-shell main'),
        results.host,
        results.printHeader,
        results.caption,
        results.tableCard,
        results.table,
      ];
      for (const surface of ownedSurfaces) {
        expect(await ownBackgroundIsLight(surface)).toBe(true);
      }
      for (const section of await results.allSections().all()) {
        expect(await ownBackgroundIsLight(section)).toBe(true);
      }
      for (const row of await results.rows().all()) {
        expect(await ownBackgroundIsLight(row)).toBe(true);
      }
      for (const cell of await results.table.locator('td').all()) {
        expect(await ownBackgroundIsLight(cell)).toBe(true);
      }

      // --- Legible text ---
      expect(await ownTextIsNearBlack(results.printTitle)).toBe(true);
      for (const headerCell of await results.headers().all()) {
        expect(await ownTextIsNearBlack(headerCell)).toBe(true);
      }
      for (const cell of await results.table.locator('td').all()) {
        expect(await ownTextIsNearBlack(cell)).toBe(true);
      }
      expect(await ownTextIsMuted(results.printRunLine)).toBe(true);
      expect(await ownTextIsMuted(results.printFilters)).toBe(true);

      // --- Tints print ---
      for (const headerCell of await results.headers().all()) {
        expect(await ownBackgroundIsLightGrey(headerCell)).toBe(true);
        expect(await computesPrintColorAdjustExact(headerCell)).toBe(true);
      }
    });

    test('a report with no filters prints no Filters line', async ({ page }) => {
      const token = uniqueToken();
      const reportsPage = await loginForReports(page, ['Teacher', 'Coordinator']);
      const target = await seedEnrollmentTarget(page);
      await seedReportStudent(page, target, { firstName: 'Dan', lastName: token });

      const builder = await openBuilderFrom(reportsPage, page);
      const results = await runAndGetResults(page, builder);

      const onScreenCount = (await results.subline.textContent())?.match(/^(\d+) student/)?.[1];
      if (!onScreenCount) throw new Error('Could not read the on-screen student count');
      const singularOrPlural = onScreenCount === '1' ? 'student' : 'students';
      const runTimestamp = await readRunTimestamp(results);

      await switchToPrintMedia(page);

      await expect(results.printTitle).toHaveText('New report');
      await expect(results.printRunLine).toHaveText(
        `Run ${runTimestamp} · ${onScreenCount} ${singularOrPlural}`
      );
      await expect(results.printFilters).toBeHidden();
    });

    test('on screen, the print-only header does not show', async ({ page }) => {
      const token = uniqueToken();
      const reportsPage = await loginForReports(page, ['Teacher', 'Coordinator']);
      const target = await seedEnrollmentTarget(page);
      await seedReportStudent(page, target, { firstName: 'Eve', lastName: token });

      const builder = await openBuilderFrom(reportsPage, page);
      await addNameFilter(builder, 0, token);
      const results = await runAndGetResults(page, builder);

      await expect(results.printRunLine).toBeHidden();
      await expect(results.printFilters).toBeHidden();
      await expect(results.printTitle).toBeHidden();
      await expect(results.title).toBeVisible();
      await expect(results.title).toHaveText('New report');
      await expect(results.breadcrumb).toBeVisible();
      await expect(results.subline).toBeVisible();
      await expect(results.editButton).toBeVisible();
      await expect(results.runAgainButton).toBeVisible();
      await expect(results.printButton).toBeVisible();
      await expect(page.locator('pm-nav-bar')).toBeVisible();
      await expect(page.locator('pm-sidebar')).toBeVisible();

      const bodyLuminanceIsDark = await page.locator('body').evaluate((el) => {
        const bg = getComputedStyle(el).backgroundColor;
        const match = bg.match(/rgba?\(([^)]+)\)/);
        if (!match) return false;
        const [r, g, b] = match[1].split(',').map((p) => parseFloat(p.trim()));
        const toLinear = (c: number): number => {
          const s = c / 255;
          return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
        };
        const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
        return luminance < 0.1;
      });
      expect(bodyLuminanceIsDark).toBe(true);
    });

    test('the print header follows the report on screen after Run again', async ({ page }) => {
      const token = uniqueToken();
      const reportsPage = await loginForReports(page, ['Teacher', 'Coordinator']);
      const target = await seedEnrollmentTarget(page);
      await seedReportStudent(page, target, { firstName: 'Fay', lastName: token });

      const builder = await openBuilderFrom(reportsPage, page);
      await addNameFilter(builder, 0, token);
      const results = await runAndGetResults(page, builder);
      await expect(results.subline).toContainText(/^1 student ·/);

      await seedReportStudent(page, target, { firstName: 'Gus', lastName: token });
      await results.runAgain();
      await expect(results.subline).toContainText(/^2 students ·/);

      const runTimestamp = await readRunTimestamp(results);
      await switchToPrintMedia(page);

      await expect(results.printRunLine).toHaveText(`Run ${runTimestamp} · 2 students`);
      await expect(results.printFilters).toHaveText(`Filters: Student · Name contains ${token}`);
      await expect(results.sectionFor(`Fay ${token}`)).toHaveCount(1);
      await expect(results.sectionFor(`Gus ${token}`)).toHaveCount(1);
    });
  }
);

// ---------------------------------------------------------------------------
// 11IT43 — a ten-column report fits the printable width, un-clipped
// ---------------------------------------------------------------------------

test.describe(
  'Report Results — printed layout fits the printable width without clipping',
  { tag: ['@11IT43'] },
  () => {
    test('a ten-column report fits the printable width', async ({ page }) => {
      const token = uniqueToken();
      const longEmail = `bartholomew.christopher.${token}@example-school.edu`;
      const reportsPage = await loginForReports(page, ['Teacher', 'Coordinator']);
      const target = await seedEnrollmentTarget(page);
      const maxId = await seedReportStudent(page, target, {
        firstName: 'Maximiliana-Alexandrina',
        lastName: token,
        grade: 'Grade4',
        class: 'A1',
      });
      await addGuardianToStudent(page, maxId, {
        firstName: 'Bartholomew-Christopher',
        surname: token,
        email: longEmail,
      });
      await seedReportStudent(page, target, { firstName: 'Zed', lastName: token });

      const builder = await openBuilderFrom(reportsPage, page);
      await builder.tickColumnByKey('student.class');
      await builder.tickColumnByKey('student.phase');
      await builder.tickColumnByKey('student.language');
      await builder.tickColumnByKey('student.dateOfBirth');
      await builder.tickColumnByKey('student.hasSiblings');
      await builder.tickColumnByKey('student.numberOfSiblings');
      await builder.tickColumnByKey('student.isEldest');
      await builder.tickColumnByKey('guardian.name');
      await builder.tickColumnByKey('guardian.email');
      await expect(builder.columnsCounter).toHaveText('10 / 10');

      await addNameFilter(builder, 0, token);
      const results = await runAndGetResults(page, builder);

      await switchToPrintMedia(page);

      // --- Ten columns, in order ---
      await expect(results.headers()).toHaveText([
        'Student',
        'Class',
        'Phase',
        'Language',
        'Date Of Birth',
        'Has Sibling',
        'Number Of Siblings',
        'Eldest',
        'Guardian',
        'Email',
      ]);

      // --- Fits the width ---
      const tableBox = await results.table.boundingBox();
      const viewport = page.viewportSize();
      if (!tableBox || !viewport) throw new Error('Missing table or viewport geometry');
      expect(tableBox.x + tableBox.width).toBeLessThanOrEqual(viewport.width + 1);

      const cardBox = await results.tableCard.boundingBox();
      if (!cardBox) throw new Error('Missing table card geometry');
      expect(tableBox.width).toBeLessThanOrEqual(cardBox.width + 1);

      const chain = await ancestorChain(results.table);
      expect(chainHasNoHorizontalOverflow(chain)).toBe(true);
      expect(await documentHasNoHorizontalScroll(page)).toBe(true);

      // --- No clipped text ---
      for (const headerCell of await results.headers().all()) {
        expect(await isNotClipped(headerCell)).toBe(true);
      }
      for (const cell of await results.table.locator('td').all()) {
        expect(await isNotClipped(cell)).toBe(true);
      }

      // --- Wrapping ---
      const maxSection = results.sectionFor(`Maximiliana-Alexandrina ${token}`);
      await expect(maxSection).toContainText(`Maximiliana-Alexandrina ${token}`);
      await expect(maxSection).toContainText('Bartholomew-Christopher');
      await expect(maxSection).toContainText(longEmail);

      const emailCell = maxSection.locator('td').filter({ hasText: longEmail }).first();
      expect(await isTallerThanOneLine(emailCell)).toBe(true);

      // --- Header row repeats (regression guard) ---
      const theadDisplay = await results.headerRow.evaluate(
        (el) => getComputedStyle(el.parentElement!).display
      );
      expect(theadDisplay).toBe('table-header-group');
    });

    test('a long report is laid out in full and not cut off at the screen height', async ({
      page,
    }) => {
      const token = uniqueToken();
      // 40 students, at two ticked columns, lays out to roughly 1600px —
      // comfortably past twice the 600px viewport below, so a truncated
      // layout would have room to actually show as truncated.
      const studentCount = 40;
      const names = Array.from({ length: studentCount }, (_, i) => `S${i + 1}`);
      const reportsPage = await loginForReports(page, ['Teacher', 'Coordinator']);
      const target = await seedEnrollmentTarget(page);
      for (const name of names) {
        await seedReportStudent(page, target, {
          firstName: name,
          lastName: token,
          grade: 'Grade4',
        });
      }

      const builder = await openBuilderFrom(reportsPage, page);
      await builder.tickColumnByKey('student.class');
      await builder.tickColumnByKey('student.dateOfBirth');
      await addNameFilter(builder, 0, token);
      const results = await runAndGetResults(page, builder);

      await switchToPrintMedia(page, 600);

      // --- All sections present ---
      await expect(results.allSections()).toHaveCount(studentCount);

      // --- Not truncated to one screen: the layout is at least twice the
      //     viewport height, not merely taller than it ---
      const documentMetrics = await page.evaluate(() => ({
        scrollHeight: document.documentElement.scrollHeight,
        clientHeight: document.documentElement.clientHeight,
      }));
      expect(documentMetrics.scrollHeight).toBeGreaterThanOrEqual(documentMetrics.clientHeight * 2);

      // --- The last row is laid out, not cut off ---
      const lastName = names[names.length - 1];
      const lastRow = results.sectionRows(`${lastName} ${token}`).last();
      await expect(lastRow).toBeVisible();
      expect(await bottomEdgeWithinDocumentScrollHeight(lastRow)).toBe(true);

      // --- No clipping ancestor ---
      const chain = await ancestorChain(results.table);
      expect(chainHasNoClippingAncestor(chain)).toBe(true);

      // --- Header row repeats (regression guard) ---
      const theadDisplay = await results.headerRow.evaluate(
        (el) => getComputedStyle(el.parentElement!).display
      );
      expect(theadDisplay).toBe('table-header-group');

      // --- Sections stay together ---
      for (const section of await results.allSections().all()) {
        const breakInside = await section.evaluate((el) => getComputedStyle(el).breakInside);
        expect(breakInside).toBe('avoid');
      }
    });
  }
);
