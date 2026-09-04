import { test, expect } from '../../fixtures/base';
import { goToWaitingListPage } from '../../fixtures/testUsers';
import { seedWaitingListEntry } from '../../fixtures/waitingList';
import type { Page } from '@playwright/test';

/** Same convention as waiting-list-capture.spec.ts — a run is told apart by the value it writes. */
function uniqueValue(label: string): string {
  return `${label}${Date.now()}W${test.info().workerIndex}`;
}

// Seeding a student needs Teacher (POST /api/students is TeacherPolicy) while
// every scenario here acts as a Coordinator; holding both does not change what
// the page offers a Coordinator, so one session does both.
const SEED_AND_EDIT_ROLES = ['Teacher', 'Coordinator'] as const;

/**
 * How the wizard's Date Added field and the row's meta line both spell an
 * added date-time, computed from the seeded ISO value in the browser that
 * renders it — so the expectation is the seeded date, not a copy of the
 * application's formatter.
 */
async function expectedDateAdded(page: Page, addedAt: string): Promise<string> {
  return page.evaluate(
    (iso) => new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' }),
    addedAt,
  );
}

test.describe('Editing a waiting-list student updates their details on the row', { tag: '@272IT12' }, () => {
  test("the Student tab's own save applies the change without touching the entry's fields", async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_EDIT_ROLES]);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    await page.reload();

    const row = waitingListPage.rowFor('During School', entry.lastName);
    await expect(waitingListPage.studentName(row)).toHaveText(`${entry.firstName} ${entry.lastName}`);

    await waitingListPage.openEditWizard(row);
    await expect(waitingListPage.wizardTitle()).toContainText(`${entry.firstName} ${entry.lastName}`);

    const correctedFirstName = uniqueValue('Corrected');
    await waitingListPage.fillStudentFields({ firstName: correctedFirstName });
    // The Student tab saves on its own terms: the Waiting List tab is never
    // opened here, so its fields are not touched and are not required to be.
    await waitingListPage.saveStudentDetails();

    await expect(waitingListPage.studentName(waitingListPage.rowFor('During School', entry.lastName))).toHaveText(
      `${correctedFirstName} ${entry.lastName}`,
    );
  });
});

test.describe(
  "Editing a waiting-list entry's own fields moves the row to its new occurrence-type list",
  { tag: '@272IT13' },
  () => {
    test('the row leaves During School for After School and shows the new lesson, duration, instrument and notes', async ({
      page,
    }) => {
      const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_EDIT_ROLES]);
      const entry = await seedWaitingListEntry(page, {
        occurrenceType: 'DuringSchool',
        lessonType: 'Individual',
        durationType: 'Hour',
        instrumentType: 'Piano',
        notes: 'Prefers mornings',
      });
      await page.reload();

      const originalRow = waitingListPage.rowFor('During School', entry.lastName);
      await expect(originalRow).toBeVisible();

      await waitingListPage.openEditWizard(originalRow);
      await waitingListPage.selectTab('Waiting List');

      const correctedNotes = uniqueValue('Prefers afternoons ');
      await waitingListPage.fillWaitingListFields({
        occurrenceLabel: 'After School',
        lessonLabel: 'Group',
        durationLabel: 'Half Hour',
        instrumentLabel: 'Guitar',
        notes: correctedNotes,
      });
      await waitingListPage.saveWaitingListEntry();

      const movedRow = waitingListPage.rowFor('After School', entry.lastName);
      await expect(movedRow).toBeVisible();
      await expect(waitingListPage.rowFor('During School', entry.lastName)).toHaveCount(0);

      await expect(waitingListPage.meta(movedRow)).toContainText('Group');
      await expect(waitingListPage.meta(movedRow)).toContainText('Half Hour');
      await expect(waitingListPage.meta(movedRow)).toContainText('Guitar');
      await expect(waitingListPage.notesCell(movedRow)).toHaveText(correctedNotes);
    });
  },
);

test.describe('The date added is read-only on the edit wizard', { tag: '@272IT14' }, () => {
  test('it shows the seeded date added and offers no control to change it', async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_EDIT_ROLES]);
    // A date distinctly not "today", so what is shown is checked against a
    // value this test chose rather than against the current date by accident.
    const addedAt = '2024-03-15T09:00:00.000Z';
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool', addedAt });
    await page.reload();

    await waitingListPage.openEditWizard(waitingListPage.rowFor('During School', entry.lastName));
    await waitingListPage.selectTab('Waiting List');

    const expected = await expectedDateAdded(page, addedAt);
    await expect(waitingListPage.dateAdded()).toHaveText(expected);

    // Shape, not just value: the field holds no input, picker, button or
    // editable region — there is nothing here to change it through.
    await expect(waitingListPage.dateAddedControls()).toHaveCount(0);

    // And it does not become one on interaction: clicking it and typing
    // leaves the displayed value exactly as it was.
    await waitingListPage.dateAdded().click();
    await page.keyboard.type('2030-01-01');
    await expect(waitingListPage.dateAdded()).toHaveText(expected);
  });

  test("saving the tab's own fields leaves the date added unchanged", async ({ page }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_EDIT_ROLES]);
    const addedAt = '2024-03-15T09:00:00.000Z';
    const entry = await seedWaitingListEntry(page, {
      occurrenceType: 'DuringSchool',
      notes: 'Original note',
      addedAt,
    });
    await page.reload();

    await waitingListPage.openEditWizard(waitingListPage.rowFor('During School', entry.lastName));
    await waitingListPage.selectTab('Waiting List');

    const expected = await expectedDateAdded(page, addedAt);
    await expect(waitingListPage.dateAdded()).toHaveText(expected);

    const correctedNotes = uniqueValue('Note ');
    await waitingListPage.fillWaitingListFields({
      occurrenceLabel: 'During School',
      lessonLabel: entry.lessonType === 'Group' ? 'Group' : 'Individual',
      durationLabel: entry.durationType === 'HalfHour' ? 'Half Hour' : 'Hour',
      instrumentLabel: 'Piano',
      notes: correctedNotes,
    });
    await waitingListPage.saveWaitingListEntry();

    const savedRow = waitingListPage.rowFor('During School', entry.lastName);
    await expect(waitingListPage.notesCell(savedRow)).toHaveText(correctedNotes);

    // Re-opened after a real write to the entry: the date added survived the
    // round trip, so immutability is the server's, not only the field's.
    await waitingListPage.openEditWizard(savedRow);
    await waitingListPage.selectTab('Waiting List');
    await expect(waitingListPage.dateAdded()).toHaveText(expected);
  });
});

test.describe('The edit wizard selects any tab directly and offers no stepper', { tag: '@272IT35' }, () => {
  test('Student, Siblings, Guardians and Waiting List each activate on their own, with no Previous or Next', async ({
    page,
  }) => {
    const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_EDIT_ROLES]);
    const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    await page.reload();

    await waitingListPage.openEditWizard(waitingListPage.rowFor('During School', entry.lastName));

    const fullName = `${entry.firstName} ${entry.lastName}`;
    await expect(waitingListPage.wizardTitle()).toContainText(fullName);
    await expect(waitingListPage.visibleTabs()).toHaveCount(4);

    // Reached in an order no stepper would allow: Siblings, then Guardians,
    // then Waiting List, then back to Student — each by its own tab, never by
    // walking through the ones before it. The Guardians tab is only selected
    // here, never opened up and read: which guardians a Coordinator may
    // maintain is a separate concern with its own coverage.
    for (const tabName of ['Siblings', 'Guardians', 'Waiting List', 'Student'] as const) {
      await waitingListPage.selectTab(tabName);

      await expect(waitingListPage.tab(tabName)).toHaveClass(/wizard__tab--active/);
      await expect(waitingListPage.activeTab()).toHaveCount(1);
      await expect(waitingListPage.previousButton()).toBeHidden();
      await expect(waitingListPage.nextButton()).toBeHidden();
      await expect(waitingListPage.saveButton()).toBeHidden();
      await expect(waitingListPage.wizardTitle()).toContainText(fullName);
    }
  });
});
