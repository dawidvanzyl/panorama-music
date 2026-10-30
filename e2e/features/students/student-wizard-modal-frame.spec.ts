import { test, expect } from '../../fixtures/base';
import { goToStudentsPage } from '../../fixtures/testUsers';
import { openSavedStudent } from '../../fixtures/savedStudent';
import { fetchGuardians } from '../../fixtures/guardians';
import { clickBackdropLeftThenAbove } from '../../fixtures/modalFrame';

function uniqueToken(): string {
  return `${test.info().workerIndex}${Date.now()}${crypto.randomUUID().slice(0, 6).replace(/-/g, '')}`;
}

test.describe(
  'Student wizard — edit mode shows no footer and the close control dismisses',
  { tag: ['@266IT39'] },
  () => {
    test('Guardians in edit mode: no footer, close dismisses', async ({ page }) => {
      const { studentsPage, surname } = await openSavedStudent(page, 'FrameG');
      await studentsPage.openGuardiansTab(surname);
      const rows = studentsPage.actionRows();
      await expect(studentsPage.tab('Guardians')).toHaveClass(/wizard__tab--active/);

      await expect(rows.footer).toBeHidden();
      await expect(rows.footerButtons()).toHaveCount(0);
      await expect(rows.cancel).toBeHidden();
      await expect(rows.previous).toBeHidden();
      await expect(rows.next).toBeHidden();
      await expect(rows.confirm).toBeHidden();

      await rows.closeControl.click();

      await expect(studentsPage.wizardModal).toBeHidden();
      await expect(studentsPage.row(surname)).toBeVisible();
    });

    test('the other edit-mode steps show no footer either', async ({ page }) => {
      const { studentsPage, surname } = await openSavedStudent(page, 'FrameS');
      await studentsPage.openEditWizard(surname);
      const rows = studentsPage.actionRows();

      await expect(rows.closeControl).toBeVisible();
      await expect(rows.footer).toBeHidden();
      await expect(rows.studentStepRow.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
      await expect(rows.studentStepRow.getByRole('button', { name: 'Save', exact: true })).toBeVisible();

      for (const tab of ['Siblings', 'Guardians', 'Courses', 'Extra-Curriculars'] as const) {
        await studentsPage.tab(tab).click();
        await expect(studentsPage.tab(tab)).toHaveClass(/wizard__tab--active/);
        await expect(rows.footer).toBeHidden();
        await expect(rows.footerButtons()).toHaveCount(0);
        await expect(rows.closeControl).toBeVisible();
      }
    });

    test('close with an unsaved guardian typed adds no guardian', async ({ page }) => {
      const { studentsPage, surname, studentId } = await openSavedStudent(page, 'FrameU');
      const firstName = `G${uniqueToken()}`;
      await studentsPage.openGuardiansTab(surname);
      const step = studentsPage.wizardModal.locator('#guardiansStep');

      await step.locator('#addBtn').click();
      await step.locator('#guardianForm').locator('#firstName').fill(firstName);
      await studentsPage.actionRows().closeControl.click();
      await expect(studentsPage.wizardModal).toBeHidden();

      await studentsPage.openGuardiansTab(surname);
      await expect(step).toBeVisible();
      await expect(studentsPage.guardianListRow(firstName)).toHaveCount(0);
      const guardians = await fetchGuardians(page, studentId);
      expect(guardians.filter((g) => g.firstName === firstName)).toHaveLength(0);
    });

    test('create mode keeps its footer', async ({ page }) => {
      const studentsPage = await goToStudentsPage(page);

      await studentsPage.createButton.click();
      const rows = studentsPage.actionRows();

      await expect(rows.footer).toBeVisible();
      await expect(rows.cancel).toBeVisible();
      await expect(rows.next).toBeVisible();
      await expect(rows.closeControl).toBeVisible();
    });
  }
);

test.describe(
  'Student wizard — backdrop click and Escape leave create mode open',
  { tag: ['@266IT44'] },
  () => {
    test('backdrop click, then Escape: the wizard and the name stay', async ({ page }) => {
      const studentsPage = await goToStudentsPage(page);
      const firstName = `F${uniqueToken()}`;
      await studentsPage.createButton.click();
      const field = studentsPage.studentStep().locator('#firstName');
      await field.fill(firstName);

      await clickBackdropLeftThenAbove(page, studentsPage.wizardCard(), async () => {
        await expect(studentsPage.wizardCard()).toBeVisible();
        await expect(studentsPage.tab('Student')).toHaveClass(/wizard__tab--active/);
        await expect(field).toHaveValue(firstName);
      });
      await page.keyboard.press('Escape');

      await expect(studentsPage.wizardCard()).toBeVisible();
      await expect(studentsPage.tab('Student')).toHaveClass(/wizard__tab--active/);
      await expect(field).toHaveValue(firstName);
    });

    test('nothing was created', async ({ page }) => {
      const studentsPage = await goToStudentsPage(page);
      const firstName = `F${uniqueToken()}`;
      await studentsPage.createButton.click();
      await studentsPage.studentStep().locator('#firstName').fill(firstName);
      await clickBackdropLeftThenAbove(page, studentsPage.wizardCard(), async () => {
        await expect(studentsPage.wizardCard()).toBeVisible();
      });
      await page.keyboard.press('Escape');

      await studentsPage.actionRows().closeControl.click();
      await expect(studentsPage.wizardModal).toBeHidden();
      await studentsPage.filterByName(firstName);

      await expect(studentsPage.row(firstName)).toHaveCount(0);
    });
  }
);
