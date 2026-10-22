import type { Page, Route } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import {
  goToTeachersPage,
  goToTeachersPageAsBankingCoordinator,
} from '../../fixtures/testUsers';
import { switchToPrintMedia, switchToScreenMedia } from '../../fixtures/printMedia';
import { TeacherDetailPage } from '../../pages/teachers/TeacherDetailPage';
import type { TeachersPage } from '../../pages/teachers/TeachersPage';

const BANKING = {
  bank: 'StandardBank',
  accountType: 'Savings',
  branchCode: '051001',
  accountNumber: '1234567890',
};

function randomSuffix(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

interface OwnTeacher {
  firstName: string;
  surname: string;
  fullName: string;
  teacherId: string;
}

/** Creates a teacher of the scenario's own through the create section and opens its detail page. */
async function createAndOpenTeacher(
  page: Page,
  teachersPage: TeachersPage,
  label: string,
): Promise<OwnTeacher> {
  const firstName = `E2E-${label}`;
  const surname = randomSuffix();
  const fullName = `${firstName} ${surname}`;

  await teachersPage.createTeacher({ firstName, surname });
  await expect(teachersPage.row(fullName)).toBeVisible();
  await teachersPage.openTeacher(fullName);
  await page.waitForURL(/#\/teachers\/[^/?#]+$/);

  const teacherId = new URL(page.url()).hash.split('/').pop()!;
  return { firstName, surname, fullName, teacherId };
}

type SaveBehaviour = { kind: 'hold' } | { kind: 'fail'; message: string };

interface ProfileSaveInterceptor {
  /** Requests received so far. */
  readonly received: () => number;
  /** Failures the interceptor has answered with so far. */
  readonly answered: () => number;
  behaviour: SaveBehaviour;
}

/**
 * Intercepts only the PUT of the given teacher's profile. It never passes the
 * request on, so no profile is changed: a held request is never answered, and
 * a failing one is answered with a server error carrying the message.
 */
async function interceptProfileSave(
  page: Page,
  teacherId: string,
  initial: SaveBehaviour,
): Promise<ProfileSaveInterceptor> {
  let received = 0;
  let answered = 0;
  const interceptor: ProfileSaveInterceptor = {
    received: () => received,
    answered: () => answered,
    behaviour: initial,
  };

  await page.route(
    (url) => url.pathname === `/api/teachers/${teacherId}/profile`,
    async (route: Route) => {
      if (route.request().method() !== 'PUT') {
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
    },
  );

  return interceptor;
}

/** Where the loading icon and the label text start, measured in the browser. */
async function iconAndLabelLeftEdges(detail: TeacherDetailPage): Promise<{ icon: number; label: number }> {
  return detail.profileSaveButton.evaluate((button) => {
    const icon = button.querySelector('[data-testid="button-loading-icon"]');
    const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
    let labelLeft = Number.NaN;
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.textContent && node.textContent.trim() === 'Save') {
        const range = document.createRange();
        range.selectNodeContents(node);
        labelLeft = range.getBoundingClientRect().left;
        break;
      }
    }
    return { icon: icon ? icon.getBoundingClientRect().left : Number.NaN, label: labelLeft };
  });
}

async function expectProfileFormIdle(detail: TeacherDetailPage): Promise<void> {
  await expect(detail.profileSaveButton).toBeEnabled();
  await expect(detail.profileCancelButton).toBeEnabled();
  await expect(detail.profileSaveButton).not.toHaveAttribute('aria-busy', 'true');
  await expect(detail.profileSaveLoadingIcon).toHaveCount(0);
  await expect(detail.profileSaveButton).toHaveAccessibleName('Save');
}

async function expectProfileFormBusy(detail: TeacherDetailPage): Promise<void> {
  await expect(detail.profileSaveButton).toBeDisabled();
  await expect(detail.profileSaveButton).toHaveAttribute('aria-busy', 'true');
  await expect(detail.profileSaveButton).toHaveAccessibleName('Save');
  await expect(detail.profileSaveLoadingIcon).toBeVisible();
  await expect(detail.profileCancelButton).toBeDisabled();
}

/** Opens the profile edit form for a fresh teacher, changes the first name and saves while the save is held. */
async function startHeldSave(page: Page): Promise<{ detail: TeacherDetailPage; interceptor: ProfileSaveInterceptor }> {
  const teachersPage = await goToTeachersPage(page);
  const teacher = await createAndOpenTeacher(page, teachersPage, 'busy');
  const interceptor = await interceptProfileSave(page, teacher.teacherId, { kind: 'hold' });
  const detail = new TeacherDetailPage(page);

  await detail.editButton.click();
  await detail.editForm.locator('#firstName').fill('E2E-busy-renamed');
  await expectProfileFormIdle(detail);

  await detail.profileSaveButton.click();
  await expect.poll(() => interceptor.received()).toBe(1);

  return { detail, interceptor };
}

test.describe(
  'Form buttons — a confirm action that sends a request is busy while it runs',
  { tag: ['@267IT3'] },
  () => {
    test('Save is busy while the request is held', async ({ page }) => {
      const { detail } = await startHeldSave(page);

      await expectProfileFormBusy(detail);

      const edges = await iconAndLabelLeftEdges(detail);
      expect(edges.icon).toBeLessThan(edges.label);

      await expect(detail.editForm).toBeVisible();
      await expect(detail.editForm.locator('#firstName')).toHaveValue('E2E-busy-renamed');
    });

    test('a second click sends nothing more', async ({ page }) => {
      const { detail, interceptor } = await startHeldSave(page);

      await detail.profileSaveButton.click({ force: true, noWaitAfter: true, timeout: 2000 }).catch(() => undefined);

      await expect(detail.profileSaveButton).toHaveAttribute('aria-busy', 'true');
      expect(interceptor.received()).toBe(1);
    });
  },
);

test.describe(
  'Form buttons — a failed request restores the confirm action',
  { tag: ['@267IT4'] },
  () => {
    const startFailingSave = async (
      page: Page,
    ): Promise<{ detail: TeacherDetailPage; teacher: OwnTeacher; interceptor: ProfileSaveInterceptor; message: string; newSurname: string }> => {
      const teachersPage = await goToTeachersPage(page);
      const teacher = await createAndOpenTeacher(page, teachersPage, 'fail');
      const message = `Stubbed profile refusal ${randomSuffix()}`;
      const interceptor = await interceptProfileSave(page, teacher.teacherId, { kind: 'fail', message });
      const detail = new TeacherDetailPage(page);
      const newSurname = `renamed-${randomSuffix()}`;

      await detail.editButton.click();
      await detail.editForm.locator('#firstName').fill('E2E-fail-renamed');
      await detail.editForm.locator('#surname').fill(newSurname);
      await detail.profileSaveButton.click();
      await expect.poll(() => interceptor.answered()).toBe(1);

      return { detail, teacher, interceptor, message, newSurname };
    };

    test('a failed save keeps the values and restores the buttons', async ({ page }) => {
      const { detail, message, newSurname } = await startFailingSave(page);

      await expect(detail.editForm).toBeVisible();
      await expect(detail.editForm.locator('#firstName')).toHaveValue('E2E-fail-renamed');
      await expect(detail.editForm.locator('#surname')).toHaveValue(newSurname);
      await expectProfileFormIdle(detail);
      await expect(detail.profileFormError).toHaveText(message);
    });

    test('nothing was saved', async ({ page }) => {
      const { detail, teacher } = await startFailingSave(page);

      await page.reload();

      await expect(detail.firstName()).toHaveText(teacher.firstName);
      await expect(detail.surname()).toHaveText(teacher.surname);
    });

    test('after a failure, Save can be tried again', async ({ page }) => {
      const { detail, interceptor } = await startFailingSave(page);

      interceptor.behaviour = { kind: 'hold' };
      await detail.profileSaveButton.click();
      await expect.poll(() => interceptor.received()).toBe(2);

      await expectProfileFormBusy(detail);
    });

    test('after a failure, Cancel leaves edit mode', async ({ page }) => {
      const { detail, teacher } = await startFailingSave(page);

      await detail.profileCancelButton.click();

      await expect(detail.editForm).toBeHidden();
      await expect(detail.firstName()).toHaveText(teacher.firstName);
      await expect(detail.surname()).toHaveText(teacher.surname);
    });
  },
);

test.describe(
  'Form buttons — Cancel comes first and the confirm action is last',
  { tag: ['@267IT8'] },
  () => {
    test('Cancel then Save, and nothing after Save', async ({ page }) => {
      const teachersPage = await goToTeachersPage(page);
      await createAndOpenTeacher(page, teachersPage, 'order');
      const detail = new TeacherDetailPage(page);

      await detail.editButton.click();
      await expect(detail.editForm).toBeVisible();

      const controls = detail.profileFormActions.locator('button, input, select, textarea, a');
      await expect(controls).toHaveCount(2);
      await expect(controls.nth(0)).toHaveAccessibleName('Cancel');
      await expect(controls.nth(1)).toHaveAccessibleName('Save');

      const row = await detail.profileFormActions.boundingBox();
      const cancel = await controls.nth(0).boundingBox();
      const save = await controls.nth(1).boundingBox();
      expect(row).not.toBeNull();
      expect(cancel).not.toBeNull();
      expect(save).not.toBeNull();

      expect(cancel!.x + cancel!.width).toBeLessThan(save!.x);
      expect(Math.abs(save!.x + save!.width - (row!.x + row!.width))).toBeLessThanOrEqual(1);
    });
  },
);

test.describe(
  'Form buttons — the banking details form confirms with Save',
  { tag: ['@267IT21'] },
  () => {
    const openBankingEdit = async (page: Page): Promise<TeacherDetailPage> => {
      const teachersPage = await goToTeachersPageAsBankingCoordinator(page);
      await createAndOpenTeacher(page, teachersPage, 'banking-edit');
      const detail = new TeacherDetailPage(page);

      await detail.captureBankingDetails(BANKING);
      await detail.bankingEditButton.click();
      await expect(detail.bankingForm).toBeVisible();
      return detail;
    };

    test('the edit form confirms with "Save"', async ({ page }) => {
      const detail = await openBankingEdit(page);

      await expect(detail.bankingFormConfirm).toHaveAccessibleName('Save');
      await expect(detail.bankingForm.getByRole('button', { name: 'Save changes' })).toHaveCount(0);
      await expect(detail.bankingForm.getByRole('button', { name: 'Save banking details' })).toHaveCount(0);

      const controls = detail.bankingFormActions.locator('button');
      await expect(controls).toHaveCount(2);
      await expect(controls.nth(0)).toHaveAccessibleName('Cancel');
      await expect(controls.nth(1)).toHaveAccessibleName('Save');
    });

    test('Save still saves', async ({ page }) => {
      const detail = await openBankingEdit(page);

      await detail.saveBankingDetails({ bank: 'Capitec', accountType: BANKING.accountType, branchCode: '470010' });
      await page.reload();

      await expect(detail.bankingSection).toContainText('Capitec');
    });
  },
);

test.describe(
  'Form buttons — the banking activity modal dismisses with Cancel',
  { tag: ['@267IT24'] },
  () => {
    const openActivityModal = async (page: Page): Promise<TeacherDetailPage> => {
      const teachersPage = await goToTeachersPageAsBankingCoordinator(page);
      await createAndOpenTeacher(page, teachersPage, 'banking-activity');
      const detail = new TeacherDetailPage(page);

      await detail.captureBankingDetails(BANKING);
      await detail.bankingActivityButton.click();
      await expect(detail.bankingActivityModal).toHaveAttribute('open', '');
      return detail;
    };

    test('the dismiss action reads "Cancel"', async ({ page }) => {
      const detail = await openActivityModal(page);

      await expect(detail.bankingActivityModal.getByRole('button', { name: 'Cancel', exact: true })).toBeVisible();
      await expect(detail.bankingActivityModal.getByRole('button', { name: 'Close', exact: true })).toHaveCount(0);
    });

    test('Cancel closes the modal', async ({ page }) => {
      const detail = await openActivityModal(page);

      await detail.bankingActivityModal.getByRole('button', { name: 'Cancel', exact: true }).click();

      await expect(detail.bankingActivityModal).not.toHaveAttribute('open', '');
      await expect(detail.header).toBeVisible();
    });
  },
);

test.describe(
  'Form buttons — a printed page shows no form buttons',
  { tag: ['@267IT40'] },
  () => {
    const openProfileForm = async (page: Page): Promise<TeacherDetailPage> => {
      const teachersPage = await goToTeachersPage(page);
      await createAndOpenTeacher(page, teachersPage, 'print');
      const detail = new TeacherDetailPage(page);

      await detail.editButton.click();
      await expect(detail.profileFormActions).toBeVisible();
      await expect(detail.profileSaveButton).toBeVisible();
      await expect(detail.profileCancelButton).toBeVisible();
      return detail;
    };

    test('print media hides the form buttons and action row', async ({ page }) => {
      const detail = await openProfileForm(page);

      await switchToPrintMedia(page);

      await expect(detail.profileFormActions).toBeHidden();
      await expect(detail.profileSaveButton).toBeHidden();
      await expect(detail.profileCancelButton).toBeHidden();
      await expect(detail.editForm.locator('#firstName')).toBeVisible();
      await expect(detail.editForm.locator('#surname')).toBeVisible();
    });

    test('back on screen, the buttons return', async ({ page }) => {
      const detail = await openProfileForm(page);

      await switchToPrintMedia(page);
      await expect(detail.profileFormActions).toBeHidden();
      await switchToScreenMedia(page);

      await expect(detail.profileFormActions).toBeVisible();
      await expect(detail.profileSaveButton).toBeVisible();
      await expect(detail.profileCancelButton).toBeVisible();
    });
  },
);
