import type { Page, Request } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import {
  createRegisteredUser,
  goToExtraCurricularsPageAsCoordinator,
  uniqueTestEmail,
} from '../../fixtures/testUsers';
import { LoginPage } from '../../pages/identity/auth/LoginPage';
import { ExtraCurricularsPage, slotsText } from '../../pages/extra-curriculars/ExtraCurricularsPage';
import { landingUrl, permittedEntries, sidebarEntry } from '../../fixtures/navigation';
import type { UserRole } from '../../pages/identity/admin/AdminUsersPage';

const PASSWORD = 'ExtraCurricularPass123!';

interface CreateRequestBody {
  description: string;
  phase: string;
  practiceTimes: { day: string; startTime: string }[];
}

/** Whether a request is a create against the activities endpoint. */
function isCreateRequest(request: Request): boolean {
  return request.method() === 'POST' && new URL(request.url()).pathname === '/api/extra-curriculars';
}

/**
 * An activity's description is free text, so a per-run unique one is what keeps
 * these scenarios independent of each other under parallel workers. No
 * scenario below asserts a total row count or a globally empty table.
 */
function uniqueDescription(label: string): string {
  return `e2e ${label} ${Date.now()} ${crypto.randomUUID()}`;
}

/** Signs a freshly registered user of these roles in, and returns their email. */
async function signInAsNewUser(page: Page, label: string, roles: UserRole[]) {
  const email = uniqueTestEmail(label);
  await createRegisteredUser(page, email, PASSWORD, roles);

  const loginPage = new LoginPage(page);
  await loginPage.gotoLogin();
  await loginPage.login(email, PASSWORD);
  await expect(page).toHaveURL(landingUrl(...roles));
  return email;
}

/**
 * Issues a create from inside the page, so the request carries the signed-in
 * user's bearer token — `page.request` would send none and prove only the
 * anonymous case.
 */
async function postCreateFromPage(page: Page, body: CreateRequestBody): Promise<number> {
  return page.evaluate(async (payload: CreateRequestBody) => {
    const response = await fetch('/api/extra-curriculars', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('pm_access_token')}`,
      },
      body: JSON.stringify(payload),
    });
    return response.status;
  }, body);
}

test.describe('Extra-Curriculars — creating and reading activities', { tag: ['@10IT1'] }, () => {
  test('lists a created activity, empties the form, and still has it after a reload', async ({ page }) => {
    const description = uniqueDescription('Marimba Band');
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    await activitiesPage.createActivity(description, 'Junior', [{ day: 'Monday', startTime: '15:00' }]);

    const row = activitiesPage.row(description);
    await expect(row).toBeVisible();
    await expect(row).toContainText('Junior');
    await expect(activitiesPage.practiceTimesCell(row)).toHaveText('Monday 15:00');

    // The form returns to its empty state, ready for the next activity.
    await expect(activitiesPage.descriptionInput()).toHaveValue('');
    await expect(activitiesPage.phaseSelect()).toHaveValue('');
    await expect(activitiesPage.noSlotsMessage()).toBeVisible();
    await expect(activitiesPage.noSlotsMessage()).toHaveText('No practice times added.');

    // Persisted, not merely reflected in client state.
    await activitiesPage.reloadExtraCurriculars();
    const reloaded = activitiesPage.row(description);
    await expect(reloaded).toBeVisible();
    await expect(reloaded).toContainText('Junior');
    await expect(activitiesPage.practiceTimesCell(reloaded)).toHaveText('Monday 15:00');
  });
});

test.describe('Extra-Curriculars — filtering by phase', { tag: ['@10IT3'] }, () => {
  test('narrows the list to the selected phase and restores it', async ({ page }) => {
    const token = uniqueDescription('phase-filter');
    const juniorDescription = `${token} Junior Choir`;
    const seniorDescription = `${token} Senior Band`;
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    // The shared day and time is deliberate: it proves the narrowing is by
    // phase, and not incidentally by anything else.
    await activitiesPage.createActivity(juniorDescription, 'Junior', [{ day: 'Tuesday', startTime: '14:00' }]);
    await expect(activitiesPage.row(juniorDescription)).toBeVisible();
    await activitiesPage.createActivity(seniorDescription, 'Senior', [{ day: 'Tuesday', startTime: '14:00' }]);
    await expect(activitiesPage.row(seniorDescription)).toBeVisible();
    await expect(activitiesPage.row(juniorDescription)).toBeVisible();

    await activitiesPage.filterByPhase('Senior');
    await expect(activitiesPage.row(seniorDescription)).toBeVisible();
    await expect(activitiesPage.row(juniorDescription)).toHaveCount(0);

    await activitiesPage.filterByPhase('Junior');
    await expect(activitiesPage.row(juniorDescription)).toBeVisible();
    await expect(activitiesPage.row(seniorDescription)).toHaveCount(0);

    await activitiesPage.filterByPhase('All Phases');
    await expect(activitiesPage.row(juniorDescription)).toBeVisible();
    await expect(activitiesPage.row(seniorDescription)).toBeVisible();
  });

  test('shows the empty-state message when the phase matches nothing', async ({ page }) => {
    const description = uniqueDescription('empty-phase');
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    await activitiesPage.createActivity(description, 'Junior', [{ day: 'Thursday', startTime: '13:00' }]);
    await expect(activitiesPage.row(description)).toBeVisible();

    // Scoping by the unique description is what makes an empty table safe to
    // assert while other workers are creating activities of their own.
    await activitiesPage.filterByDescription(description);
    await expect(activitiesPage.row(description)).toBeVisible();

    await activitiesPage.filterByPhase('Senior');

    await expect(activitiesPage.row(description)).toHaveCount(0);
    await expect(activitiesPage.emptyMessage()).toBeVisible();
    await expect(activitiesPage.emptyMessage()).toHaveText('No extra-curricular activities found.');
  });
});

test.describe('Extra-Curriculars — a practice time is a day and a time of day', { tag: ['@10IT4'] }, () => {
  test('round-trips a leading-zero, non-round time and shows it in 24-hour form', async ({ page }) => {
    const description = uniqueDescription('time-round-trip');
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    await activitiesPage.createActivity(description, 'Senior', [{ day: 'Wednesday', startTime: '07:30' }]);
    await expect(activitiesPage.row(description)).toBeVisible();

    // Rendered from a value read back from storage, not from the create
    // response held in memory.
    await activitiesPage.reloadExtraCurriculars();

    // The exact cell text, so a `1970-01-01T07:30:00Z` leak, a seconds
    // component, an AM/PM suffix or a timezone marker fails outright.
    const row = activitiesPage.row(description);
    await expect(activitiesPage.practiceTimesCell(row)).toHaveText('Wednesday 07:30');
  });
});

test.describe('Extra-Curriculars — several practice times on one activity', { tag: ['@10IT5'] }, () => {
  test('persists every slot staged at create and shows them in day-then-time order', async ({ page }) => {
    const description = uniqueDescription('many-slots');
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    await activitiesPage.enterActivity(description, 'Junior');
    // Staged deliberately out of order.
    await activitiesPage.stageSlot({ day: 'Friday', startTime: '14:00' });
    await activitiesPage.stageSlot({ day: 'Monday', startTime: '16:00' });
    await activitiesPage.stageSlot({ day: 'Monday', startTime: '09:15' });
    await expect(activitiesPage.chips()).toHaveCount(3);

    await activitiesPage.submit();

    // The joined string, not three independent substring checks: the ordering
    // is the part of this criterion a naive implementation gets wrong.
    const expected = slotsText(
      { day: 'Monday', startTime: '09:15' },
      { day: 'Monday', startTime: '16:00' },
      { day: 'Friday', startTime: '14:00' },
    );
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(description))).toHaveText(expected);

    await activitiesPage.reloadExtraCurriculars();
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(description))).toHaveText(expected);
  });

  test('never persists a staged slot that was removed before saving', async ({ page }) => {
    const description = uniqueDescription('removed-slot');
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    await activitiesPage.enterActivity(description, 'Senior');
    await activitiesPage.stageSlot({ day: 'Monday', startTime: '15:00' });
    await activitiesPage.stageSlot({ day: 'Tuesday', startTime: '15:00' });
    await activitiesPage.stageSlot({ day: 'Thursday', startTime: '15:00' });
    await expect(activitiesPage.chips()).toHaveCount(3);

    await activitiesPage.removeStagedSlot({ day: 'Tuesday', startTime: '15:00' });

    await expect(activitiesPage.chip({ day: 'Tuesday', startTime: '15:00' })).toHaveCount(0);
    await expect(activitiesPage.chip({ day: 'Monday', startTime: '15:00' })).toBeVisible();
    await expect(activitiesPage.chip({ day: 'Thursday', startTime: '15:00' })).toBeVisible();
    await expect(activitiesPage.chips()).toHaveCount(2);

    await activitiesPage.submit();

    // A remove that only hid the chip would send three slots and fail here.
    const expected = slotsText({ day: 'Monday', startTime: '15:00' }, { day: 'Thursday', startTime: '15:00' });
    await expect(activitiesPage.practiceTimesCell(activitiesPage.row(description))).toHaveText(expected);
  });
});

test.describe('Extra-Curriculars — a duplicate practice time is refused', { tag: ['@10IT7'] }, () => {
  test('refuses a duplicate day and start time, names the slot, and disturbs nothing else', async ({ page }) => {
    const description = uniqueDescription('duplicate-slot');
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    await activitiesPage.enterActivity(description, 'Junior');
    await activitiesPage.stageSlot({ day: 'Monday', startTime: '15:00' });
    await expect(activitiesPage.chips()).toHaveCount(1);

    await activitiesPage.stageSlot({ day: 'Monday', startTime: '15:00' });

    // The message must name both the day and the start time of the refused slot.
    await expect(activitiesPage.formError()).toBeVisible();
    await expect(activitiesPage.formError()).toContainText('Monday');
    await expect(activitiesPage.formError()).toContainText('15:00');

    await expect(activitiesPage.chip({ day: 'Monday', startTime: '15:00' })).toHaveCount(1);
    await expect(activitiesPage.chips()).toHaveCount(1);

    // A refusal, not a reset: what was entered is still there.
    await expect(activitiesPage.descriptionInput()).toHaveValue(description);
    await expect(activitiesPage.phaseSelect()).toHaveValue('Junior');
  });

  test('accepts a differing start time on the same day', async ({ page }) => {
    const description = uniqueDescription('same-day-slots');
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    await activitiesPage.enterActivity(description, 'Junior');
    await activitiesPage.stageSlot({ day: 'Monday', startTime: '15:00' });
    await activitiesPage.stageSlot({ day: 'Monday', startTime: '16:00' });

    // The boundary that stops the guard being written as "one slot per day".
    await expect(activitiesPage.chip({ day: 'Monday', startTime: '15:00' })).toBeVisible();
    await expect(activitiesPage.chip({ day: 'Monday', startTime: '16:00' })).toBeVisible();
    await expect(activitiesPage.chips()).toHaveCount(2);
  });

  test('refuses a duplicate pair at the endpoint, with nothing left persisted', async ({ page }) => {
    const description = uniqueDescription('duplicate-endpoint');
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    // The form's staging guard is client-side; a rule enforced only in the
    // browser is not enforced.
    const status = await postCreateFromPage(page, {
      description,
      phase: 'Junior',
      practiceTimes: [
        { day: 'Monday', startTime: '15:00' },
        { day: 'Monday', startTime: '15:00' },
      ],
    });
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);

    await activitiesPage.reloadExtraCurriculars();
    await expect(activitiesPage.row(description)).toHaveCount(0);
  });
});

test.describe('Extra-Curriculars — an activity with no practice times is refused', { tag: ['@10IT8'] }, () => {
  test('shows the banner, sends no request, and keeps what was entered', async ({ page }) => {
    const description = uniqueDescription('no-slots');
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    await expect(activitiesPage.noSlotsMessage()).toHaveText('No practice times added.');
    await activitiesPage.enterActivity(description, 'Junior');

    // Observed directly, rather than inferred from the absence of a row.
    const createRequests: Request[] = [];
    const recordCreate = (request: Request) => createRequests.push(request);
    page.on('request', recordCreate);

    await activitiesPage.submit();

    await expect(activitiesPage.formError()).toHaveText('An activity must have at least one practice time.');
    expect(createRequests.filter(isCreateRequest)).toHaveLength(0);
    page.off('request', recordCreate);

    await expect(activitiesPage.row(description)).toHaveCount(0);

    // The refusal does not discard the user's work.
    await expect(activitiesPage.descriptionInput()).toHaveValue(description);
    await expect(activitiesPage.phaseSelect()).toHaveValue('Junior');

    await activitiesPage.reloadExtraCurriculars();
    await expect(activitiesPage.row(description)).toHaveCount(0);
  });

  test('refuses an empty slot collection at the endpoint, with nothing left persisted', async ({ page }) => {
    const description = uniqueDescription('no-slots-endpoint');
    const activitiesPage = await goToExtraCurricularsPageAsCoordinator(page);

    const status = await postCreateFromPage(page, { description, phase: 'Senior', practiceTimes: [] });
    expect(status).toBeGreaterThanOrEqual(400);
    expect(status).toBeLessThan(500);

    await activitiesPage.reloadExtraCurriculars();
    await expect(activitiesPage.row(description)).toHaveCount(0);
  });
});

test.describe('Extra-Curriculars — the endpoints require authentication', { tag: ['@10IT10'] }, () => {
  test('refuses an anonymous caller both the listing and the create endpoint', async ({ page }) => {
    // `page.request` attaches no bearer token, so this is the anonymous case.
    const list = await page.request.get('/api/extra-curriculars');
    const create = await page.request.post('/api/extra-curriculars', {
      data: {
        description: uniqueDescription('anonymous'),
        phase: 'Junior',
        practiceTimes: [{ day: 'Monday', startTime: '15:00' }],
      },
    });

    expect(list.status()).toBe(401);
    expect(create.status()).toBe(401);
  });

  test('offers a Teacher the list with no create form, and refuses them the create endpoint', async ({ page }) => {
    const description = uniqueDescription('teacher-read');
    const coordinatorPage = await goToExtraCurricularsPageAsCoordinator(page);
    await coordinatorPage.createActivity(description, 'Junior', [{ day: 'Monday', startTime: '15:00' }]);
    await expect(coordinatorPage.row(description)).toBeVisible();

    await signInAsNewUser(page, 'ec-teacher', ['Teacher']);

    const activitiesPage = new ExtraCurricularsPage(page);
    await activitiesPage.gotoExtraCurriculars();

    // Reading the catalogue is open to a Teacher.
    await expect(activitiesPage.filterBar).toBeVisible();
    await expect(activitiesPage.activityTable).toBeVisible();
    await expect(activitiesPage.row(description)).toBeVisible();
    // Absent, not disabled.
    await expect(activitiesPage.activityForm).toBeHidden();
    await expect(activitiesPage.actionsHeader()).toBeHidden();

    const refusedDescription = uniqueDescription('teacher-create');
    const status = await postCreateFromPage(page, {
      description: refusedDescription,
      phase: 'Junior',
      practiceTimes: [{ day: 'Monday', startTime: '15:00' }],
    });
    expect(status).toBe(403);

    await activitiesPage.reloadExtraCurriculars();
    await expect(activitiesPage.row(refusedDescription)).toHaveCount(0);
  });

  test('refuses a user whose only role is Admin the screen and both endpoints', async ({ page }) => {
    await signInAsNewUser(page, 'ec-admin-only', ['Admin']);

    await expect(sidebarEntry(page, 'extraCurricularsLink')).toBeHidden();

    const activitiesPage = new ExtraCurricularsPage(page);
    await activitiesPage.gotoExtraCurriculars();

    // The route guard refuses it.
    await expect(page).not.toHaveURL(/#\/extra-curriculars$/);
    await expect(activitiesPage.activityTable).toHaveCount(0);

    const listStatus = await page.evaluate(async () => {
      const response = await fetch('/api/extra-curriculars', {
        headers: { Authorization: `Bearer ${localStorage.getItem('pm_access_token')}` },
      });
      return response.status;
    });
    expect(listStatus).toBe(403);

    const createStatus = await postCreateFromPage(page, {
      description: uniqueDescription('admin-only-create'),
      phase: 'Junior',
      practiceTimes: [{ day: 'Monday', startTime: '15:00' }],
    });
    expect(createStatus).toBe(403);
  });

  for (const roles of [['Coordinator'], ['Teacher']] as UserRole[][]) {
    test(`offers a ${roles[0]} the Extra-Curriculars entry in its stated position`, async ({ page }) => {
      await signInAsNewUser(page, `ec-sidebar-${roles[0].toLowerCase()}`, roles);

      await expect(sidebarEntry(page, 'extraCurricularsLink')).toBeVisible();

      // Read the sidebar's own rendered order and compare it against the whole
      // expected ordering, so a move of the entry — in either direction — fails
      // outright rather than passing a one-sided position check.
      const offeredIds = await page
        .locator('pm-sidebar a.sidebar__link:not([hidden])')
        .evaluateAll((links) => links.map((link) => link.id));

      expect(offeredIds).toEqual(permittedEntries(...roles).map((entry) => entry.id));
    });
  }
});
