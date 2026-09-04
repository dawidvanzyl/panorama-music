import type { Browser, Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToStudentsPage, goToWaitingListPage, loginAsRoles } from '../../fixtures/testUsers';
import { seedEnrollmentTarget, seedEnrolledStudent } from '../../fixtures/enrollment';
import {
  seedWaitingListEntry,
  fetchStudentById,
  type SeededWaitingListEntry,
} from '../../fixtures/waitingList';
import {
  addGuardianToStudent,
  attemptUpdateGuardian,
  fetchGuardians,
  unlinkGuardianFromStudent,
  type SeededGuardian,
} from '../../fixtures/guardians';
import { linkSiblings } from '../../fixtures/siblings';
import { StudentsPage } from '../../pages/students/StudentsPage';
import { WaitingListPage } from '../../pages/students/WaitingListPage';

/**
 * Three sessions appear below, and which one does what is load-bearing.
 *
 * Seeding needs Teacher: creating a student and enrolling one are both
 * Teacher-gated, and the Students screen — the only place an enrolled
 * sibling's own guardians can be read back — is a Teacher-owned area. That is
 * `goToStudentsPage`, which signs in holding Teacher and Coordinator.
 *
 * The restriction under test applies to a caller who does NOT hold Teacher, so
 * every scenario's acting session is Coordinator-only, in its own browser
 * context. A caller holding both roles is unrestricted, so seeding and acting
 * through one session would silently prove nothing.
 *
 * The Teacher direction (the last scenario) gets a third, Teacher-only session
 * for the same reason: it must be a Teacher who performs the edit.
 */
let seedCounter = 0;

function uniqueSurname(label: string): string {
  seedCounter += 1;
  return `${label}-${Date.now()}-${test.info().workerIndex}-${seedCounter}`;
}

interface CoordinatorSession {
  page: Page;
  waitingList: WaitingListPage;
  close: () => Promise<void>;
}

async function signInAsCoordinator(browser: Browser): Promise<CoordinatorSession> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const waitingList = await goToWaitingListPage(page, ['Coordinator']);
  return { page, waitingList, close: () => context.close() };
}

interface SiblingFamily {
  entry: SeededWaitingListEntry;
  enrolledStudentId: string;
  enrolledName: string;
  /** The roster's name filter matches one name part, so the surname is what narrows it. */
  enrolledSurname: string;
}

/** A waiting-list student and an enrolled student, linked as siblings, with no guardians yet. */
async function seedWaitingAndEnrolledSiblings(page: Page): Promise<SiblingFamily> {
  const target = await seedEnrollmentTarget(page);
  const enrolledStudentId = await seedEnrolledStudent(page, target);
  const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
  await linkSiblings(page, entry.studentId, enrolledStudentId);

  const enrolled = await fetchStudentById(page, enrolledStudentId);
  return {
    entry,
    enrolledStudentId,
    enrolledName: `${enrolled.firstName} ${enrolled.lastName}`,
    enrolledSurname: enrolled.lastName!,
  };
}

/**
 * The same pair, now sharing one guardian: it is added after the link exists,
 * so it propagates to both and belongs to the enrolled student as much as to
 * the waiting-list one.
 */
async function seedSharedGuardianFamily(
  page: Page
): Promise<SiblingFamily & { guardian: SeededGuardian }> {
  const family = await seedWaitingAndEnrolledSiblings(page);
  const guardian = await addGuardianToStudent(page, family.enrolledStudentId, {
    firstName: 'Shared',
    surname: uniqueSurname('Guardian'),
  });
  return { ...family, guardian };
}

test.describe(
  'A Coordinator fully maintains the guardians of a waiting-list student with no siblings',
  { tag: '@272IT41' },
  () => {
    test('the guardian offers its edit action, with no restriction shown', async ({
      page,
      browser,
    }) => {
      await goToStudentsPage(page);
      const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
      const guardian = await addGuardianToStudent(page, entry.studentId, {
        firstName: 'Sole',
        surname: uniqueSurname('Guardian'),
      });

      const coordinator = await signInAsCoordinator(browser);
      const { waitingList } = coordinator;

      await waitingList.openGuardiansTab(
        waitingList.rowFor('During School', entry.lastName)
      );

      const row = waitingList.guardianRow(guardian.fullName);
      await expect(row).toBeVisible();
      await expect(waitingList.guardianEditButton(guardian.fullName)).toBeVisible();
      await expect(waitingList.guardianEditButton(guardian.fullName)).toBeEnabled();
      await expect(waitingList.guardianRestrictionIcon(guardian.fullName)).toHaveCount(0);
      await expect(waitingList.guardianRestrictionText(guardian.fullName)).toHaveCount(0);

      await coordinator.close();
    });
  }
);

test.describe(
  'A guardian shared with an enrolled sibling is not maintainable, and says why',
  { tag: '@272IT42' },
  () => {
    test('the row offers no edit action and carries an information affordance', async ({
      page,
      browser,
    }) => {
      await goToStudentsPage(page);
      const family = await seedSharedGuardianFamily(page);

      const coordinator = await signInAsCoordinator(browser);
      const { waitingList } = coordinator;

      await waitingList.openGuardiansTab(
        waitingList.rowFor('During School', family.entry.lastName)
      );

      const name = family.guardian.fullName;
      await expect(waitingList.guardianRow(name)).toBeVisible();
      await expect(waitingList.guardianEditButton(name)).toHaveCount(0);

      const info = waitingList.guardianRestrictionIcon(name);
      await expect(info).toBeVisible();
      await info.click();

      const reason = waitingList.guardianRestrictionText(name);
      await expect(reason).toBeVisible();
      await expect(reason).toContainText('shared with an enrolled student');
      await expect(reason).toContainText('not maintainable here');

      await coordinator.close();
    });
  }
);

test.describe(
  'Restriction is per guardian, not per student',
  { tag: '@272IT43' },
  () => {
    test('a guardian the enrolled sibling does not hold stays fully maintainable', async ({
      page,
      browser,
    }) => {
      await goToStudentsPage(page);
      const family = await seedSharedGuardianFamily(page);

      // Linking two students shares each one's guardians with the other, so a
      // guardian belonging to the waiting-list student alone is reached by
      // adding it and then removing the enrolled sibling's own link to it.
      const privateGuardian = await addGuardianToStudent(page, family.entry.studentId, {
        firstName: 'Private',
        surname: uniqueSurname('Guardian'),
      });
      await unlinkGuardianFromStudent(page, family.enrolledStudentId, privateGuardian.guardianId);

      const coordinator = await signInAsCoordinator(browser);
      const { waitingList } = coordinator;

      await waitingList.openGuardiansTab(
        waitingList.rowFor('During School', family.entry.lastName)
      );

      // Both are on the same tab: the shared one is restricted and the private
      // one is not, which is the whole point of the scenario.
      await expect(waitingList.guardianEditButton(family.guardian.fullName)).toHaveCount(0);

      const name = privateGuardian.fullName;
      await expect(waitingList.guardianRow(name)).toBeVisible();
      await expect(waitingList.guardianEditButton(name)).toBeVisible();
      await expect(waitingList.guardianEditButton(name)).toBeEnabled();
      await expect(waitingList.guardianRestrictionIcon(name)).toHaveCount(0);

      await coordinator.close();
    });
  }
);

test.describe(
  'A guardian shared with a sibling who is also waiting stays fully maintainable',
  { tag: '@272IT44' },
  () => {
    test('nothing enrolled depends on it, so no restriction is shown', async ({
      page,
      browser,
    }) => {
      await goToStudentsPage(page);
      const first = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
      const second = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
      await linkSiblings(page, first.studentId, second.studentId);

      const guardian = await addGuardianToStudent(page, first.studentId, {
        firstName: 'Waiting',
        surname: uniqueSurname('Guardian'),
      });

      // The precondition itself: the guardian really is shared by both.
      const secondsGuardians = await fetchGuardians(page, second.studentId);
      expect(secondsGuardians.map((g) => g.guardianId)).toContain(guardian.guardianId);

      const coordinator = await signInAsCoordinator(browser);
      const { waitingList } = coordinator;

      await waitingList.openGuardiansTab(waitingList.rowFor('During School', first.lastName));

      const name = guardian.fullName;
      await expect(waitingList.guardianEditButton(name)).toBeVisible();
      await expect(waitingList.guardianEditButton(name)).toBeEnabled();
      await expect(waitingList.guardianRestrictionIcon(name)).toHaveCount(0);

      await coordinator.close();
    });
  }
);

test.describe(
  "Unlinking a shared guardian leaves the enrolled sibling's own link intact",
  { tag: '@272IT45' },
  () => {
    test('it is removed from the waiting-list student and still held by the sibling', async ({
      page,
      browser,
    }) => {
      const studentsPage = await goToStudentsPage(page);
      const family = await seedSharedGuardianFamily(page);

      const coordinator = await signInAsCoordinator(browser);
      const { waitingList } = coordinator;

      await waitingList.openGuardiansTab(
        waitingList.rowFor('During School', family.entry.lastName)
      );

      const name = family.guardian.fullName;
      await waitingList.guardianDeleteButton(name).click();

      // The record itself cannot go, so no scope is offered — the removal is
      // this student's association and nothing else.
      await expect(waitingList.guardianDeleteRestrictedMessage()).toBeVisible();
      await expect(waitingList.guardianDeleteScopeChoice()).toBeHidden();
      await waitingList.confirmGuardianDelete();

      await expect(waitingList.guardianRow(name)).toHaveCount(0);

      // The enrolled sibling, read from the screen that owns them.
      await page.reload();
      await studentsPage.filterByName(family.enrolledSurname);
      await studentsPage.openGuardiansTab(family.enrolledName);
      await expect(studentsPage.guardianListRow(name)).toBeVisible();

      await coordinator.close();
    });
  }
);

test.describe(
  'A new guardian added to a waiting-list student does not reach their enrolled sibling',
  { tag: '@272IT46' },
  () => {
    test('it appears on the waiting-list student only', async ({ page, browser }) => {
      const studentsPage = await goToStudentsPage(page);
      const family = await seedWaitingAndEnrolledSiblings(page);

      const coordinator = await signInAsCoordinator(browser);
      const { waitingList } = coordinator;

      await waitingList.openGuardiansTab(
        waitingList.rowFor('During School', family.entry.lastName)
      );

      const surname = uniqueSurname('Added');
      const fullName = `Newly ${surname}`;
      await waitingList.addGuardian({
        firstName: 'Newly',
        surname,
        relationshipLabel: 'Mother',
        cell: '0827654321',
      });

      await expect(waitingList.guardianRow(fullName)).toBeVisible();

      await page.reload();
      await studentsPage.filterByName(family.enrolledSurname);
      await studentsPage.openGuardiansTab(family.enrolledName);
      await expect(studentsPage.guardianListRow(fullName)).toHaveCount(0);

      await coordinator.close();
    });
  }
);

test.describe(
  "Syncing pulls the enrolled sibling's guardians in and pushes nothing out",
  { tag: '@272IT47' },
  () => {
    test('the missing guardian arrives and the sibling is left as it was', async ({
      page,
      browser,
    }) => {
      const studentsPage = await goToStudentsPage(page);
      const family = await seedWaitingAndEnrolledSiblings(page);

      // A guardian the enrolled sibling holds and the waiting-list student does
      // not: linking shares guardians both ways, so the state is reached by
      // adding it and then removing the waiting-list student's own link.
      const guardian = await addGuardianToStudent(page, family.enrolledStudentId, {
        firstName: 'Enrolled',
        surname: uniqueSurname('Guardian'),
      });
      await unlinkGuardianFromStudent(page, family.entry.studentId, guardian.guardianId);

      const coordinator = await signInAsCoordinator(browser);
      const { waitingList } = coordinator;

      await waitingList.openGuardiansTab(
        waitingList.rowFor('During School', family.entry.lastName)
      );

      await expect(waitingList.guardianRow(guardian.fullName)).toHaveCount(0);
      await expect(waitingList.syncGuardiansButton()).toBeVisible();
      await waitingList.syncGuardians();

      await expect(waitingList.guardianRow(guardian.fullName)).toBeVisible();

      // Nothing was written outward: the sibling still holds exactly the one
      // guardian they held before the sync.
      await page.reload();
      await studentsPage.filterByName(family.enrolledSurname);
      await studentsPage.openGuardiansTab(family.enrolledName);
      await expect(studentsPage.guardianListRow(guardian.fullName)).toBeVisible();
      await expect(studentsPage.guardianListRows()).toHaveCount(1);

      await coordinator.close();
    });
  }
);

test.describe(
  'The restriction is the API’s, not the screen’s',
  { tag: '@272IT48' },
  () => {
    test('an edit of a restricted guardian submitted directly is refused', async ({
      page,
      browser,
    }) => {
      await goToStudentsPage(page);
      const family = await seedSharedGuardianFamily(page);

      const coordinator = await signInAsCoordinator(browser);

      // Deliberately no UI path: the screen offers a Coordinator no edit
      // control for this guardian at all, so the only way to ask whether the
      // server itself refuses the write is to make the request.
      const status = await attemptUpdateGuardian(coordinator.page, family.guardian.guardianId, {
        firstName: 'Rewritten',
        surname: uniqueSurname('ByCoordinator'),
        cell: '0119999999',
        email: 'rewritten@example.com',
      });

      // Refused specifically, not merely unsuccessful: a 404 or a validation
      // failure would satisfy "not a 2xx" without proving the rule at all.
      expect(status).toBe(403);

      const [unchanged] = (await fetchGuardians(coordinator.page, family.entry.studentId)).filter(
        (g) => g.guardianId === family.guardian.guardianId
      );
      expect(unchanged).toBeDefined();
      expect(unchanged.firstName).toBe(family.guardian.firstName);
      expect(unchanged.surname).toBe(family.guardian.surname);
      expect(unchanged.cell).toBe(family.guardian.cell);
      expect(unchanged.email).toBe(family.guardian.email);

      await coordinator.close();
    });
  }
);

test.describe('A Teacher keeps the rights this story scopes', { tag: '@272IT49' }, () => {
  test('a Teacher edits the same guardian a Coordinator may not', async ({ page, browser }) => {
    await goToStudentsPage(page);
    const family = await seedSharedGuardianFamily(page);

    // A Teacher who is not also a Coordinator, so the unrestricted path is
    // proven for the role the rule exempts rather than for a role mixture.
    const teacherContext = await browser.newContext();
    const teacherPage = await teacherContext.newPage();
    await loginAsRoles(teacherPage, ['Teacher']);
    const teacherStudents = new StudentsPage(teacherPage);
    await teacherStudents.gotoStudents();

    await teacherStudents.filterByName(family.enrolledSurname);
    await teacherStudents.openGuardiansTab(family.enrolledName);

    const name = family.guardian.fullName;
    await expect(teacherStudents.guardianListRow(name)).toBeVisible();
    await expect(teacherStudents.guardianRestrictionIcon(name)).toHaveCount(0);

    const correctedSurname = uniqueSurname('EditedByTeacher');
    await teacherStudents.editGuardian(name, { surname: correctedSurname });

    await expect(
      teacherStudents.guardianListRow(`${family.guardian.firstName} ${correctedSurname}`)
    ).toBeVisible();
    await expect(teacherStudents.guardianListRow(name)).toHaveCount(0);

    await teacherContext.close();
  });
});
