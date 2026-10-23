import type { Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import {
  goToTeachersPage,
  goToTeachersPageAsBankingCoordinator,
} from '../../fixtures/testUsers';
import { uniqueToken } from '../../fixtures/studentPrint';
import { TeacherDetailPage } from '../../pages/teachers/TeacherDetailPage';
import type { TeachersPage } from '../../pages/teachers/TeachersPage';

/** Creates a teacher with no banking details and opens its detail page. */
async function openNewTeacher(page: Page, teachersPage: TeachersPage): Promise<TeacherDetailPage> {
  const firstName = 'Entry';
  const surname = `Pt${uniqueToken()}`;
  await teachersPage.createTeacher({ firstName, surname });
  await teachersPage.openTeacher(`${firstName} ${surname}`);
  return new TeacherDetailPage(page);
}

test.describe(
  'Entry points — the banking section offers "Create Banking Details"',
  { tag: ['@267IT33'] },
  () => {
    test('the entry point reads "Create Banking Details"', async ({ page }) => {
      const detailPage = await openNewTeacher(page, await goToTeachersPageAsBankingCoordinator(page));
      await expect(detailPage.bankingSection).toContainText('No banking details captured.');

      await expect(
        detailPage.bankingSection.getByRole('button', { name: 'Create Banking Details', exact: true }),
      ).toBeVisible();
      await expect(detailPage.bankingSection.getByRole('button', { name: 'Add banking details' })).toHaveCount(0);
      await expect(detailPage.bankingSection.getByRole('button', { name: /^Add/ })).toHaveCount(0);
    });

    test('it still opens the form', async ({ page }) => {
      const detailPage = await openNewTeacher(page, await goToTeachersPageAsBankingCoordinator(page));
      const entryPoint = detailPage.bankingSection.getByRole('button', {
        name: 'Create Banking Details',
        exact: true,
      });

      await entryPoint.click();

      await expect(detailPage.bankingForm).toBeVisible();
      await expect(entryPoint).toBeHidden();
    });

    test('a Coordinator is not offered it', async ({ page }) => {
      const detailPage = await openNewTeacher(page, await goToTeachersPage(page));
      await expect(detailPage.bankingSection).toBeVisible();
      await expect(detailPage.bankingSection).toContainText('No banking details captured.');

      await expect(
        detailPage.bankingSection.getByRole('button', { name: 'Create Banking Details', exact: true }),
      ).toHaveCount(0);
    });
  },
);
