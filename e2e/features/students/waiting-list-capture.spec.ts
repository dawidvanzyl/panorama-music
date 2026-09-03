import { test, expect } from '../../fixtures/base';
import { goToWaitingListPage } from '../../fixtures/testUsers';
import { attemptCaptureWaitingListStudent, fetchAnyLessonStructureId } from '../../fixtures/waitingList';
import { StudentsPage } from '../../pages/students/StudentsPage';

/**
 * A student has no natural key, so a run is told apart by the surname it gives
 * its students — same convention as course-enrollment.spec.ts.
 */
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

// Both roles held so the same signed-in session can capture through the
// Waiting List page and then check the Students screen without a second
// login — MAINTAINER_ROLES on the Waiting List page only checks for
// Coordinator, and Teacher is Student Management's own landing role.
const CAPTURE_AND_VIEW_ROLES = ['Teacher', 'Coordinator'] as const;

test.describe('Capturing through the full wizard creates the student with no course enrollment', { tag: '@272IT1' }, () => {
  test('the captured student appears on the waiting list and holds no course enrollment', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...CAPTURE_AND_VIEW_ROLES]);
    const surname = uniqueSurname('Capture');

    await waitingListPage.captureStudent(
      { firstName: 'Amara', lastName: surname, ...studentDefaults },
      { occurrenceLabel: 'During School', lessonLabel: 'Individual', durationLabel: 'Hour', instrumentLabel: 'Guitar' },
    );

    await expect(waitingListPage.successBanner).toContainText(`Amara ${surname}`);
    await expect(waitingListPage.wizardModal).toBeHidden();
    await expect(waitingListPage.rowFor('During School', surname)).toBeVisible();

    // No course enrollment: absent from the Students screen (IT18's own check).
    const studentsPage = new StudentsPage(page);
    await studentsPage.gotoStudents();
    await studentsPage.filterByName(surname);
    await expect(studentsPage.row(surname)).toHaveCount(0);
  });
});

test.describe(
  'The captured row shows the lesson, duration, instrument and date added it was captured with',
  { tag: '@272IT4' },
  () => {
    test('the row reflects the chosen lesson type, duration type, instrument type and today as the date added', async ({
      page,
    }) => {
      const waitingListPage = await goToWaitingListPage(page, ['Coordinator']);
      const surname = uniqueSurname('Meta');

      await waitingListPage.captureStudent(
        { firstName: 'Kagiso', lastName: surname, ...studentDefaults },
        { occurrenceLabel: 'After School', lessonLabel: 'Individual', durationLabel: 'Hour', instrumentLabel: 'Guitar' },
      );

      const row = waitingListPage.rowFor('After School', surname);
      await expect(row).toBeVisible();
      const metaText = (await waitingListPage.meta(row).textContent())!;

      expect(metaText).toContain('Individual');
      expect(metaText).toContain('Hour');
      expect(metaText).toContain('Guitar');
      expect(metaText).toContain('Added');

      // Computed in the page's own JS engine so the formatting matches
      // exactly what pm-waiting-list-table's formatDate produces, rather than
      // risking a locale/ICU mismatch against Node's own toLocaleDateString.
      const todayLabel = await page.evaluate(() =>
        new Date().toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }),
      );
      expect(metaText).toContain(todayLabel);
    });
  },
);

test.describe(
  'A capture request naming a lesson structure that does not exist is refused',
  { tag: '@272IT5' },
  () => {
    test('the capture is refused and no student record is created', async ({ page }) => {
      // Direct request against the capture endpoint — see the design's
      // conventions note: every real occurrence/lesson/duration triple is
      // offered by the wizard, so this boundary is only reachable by naming a
      // lesson-structure id that does not correspond to any seeded row.
      const waitingListPage = await goToWaitingListPage(page, [...CAPTURE_AND_VIEW_ROLES]);
      const attempt = await attemptCaptureWaitingListStudent(page, { lessonStructureId: crypto.randomUUID() });

      expect(attempt.status).toBe(400);

      await page.reload();
      await expect(waitingListPage.rowFor('During School', attempt.lastName)).toHaveCount(0);
      await expect(waitingListPage.rowFor('After School', attempt.lastName)).toHaveCount(0);

      const studentsPage = new StudentsPage(page);
      await studentsPage.gotoStudents();
      await studentsPage.filterByName(attempt.lastName);
      await expect(studentsPage.row(attempt.lastName)).toHaveCount(0);
    });
  },
);

test.describe('Capturing with notes left blank succeeds and shows the no-notes placeholder', { tag: '@272IT6' }, () => {
  test('the capture succeeds and the notes cell shows the placeholder used elsewhere for an absent value', async ({
    page,
  }) => {
    const waitingListPage = await goToWaitingListPage(page, ['Coordinator']);
    const surname = uniqueSurname('NoNotes');

    await waitingListPage.captureStudent(
      { firstName: 'Priya', lastName: surname, ...studentDefaults },
      { occurrenceLabel: 'During School', lessonLabel: 'Group', durationLabel: 'Half Hour', instrumentLabel: 'Piano' },
    );

    await expect(waitingListPage.successBanner).toContainText(surname);
    const row = waitingListPage.rowFor('During School', surname);
    await expect(waitingListPage.notesCell(row)).toHaveText('—');
  });
});

test.describe('A captured waiting-list student is absent from the Students screen', { tag: '@272IT18' }, () => {
  test('the student does not appear when the Students screen is filtered by their name', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...CAPTURE_AND_VIEW_ROLES]);
    const surname = uniqueSurname('Absent');

    await waitingListPage.captureStudent(
      { firstName: 'Thabo', lastName: surname, ...studentDefaults },
      { occurrenceLabel: 'During School', lessonLabel: 'Individual', durationLabel: 'Hour', instrumentLabel: 'Piano' },
    );
    await expect(waitingListPage.rowFor('During School', surname)).toBeVisible();

    const studentsPage = new StudentsPage(page);
    await studentsPage.gotoStudents();
    await studentsPage.filterByName(surname);
    await expect(studentsPage.row(surname)).toHaveCount(0);
  });
});

test.describe("A Teacher's capture attempt is refused", { tag: '@272IT29' }, () => {
  test('the request is refused as an authorisation failure and no student record is created', async ({ page }) => {
    // The Waiting List page offers no Capture Student action to a Teacher at
    // all (272IT26), so the attempt is made the same way IT5 reaches its
    // boundary — a direct request from the signed-in session.
    const waitingListPage = await goToWaitingListPage(page, ['Teacher']);
    const lessonStructureId = await fetchAnyLessonStructureId(page);
    const attempt = await attemptCaptureWaitingListStudent(page, { lessonStructureId });

    expect(attempt.status).toBe(403);

    await page.reload();
    await expect(waitingListPage.rowFor('During School', attempt.lastName)).toHaveCount(0);
    await expect(waitingListPage.rowFor('After School', attempt.lastName)).toHaveCount(0);

    const studentsPage = new StudentsPage(page);
    await studentsPage.gotoStudents();
    await studentsPage.filterByName(attempt.lastName);
    await expect(studentsPage.row(attempt.lastName)).toHaveCount(0);
  });
});

test.describe(
  'The wizard opened from the Waiting List page presents exactly its four tabs',
  { tag: '@272IT32' },
  () => {
    test('shows Student, Siblings, Guardians and Waiting List, and no Courses or Extra-Curriculars tab', async ({
      page,
    }) => {
      const waitingListPage = await goToWaitingListPage(page, ['Coordinator']);
      await waitingListPage.openCaptureWizard();

      await expect(waitingListPage.visibleTabs()).toHaveCount(4);
      await expect(waitingListPage.studentTab()).toBeVisible();
      await expect(waitingListPage.siblingsTab()).toBeVisible();
      await expect(waitingListPage.guardiansTab()).toBeVisible();
      await expect(waitingListPage.waitingListTab()).toBeVisible();
      await expect(waitingListPage.coursesTab()).toBeHidden();
      await expect(waitingListPage.extraCurricularsTab()).toBeHidden();
    });
  },
);

test.describe(
  'Capture steps through Student, Siblings, Guardians, Waiting List in order, Save only at the end',
  { tag: '@272IT34' },
  () => {
    test('Next is offered at every step but the last, and only the Waiting List tab carries Save', async ({ page }) => {
      const waitingListPage = await goToWaitingListPage(page, ['Coordinator']);
      await waitingListPage.openCaptureWizard();

      // Student tab: no Save offered, and the later tabs are not directly
      // selectable during create — disabled, so they cannot be clicked into.
      await expect(waitingListPage.studentTab()).toHaveClass(/wizard__tab--active/);
      await expect(waitingListPage.saveButton()).toBeHidden();
      await expect(waitingListPage.nextButton()).toBeVisible();
      await expect(waitingListPage.siblingsTab()).toBeDisabled();
      await expect(waitingListPage.guardiansTab()).toBeDisabled();
      await expect(waitingListPage.waitingListTab()).toBeDisabled();

      await waitingListPage.fillStudentFields({
        firstName: 'Zanele',
        lastName: uniqueSurname('Steps'),
        ...studentDefaults,
      });
      await waitingListPage.goToNextStep();

      await expect(waitingListPage.siblingsTab()).toHaveClass(/wizard__tab--active/);
      await expect(waitingListPage.saveButton()).toBeHidden();
      await expect(waitingListPage.nextButton()).toBeVisible();

      await waitingListPage.goToNextStep();

      await expect(waitingListPage.guardiansTab()).toHaveClass(/wizard__tab--active/);
      await expect(waitingListPage.saveButton()).toBeHidden();
      await expect(waitingListPage.nextButton()).toBeVisible();

      await waitingListPage.goToNextStep();

      await expect(waitingListPage.waitingListTab()).toHaveClass(/wizard__tab--active/);
      await expect(waitingListPage.saveButton()).toBeVisible();
      await expect(waitingListPage.nextButton()).toBeHidden();
    });
  },
);
