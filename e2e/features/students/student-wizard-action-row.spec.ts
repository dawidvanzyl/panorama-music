import type { Locator, Page, Route } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToStudentsPage, goToWaitingListPage, loginAsRoles } from '../../fixtures/testUsers';
import { seedEnrolledStudent, seedEnrollmentTarget } from '../../fixtures/enrollment';
import { ensureInstrumentCourse, seedWaitingListEntry } from '../../fixtures/waitingList';
import { switchToPrintMedia, switchToScreenMedia } from '../../fixtures/printMedia';
import { StudentsPage, type StudentInput } from '../../pages/students/StudentsPage';
import { WaitingListPage } from '../../pages/students/WaitingListPage';

function uniqueSurname(label: string): string {
  return `${label}${Date.now()}W${test.info().workerIndex}`;
}

function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

function studentInput(firstName: string, label: string): StudentInput {
  return {
    firstName,
    lastName: uniqueSurname(label),
    dateOfBirth: '2014-05-12',
    grade: 'Grade4',
    class: 'A1',
    phase: 'Junior',
    language: 'English',
  };
}

type CreateBehaviour = { kind: 'hold' } | { kind: 'fail'; message: string };

interface CreateInterceptor {
  /** Create requests received so far. */
  readonly received: () => number;
  /** Failures answered so far. */
  readonly answered: () => number;
  behaviour: CreateBehaviour;
}

/**
 * Intercepts only `POST /api/students`. It never passes the request on, so no
 * student is created: a held request is never answered, and a failing one is
 * answered with a server error carrying the message.
 */
async function interceptCreate(page: Page, initial: CreateBehaviour): Promise<CreateInterceptor> {
  let received = 0;
  let answered = 0;
  const interceptor: CreateInterceptor = {
    received: () => received,
    answered: () => answered,
    behaviour: initial,
  };

  await page.route(
    (url) => url.pathname === '/api/students',
    async (route: Route) => {
      if (route.request().method() !== 'POST') {
        await route.fallback();
        return;
      }
      received += 1;
      const behaviour = interceptor.behaviour;
      if (behaviour.kind === 'hold') {
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: behaviour.message }),
      });
      answered += 1;
    }
  );

  return interceptor;
}

async function expectConfirmIdle(studentsPage: StudentsPage): Promise<void> {
  const rows = studentsPage.actionRows();
  await expect(rows.confirm).toBeEnabled();
  await expect(rows.cancel).toBeEnabled();
  await expect(rows.confirm).not.toHaveAttribute('aria-busy', 'true');
  await expect(rows.confirmLoadingIcon()).toHaveCount(0);
  await expect(rows.confirm).toHaveAccessibleName('Create Student');
}

async function expectConfirmBusy(studentsPage: StudentsPage): Promise<void> {
  const rows = studentsPage.actionRows();
  await expect(rows.confirm).toBeDisabled();
  await expect(rows.confirm).toHaveAttribute('aria-busy', 'true');
  await expect(rows.confirm).toHaveAccessibleName('Create Student');
  await expect(rows.confirmLoadingIcon()).toBeVisible();
  await expect(rows.cancel).toBeDisabled();
}

/** Signs in, opens Students, reaches the last create step with the request intercepted. */
async function reachLastStepIntercepted(
  page: Page,
  student: StudentInput,
  behaviour: CreateBehaviour
): Promise<{ studentsPage: StudentsPage; interceptor: CreateInterceptor }> {
  const studentsPage = await goToStudentsPage(page);
  const interceptor = await interceptCreate(page, behaviour);
  await studentsPage.reachLastCreateStep(student);
  return { studentsPage, interceptor };
}

/** Signs in, seeds one saved student with a course, and opens the Students roster with that student found. */
async function openSavedStudent(
  page: Page,
  label: string
): Promise<{ studentsPage: StudentsPage; surname: string }> {
  await loginAsRoles(page, ['Teacher', 'Coordinator']);
  const target = await seedEnrollmentTarget(page);
  const surname = uniqueSurname(label);
  await seedEnrolledStudent(page, target, surname);

  await page.reload();
  const studentsPage = new StudentsPage(page);
  await studentsPage.gotoStudents();
  await studentsPage.filterByName(surname);
  await expect(studentsPage.row(surname)).toBeVisible();
  return { studentsPage, surname };
}

/** Signs in, seeds one waiting-list entry with notes, and finds its row. */
async function openSeededEntry(
  page: Page
): Promise<{ waitingListPage: WaitingListPage; row: Locator }> {
  const waitingListPage = await goToWaitingListPage(page, ['Teacher', 'Coordinator']);
  const entry = await seedWaitingListEntry(page, {
    occurrenceType: 'DuringSchool',
    notes: 'Prefers mornings',
  });
  // The Waiting List step shows its fields only for a combination the school runs an instrument course for.
  await ensureInstrumentCourse(page, entry.lessonStructureId);
  await page.reload();

  const row = waitingListPage.rowFor('During School', entry.lastName);
  await expect(row).toBeVisible();
  return { waitingListPage, row };
}

async function buttonNames(buttons: Locator): Promise<string[]> {
  const names: string[] = [];
  const count = await buttons.count();
  for (let index = 0; index < count; index++) {
    names.push((await buttons.nth(index).innerText()).trim());
  }
  return names;
}

async function expectNames(buttons: Locator, expected: string[]): Promise<void> {
  await expect(buttons).toHaveCount(expected.length);
  expect(await buttonNames(buttons)).toEqual(expected);
}

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

async function box(locator: Locator): Promise<Box> {
  const found = await locator.boundingBox();
  expect(found).not.toBeNull();
  return found!;
}

const right = (b: Box): number => b.x + b.width;

test.describe(
  'Student wizard â€” the confirm action is busy while the create request runs',
  { tag: ['@267IT5'] },
  () => {
    test('Create Student is busy while the request is held', async ({ page }) => {
      const { studentsPage, interceptor } = await reachLastStepIntercepted(
        page,
        studentInput('Amara', 'Held'),
        { kind: 'hold' }
      );
      const rows = studentsPage.actionRows();

      await expectConfirmIdle(studentsPage);

      await rows.confirm.click();
      await expect.poll(() => interceptor.received()).toBe(1);

      await expectConfirmBusy(studentsPage);
      const edges = await rows.confirmIconAndLabelLeftEdges('Create Student');
      expect(edges.icon).toBeLessThan(edges.label);
      await expect(rows.previous).toBeVisible();
      await expect(studentsPage.tab('Extra-Curriculars')).toHaveClass(/wizard__tab--active/);
      await expect(studentsPage.wizardModal).toHaveAttribute('open', '');
    });

    test('a second click sends nothing more', async ({ page }) => {
      const { studentsPage, interceptor } = await reachLastStepIntercepted(
        page,
        studentInput('Amara', 'Held'),
        { kind: 'hold' }
      );
      const rows = studentsPage.actionRows();

      await rows.confirm.click();
      await expect.poll(() => interceptor.received()).toBe(1);

      await rows.confirm
        .click({ force: true, noWaitAfter: true, timeout: 2000 })
        .catch(() => undefined);

      await expect(rows.confirm).toHaveAttribute('aria-busy', 'true');
      expect(interceptor.received()).toBe(1);
    });

    test('a failed create keeps the wizard on the same step and restores the buttons', async ({
      page,
    }) => {
      const message = `Stubbed create refusal ${randomSuffix()}`;
      const { studentsPage, interceptor } = await reachLastStepIntercepted(
        page,
        studentInput('Thabo', 'Refused'),
        { kind: 'fail', message }
      );
      const rows = studentsPage.actionRows();

      await rows.confirm.click();
      await expect.poll(() => interceptor.answered()).toBe(1);

      await expect(studentsPage.wizardModal).toHaveAttribute('open', '');
      await expect(studentsPage.tab('Extra-Curriculars')).toHaveClass(/wizard__tab--active/);
      await expectConfirmIdle(studentsPage);
      await expect(rows.previous).toBeVisible();
      await expect(rows.next).toBeHidden();
      await expect(studentsPage.wizardModal.getByText(message)).toBeVisible();
    });

    test('after a failure, Create Student can be tried again', async ({ page }) => {
      const message = `Stubbed create refusal ${randomSuffix()}`;
      const { studentsPage, interceptor } = await reachLastStepIntercepted(
        page,
        studentInput('Zanele', 'Retry'),
        { kind: 'fail', message }
      );
      const rows = studentsPage.actionRows();

      await rows.confirm.click();
      await expect.poll(() => interceptor.answered()).toBe(1);
      await expectConfirmIdle(studentsPage);

      interceptor.behaviour = { kind: 'hold' };
      await rows.confirm.click();
      await expect.poll(() => interceptor.received()).toBe(2);

      await expectConfirmBusy(studentsPage);
    });
  }
);

test.describe(
  'Student wizard â€” Cancel apart at the left, the other buttons together at the right',
  { tag: ['@267IT9'] },
  () => {
    test('Cancel, Previous and Next on a middle step', async ({ page }) => {
      const studentsPage = await goToStudentsPage(page);
      await studentsPage.startCreatingStudent(studentInput('Amara', 'Layout'));
      await studentsPage.goToNextStep(); // Student -> Siblings
      await studentsPage.goToNextStep(); // Siblings -> Guardians
      await expect(studentsPage.tab('Guardians')).toHaveClass(/wizard__tab--active/);
      const rows = studentsPage.actionRows();

      await expectNames(rows.footerButtons(), ['Cancel', 'Previous', 'Next']);

      const footer = await box(rows.footer);
      const cancel = await box(rows.cancel);
      const previous = await box(rows.previous);
      const next = await box(rows.next);

      expect(Math.abs(cancel.x - footer.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(right(next) - right(footer))).toBeLessThanOrEqual(1);
      expect(Math.abs(next.x - right(previous) - 12)).toBeLessThanOrEqual(1);
      expect(previous.x - right(cancel)).toBeGreaterThan(12);
    });

    test('the same layout on the last step with the confirm action', async ({ page }) => {
      const studentsPage = await goToStudentsPage(page);
      await studentsPage.reachLastCreateStep(studentInput('Thabo', 'Layout'));
      const rows = studentsPage.actionRows();

      await expectNames(rows.footerButtons(), ['Cancel', 'Previous', 'Create Student']);

      const footer = await box(rows.footer);
      const cancel = await box(rows.cancel);
      const previous = await box(rows.previous);
      const confirm = await box(rows.confirm);

      expect(Math.abs(cancel.x - footer.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(right(confirm) - right(footer))).toBeLessThanOrEqual(1);
      expect(Math.abs(confirm.x - right(previous) - 12)).toBeLessThanOrEqual(1);
    });
  }
);

test.describe(
  'Student wizard â€” the first step hides Previous and shows Next',
  { tag: ['@267IT11'] },
  () => {
    test('first step: no Previous', async ({ page }) => {
      const studentsPage = await goToStudentsPage(page);
      await studentsPage.createButton.click();
      const rows = studentsPage.actionRows();

      await expect(studentsPage.tab('Student')).toHaveClass(/wizard__tab--active/);
      await expect(rows.previous).toBeHidden();
      await expect(rows.next).toBeVisible();
      await expect(rows.next).toHaveAccessibleName('Next');
      await expect(rows.cancel).toBeVisible();
      await expect(rows.confirm).toBeHidden();
    });

    test('back on the first step after Previous: Previous hidden again', async ({ page }) => {
      const studentsPage = await goToStudentsPage(page);
      await studentsPage.startCreatingStudent(studentInput('Amara', 'Steps'));
      await studentsPage.goToNextStep();
      await expect(studentsPage.tab('Siblings')).toHaveClass(/wizard__tab--active/);
      await studentsPage.goToPreviousStep();
      const rows = studentsPage.actionRows();

      await expect(studentsPage.tab('Student')).toHaveClass(/wizard__tab--active/);
      await expect(rows.previous).toBeHidden();
      await expect(rows.next).toBeVisible();
    });
  }
);

test.describe(
  'Student wizard â€” every middle step shows Previous and Next',
  { tag: ['@267IT12'] },
  () => {
    test('Siblings, Guardians and Courses', async ({ page }) => {
      const studentsPage = await goToStudentsPage(page);
      await studentsPage.startCreatingStudent(studentInput('Thabo', 'Steps'));
      const rows = studentsPage.actionRows();

      const expectMiddleStep = async (tab: 'Siblings' | 'Guardians' | 'Courses'): Promise<void> => {
        await expect(studentsPage.tab(tab)).toHaveClass(/wizard__tab--active/);
        await expect(rows.previous).toBeVisible();
        await expect(rows.next).toBeVisible();
        await expect(rows.cancel).toBeVisible();
        await expect(rows.confirm).toBeHidden();
      };

      await studentsPage.goToNextStep();
      await expectMiddleStep('Siblings');
      await studentsPage.goToNextStep();
      await expectMiddleStep('Guardians');
      await studentsPage.goToNextStep();
      await studentsPage.enrollInCourse();
      await expectMiddleStep('Courses');
    });
  }
);

test.describe(
  'Student wizard â€” the last step hides Next and confirms with Create Student',
  { tag: ['@267IT13'] },
  () => {
    test('last step: Create Student replaces Next', async ({ page }) => {
      const studentsPage = await goToStudentsPage(page);
      await studentsPage.reachLastCreateStep(studentInput('Zanele', 'Steps'));
      const rows = studentsPage.actionRows();

      await expect(studentsPage.tab('Extra-Curriculars')).toHaveClass(/wizard__tab--active/);
      await expect(rows.next).toBeHidden();
      const names = await buttonNames(rows.footerButtons());
      expect(names[names.length - 1]).toBe('Create Student');
      await expect(rows.previous).toBeVisible();
      await expect(rows.cancel).toBeVisible();
      await expect(rows.anyButton('Save')).toHaveCount(0);
    });

    test('Create Student still creates the student', async ({ page }) => {
      const studentsPage = await goToStudentsPage(page);
      const student = studentInput('Amara', 'Capture');
      await studentsPage.reachLastCreateStep(student);

      await studentsPage.actionRows().confirm.click();
      await expect(studentsPage.wizardModal).toBeHidden();

      await studentsPage.filterByName(student.lastName);
      await expect(studentsPage.row(student.lastName)).toBeVisible();
    });
  }
);

test.describe(
  'Student wizard â€” the confirm action names the record it creates',
  { tag: ['@267IT25'] },
  () => {
    test('capture mode confirms with "Create Waiting List Entry"', async ({ page }) => {
      const waitingListPage = await goToWaitingListPage(page, ['Coordinator']);
      await waitingListPage.openCaptureWizardAtWaitingListTab(studentInput('Thabo', 'Capture'));
      const rows = waitingListPage.actionRows();

      await expect(waitingListPage.waitingListTab()).toHaveClass(/wizard__tab--active/);
      await expect(rows.next).toBeHidden();
      const names = await buttonNames(rows.footerButtons());
      expect(names[names.length - 1]).toBe('Create Waiting List Entry');
      await expect(rows.anyButton('Save')).toHaveCount(0);
      await expect(rows.anyButton('Create Student')).toHaveCount(0);
      await expect(rows.anyButton('Close')).toHaveCount(0);
    });

    test('the label does not carry over to the Students page wizard', async ({ page }) => {
      const waitingListPage = await goToWaitingListPage(page, ['Teacher', 'Coordinator']);
      await seedEnrollmentTarget(page);
      await page.reload();

      await waitingListPage.openCaptureWizardAtWaitingListTab(studentInput('Zanele', 'Capture'));
      const captureNames = await buttonNames(waitingListPage.actionRows().footerButtons());
      expect(captureNames[captureNames.length - 1]).toBe('Create Waiting List Entry');

      const studentsPage = new StudentsPage(page);
      await studentsPage.gotoStudents();
      await studentsPage.reachLastCreateStep(studentInput('Zanele', 'Capture'));

      const names = await buttonNames(studentsPage.actionRows().footerButtons());
      expect(names[names.length - 1]).toBe('Create Student');
    });
  }
);

test.describe(
  'Student wizard â€” in edit mode every dismiss action reads "Cancel"',
  { tag: ['@267IT26'] },
  () => {
    test('Students page edit: every tab dismisses with "Cancel"', async ({ page }) => {
      const { studentsPage, surname } = await openSavedStudent(page, 'Edit');
      await studentsPage.openEditWizard(surname);
      const rows = studentsPage.actionRows();

      await expect(studentsPage.tab('Student')).toHaveClass(/wizard__tab--active/);
      await expectNames(rows.studentStepRow.getByRole('button'), ['Cancel', 'Save']);
      await expect(rows.footerButtons()).toHaveCount(0);
      await expect(rows.anyButton('Close')).toHaveCount(0);

      for (const tab of ['Siblings', 'Guardians', 'Courses', 'Extra-Curriculars'] as const) {
        await studentsPage.tab(tab).click();
        await expect(studentsPage.tab(tab)).toHaveClass(/wizard__tab--active/);
        await expectNames(rows.footerButtons(), ['Cancel']);
        await expect(rows.previous).toBeHidden();
        await expect(rows.next).toBeHidden();
        await expect(rows.anyButton('Close')).toHaveCount(0);
      }
    });

    test('the footer Cancel closes the edit wizard', async ({ page }) => {
      const { studentsPage, surname } = await openSavedStudent(page, 'Edit');
      await studentsPage.openGuardiansTab(surname);
      const rows = studentsPage.actionRows();
      await expect(studentsPage.tab('Guardians')).toHaveClass(/wizard__tab--active/);

      await rows.cancel.click();

      await expect(studentsPage.wizardModal).toBeHidden();
      await expect(studentsPage.row(surname)).toBeVisible();
    });

    test('Waiting List edit: the Waiting List step dismisses with "Cancel"', async ({ page }) => {
      const { waitingListPage, row } = await openSeededEntry(page);
      await waitingListPage.openEditWizard(row);
      const rows = waitingListPage.actionRows();

      await expectNames(rows.studentStepRow.getByRole('button'), ['Cancel', 'Save']);
      await expect(rows.anyButton('Close')).toHaveCount(0);

      await waitingListPage.selectTab('Waiting List');
      await expect(waitingListPage.activeTab()).toHaveAttribute('id', 'tabWaitingList');
      await expectNames(rows.waitingListStepRow.getByRole('button'), ['Cancel', 'Save']);
      await expect(rows.footerButtons()).toHaveCount(0);
      await expect(rows.anyButton('Close')).toHaveCount(0);

      for (const tab of ['Siblings', 'Guardians'] as const) {
        await waitingListPage.selectTab(tab);
        await expect(waitingListPage.activeTab()).toHaveAttribute('id', `tab${tab}`);
        await expectNames(rows.footerButtons(), ['Cancel']);
        await expect(rows.anyButton('Close')).toHaveCount(0);
      }
    });

    test('the Waiting List step Cancel closes the wizard and changes nothing', async ({ page }) => {
      const { waitingListPage, row } = await openSeededEntry(page);
      await waitingListPage.openEditWizard(row);
      await waitingListPage.selectTab('Waiting List');
      const rows = waitingListPage.actionRows();

      await waitingListPage.wizardModal
        .locator('#waitingListStep')
        .locator('#notes')
        .fill(`Changed ${randomSuffix()}`);
      await rows.waitingListStepRow.getByRole('button', { name: 'Cancel', exact: true }).click();
      await expect(waitingListPage.wizardModal).toBeHidden();

      await page.reload();
      await expect(waitingListPage.notesCell(row)).toContainText('Prefers mornings');
    });
  }
);

test.describe(
  'Student wizard â€” no wizard footer or step action row is printed',
  { tag: ['@267IT41'] },
  () => {
    test('create wizard: print media hides the footer and its buttons', async ({ page }) => {
      const studentsPage = await goToStudentsPage(page);
      await studentsPage.startCreatingStudent(studentInput('Amara', 'Printed'));
      await studentsPage.goToNextStep();
      await expect(studentsPage.tab('Siblings')).toHaveClass(/wizard__tab--active/);
      const rows = studentsPage.actionRows();

      await expect(rows.footer).toBeVisible();
      await expect(rows.cancel).toBeVisible();
      await expect(rows.previous).toBeVisible();
      await expect(rows.next).toBeVisible();

      await switchToPrintMedia(page);

      await expect(rows.footer).toBeHidden();
      await expect(rows.cancel).toBeHidden();
      await expect(rows.previous).toBeHidden();
      await expect(rows.next).toBeHidden();
    });

    test('last step: the confirm action is hidden too', async ({ page }) => {
      const studentsPage = await goToStudentsPage(page);
      await studentsPage.reachLastCreateStep(studentInput('Thabo', 'Printed'));
      const rows = studentsPage.actionRows();

      await expect(rows.footer).toBeVisible();
      await expect(rows.confirm).toBeVisible();

      await switchToPrintMedia(page);

      await expect(rows.footer).toBeHidden();
      await expect(rows.confirm).toBeHidden();
    });

    test('edit wizard: print media hides the Student step row', async ({ page }) => {
      const { studentsPage, surname } = await openSavedStudent(page, 'Printed');
      await studentsPage.openEditWizard(surname);
      const row = studentsPage.actionRows().studentStepRow;

      await expect(row).toBeVisible();
      await expect(row.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
      await expect(row.getByRole('button', { name: 'Save', exact: true })).toBeVisible();

      await switchToPrintMedia(page);

      await expect(row).toBeHidden();
      await expect(row.getByRole('button', { name: 'Cancel', exact: true })).toBeHidden();
      await expect(row.getByRole('button', { name: 'Save', exact: true })).toBeHidden();
    });

    test('Waiting List edit: print media hides the Waiting List step row', async ({ page }) => {
      const { waitingListPage, row: entryRow } = await openSeededEntry(page);
      await waitingListPage.openEditWizard(entryRow);
      await waitingListPage.selectTab('Waiting List');
      const row = waitingListPage.actionRows().waitingListStepRow;

      await expect(row).toBeVisible();
      await expect(row.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
      await expect(row.getByRole('button', { name: 'Save', exact: true })).toBeVisible();

      await switchToPrintMedia(page);

      await expect(row).toBeHidden();
      await expect(row.getByRole('button', { name: 'Cancel', exact: true })).toBeHidden();
      await expect(row.getByRole('button', { name: 'Save', exact: true })).toBeHidden();
    });

    test('back on screen, the rows return', async ({ page }) => {
      const studentsPage = await goToStudentsPage(page);
      await studentsPage.startCreatingStudent(studentInput('Amara', 'Printed'));
      await studentsPage.goToNextStep();
      await expect(studentsPage.tab('Siblings')).toHaveClass(/wizard__tab--active/);
      const rows = studentsPage.actionRows();

      await switchToPrintMedia(page);
      await expect(rows.footer).toBeHidden();
      await switchToScreenMedia(page);

      await expect(rows.footer).toBeVisible();
      await expect(rows.cancel).toBeVisible();
      await expect(rows.previous).toBeVisible();
      await expect(rows.next).toBeVisible();
    });
  }
);
