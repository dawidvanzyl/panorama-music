import { test, expect } from '../../fixtures/base';
import { uniqueTestEmail, createRegisteredUser } from '../../fixtures/testUsers';
import { LoginPage } from '../../pages/identity/auth/LoginPage';
import { sidebarEntry } from '../../fixtures/navigation';
import type { UserRole } from '../../pages/identity/admin/AdminUsersPage';

const PASSWORD = 'WaitingListNavPass123!';

async function signInAs(page: import('@playwright/test').Page, label: string, roles: UserRole[]): Promise<void> {
  const email = uniqueTestEmail(`wl-sidebar-${label}`);
  await createRegisteredUser(page, email, PASSWORD, roles);

  const loginPage = new LoginPage(page);
  await loginPage.gotoLogin();
  await loginPage.login(email, PASSWORD);
}

test.describe('The sidebar offers a Waiting List entry to a Teacher', { tag: '@272IT23' }, () => {
  test('a Teacher sees the Waiting List entry, positioned after Students and before Teachers', async ({ page }) => {
    await signInAs(page, 'teacher', ['Teacher']);

    await expect(sidebarEntry(page, 'waitingListLink')).toBeVisible();

    // Every entry is rendered into the DOM (hidden ones just carry the
    // `hidden` attribute), so the id order below is the sidebar's true
    // render order regardless of which entries this role is permitted.
    const order = await page.locator('pm-sidebar a').evaluateAll((links) => links.map((el) => el.id));
    const studentsIndex = order.indexOf('studentManagementLink');
    const waitingListIndex = order.indexOf('waitingListLink');
    const teachersIndex = order.indexOf('teachersLink');

    expect(waitingListIndex).toBeGreaterThan(studentsIndex);
    expect(teachersIndex).toBeGreaterThan(waitingListIndex);
  });
});

test.describe('The sidebar offers a Waiting List entry to a Coordinator', { tag: '@272IT24' }, () => {
  test('a Coordinator sees the Waiting List entry, positioned after Students and before Teachers', async ({
    page,
  }) => {
    await signInAs(page, 'coordinator', ['Coordinator']);

    await expect(sidebarEntry(page, 'waitingListLink')).toBeVisible();

    const order = await page.locator('pm-sidebar a').evaluateAll((links) => links.map((el) => el.id));
    const studentsIndex = order.indexOf('studentManagementLink');
    const waitingListIndex = order.indexOf('waitingListLink');
    const teachersIndex = order.indexOf('teachersLink');

    expect(waitingListIndex).toBeGreaterThan(studentsIndex);
    expect(teachersIndex).toBeGreaterThan(waitingListIndex);
  });
});

test.describe(
  'The sidebar does not offer a Waiting List entry to a role that is neither Teacher nor Coordinator',
  { tag: '@272IT25' },
  () => {
    for (const { label, roles } of [
      { label: 'admin', roles: ['Admin'] as UserRole[] },
      { label: 'bankingcoordinator', roles: ['BankingCoordinator'] as UserRole[] },
    ]) {
      test(`a ${label} is not offered the Waiting List entry`, async ({ page }) => {
        await signInAs(page, label, roles);

        await expect(sidebarEntry(page, 'waitingListLink')).toBeHidden();
      });
    }
  },
);
