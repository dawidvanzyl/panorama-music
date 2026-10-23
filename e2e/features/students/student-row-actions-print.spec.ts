import { test, expect } from '../../fixtures/base';
import { switchToPrintMedia, switchToScreenMedia } from '../../fixtures/printMedia';
import { rowActionsOf } from '../../fixtures/rowActions';
import { openStudents, seedGuardian, seedStudent, signInToSeed, uniqueToken } from '../../fixtures/studentPrint';

test.describe('Students — row actions when printed', { tag: ['@267IT42'] }, () => {
  test('S1 print media hides the Actions column and its buttons', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    await seedStudent(page, target, { firstName: 'Ava', lastName: token });
    const studentsPage = await openStudents(page, token);
    const row = studentsPage.rosterRow(token);

    await expect(studentsPage.actionsColumnHead()).toBeVisible();
    await expect(rowActionsOf(row)).toBeVisible();
    await expect(row.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Delete', exact: true })).toBeVisible();

    await switchToPrintMedia(page);

    await expect(studentsPage.actionsColumnHead()).toBeHidden();
    await expect(row.getByRole('button', { name: 'Edit', exact: true })).toBeHidden();
    await expect(row.getByRole('button', { name: 'Delete', exact: true })).toBeHidden();
    await expect(rowActionsOf(row)).toBeHidden();
    await expect(row.getByText(token).first()).toBeVisible();
  });

  test('S2 the expanded view Print is hidden too', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const studentId = await seedStudent(page, target, { firstName: 'Ava', lastName: token });
    const studentsPage = await openStudents(page, token);

    await studentsPage.expandUntilPrintOffered(`Ava ${token}`, studentId);
    const row = studentsPage.rosterRow(token);
    await expect(rowActionsOf(row)).toBeVisible();

    await switchToPrintMedia(page);

    await expect(studentsPage.printButtonOf(studentId)).toBeHidden();
    await expect(row.getByRole('button', { name: 'Edit', exact: true })).toBeHidden();
    await expect(row.getByRole('button', { name: 'Delete', exact: true })).toBeHidden();
  });

  test('S3 back on screen, the column returns', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    await seedStudent(page, target, { firstName: 'Ava', lastName: token });
    const studentsPage = await openStudents(page, token);
    const row = studentsPage.rosterRow(token);
    await expect(rowActionsOf(row)).toBeVisible();

    await switchToPrintMedia(page);
    await expect(rowActionsOf(row)).toBeHidden();
    await switchToScreenMedia(page);

    await expect(studentsPage.actionsColumnHead()).toBeVisible();
    await expect(row.getByRole('button', { name: 'Edit', exact: true })).toBeVisible();
    await expect(row.getByRole('button', { name: 'Delete', exact: true })).toBeVisible();
  });

  test('S4 printing hides only the buttons, not the expanded details', async ({ page }) => {
    const token = uniqueToken();
    const target = await signInToSeed(page);
    const studentId = await seedStudent(page, target, { firstName: 'Ava', lastName: token });
    await seedGuardian(page, studentId, { firstName: 'Nomsa', surname: token });
    const studentsPage = await openStudents(page, token);

    await studentsPage.expandUntilPrintOffered(`Ava ${token}`, studentId);
    const row = studentsPage.rosterRow(token);
    await expect(rowActionsOf(row)).toBeVisible();

    await switchToPrintMedia(page);

    await expect(studentsPage.visibleGuardiansSummary()).toBeVisible();
    await expect(studentsPage.visibleGuardiansSummary()).toContainText(`Nomsa ${token}`);
    await expect(rowActionsOf(row)).toBeHidden();
    await expect(studentsPage.printButtonOf(studentId)).toBeHidden();
  });
});
