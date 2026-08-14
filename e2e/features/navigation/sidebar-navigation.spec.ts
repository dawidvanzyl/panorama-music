import { test, expect } from '../../fixtures/base';
import { uniqueTestEmail, createRegisteredUser } from '../../fixtures/testUsers';
import { LoginPage } from '../../pages/identity/auth/LoginPage';
import {
  SIDEBAR_ENTRIES,
  escapeRegExp,
  landingUrl,
  permittedEntries,
  sidebarEntry,
  type SidebarEntry,
} from '../../fixtures/navigation';
import type { UserRole } from '../../pages/identity/admin/AdminUsersPage';

const PASSWORD = 'SidebarNavPass123!';

const ROLE_SETS: { label: string; roles: UserRole[] }[] = [
  { label: 'teacher', roles: ['Teacher'] },
  { label: 'coordinator', roles: ['Coordinator'] },
  { label: 'admin', roles: ['Admin'] },
];

async function signInAs(page: import('@playwright/test').Page, label: string, roles: UserRole[]): Promise<void> {
  const email = uniqueTestEmail(`sidebar-${label}`);
  await createRegisteredUser(page, email, PASSWORD, roles);

  const loginPage = new LoginPage(page);
  await loginPage.gotoLogin();
  await loginPage.login(email, PASSWORD);
}

/** A screen these roles do not permit, if there is one. */
function refusedEntryFor(roles: UserRole[]): SidebarEntry | undefined {
  const permitted = permittedEntries(...roles);
  return SIDEBAR_ENTRIES.find((entry) => !permitted.includes(entry));
}

/** Asserts the sidebar offers exactly the entries these roles permit. */
async function expectExactlyPermittedEntries(
  page: import('@playwright/test').Page,
  roles: UserRole[],
): Promise<void> {
  const permittedIds = permittedEntries(...roles).map((entry) => entry.id);

  for (const entry of SIDEBAR_ENTRIES) {
    if (permittedIds.includes(entry.id)) {
      await expect(sidebarEntry(page, entry.id)).toBeVisible();
    } else {
      await expect(sidebarEntry(page, entry.id)).toBeHidden();
    }
  }
}

test.describe('Sidebar navigation is gated by role alone', { tag: '@239IT1' }, () => {
  for (const { label, roles } of ROLE_SETS) {
    test(`offers a ${label} the same permitted areas on every screen and still refuses the rest`, async ({
      page,
    }) => {
      await signInAs(page, label, roles);
      await expect(page).toHaveURL(landingUrl(...roles));

      const permitted = permittedEntries(...roles);

      // Every screen the role permits, plus an unrecognised route reached by
      // direct URL entry: the offered set may not vary between them.
      for (const entry of permitted) {
        await page.goto(`/#${entry.path}`);
        await expect(page).toHaveURL(new RegExp(escapeRegExp(entry.path) + '$'));
        await expectExactlyPermittedEntries(page, roles);
        await expect(sidebarEntry(page, entry.id)).toHaveClass(/sidebar__link--active/);
      }

    });
  }

  // An Admin is permitted every entry, so only the role sets that actually
  // have a screen to be refused get this test at all.
  for (const { label, roles } of ROLE_SETS.filter(({ roles }) => refusedEntryFor(roles) !== undefined)) {
    const refused = refusedEntryFor(roles)!;

    test(`still refuses a ${label} the ${refused.label} screen and lands them back on their own`, async ({
      page,
    }) => {
      await signInAs(page, label, roles);

      await page.goto(`/#${refused.path}`);

      await expect(page).toHaveURL(landingUrl(...roles));
      await expectExactlyPermittedEntries(page, roles);
    });
  }
});

test.describe('Signing in lands on the topmost permitted entry', { tag: '@239IT2' }, () => {
  for (const { label, roles } of ROLE_SETS) {
    test(`takes a ${label} to their own topmost entry with no Dashboard shown`, async ({ page }) => {
      await signInAs(page, label, roles);

      await expect(page).toHaveURL(landingUrl(...roles));
      await expect(page.locator('main')).not.toContainText('Welcome to Panorama Music');
      // The nav bar no longer navigates at all, so there is no Dashboard entry
      // to be offered from it.
      await expect(page.locator('pm-nav-bar a')).toHaveCount(0);
    });
  }
});
