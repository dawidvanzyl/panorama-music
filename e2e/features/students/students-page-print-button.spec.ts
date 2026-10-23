import { test, expect } from '../../fixtures/base';
import { goToStudentsPage } from '../../fixtures/testUsers';
import { switchToPrintMedia, switchToScreenMedia } from '../../fixtures/printMedia';

test.describe('Print — the Students page prints without its page button', { tag: ['@267IT43'] }, () => {
  test('print hides the button, not the page', async ({ page }) => {
    const studentsPage = await goToStudentsPage(page);
    await expect(studentsPage.createButton).toBeVisible();
    await expect(studentsPage.createButton).toHaveAccessibleName('Create Student');

    await switchToPrintMedia(page);

    await expect(studentsPage.createButton).toBeHidden();
    await expect(page.getByRole('heading', { name: 'Students', exact: true })).toBeVisible();
  });

  test('back on screen, it returns', async ({ page }) => {
    const studentsPage = await goToStudentsPage(page);
    await switchToPrintMedia(page);
    await expect(studentsPage.createButton).toBeHidden();

    await switchToScreenMedia(page);

    await expect(studentsPage.createButton).toBeVisible();
  });
});
