import type { Browser, Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToStudentsPage, goToWaitingListPage, loginAsRoles } from '../../fixtures/testUsers';
import { seedEnrollmentTarget, seedEnrolledStudent } from '../../fixtures/enrollment';
import { seedWaitingListEntry, fetchStudentById } from '../../fixtures/waitingList';
import { linkSiblings } from '../../fixtures/siblings';
import { StudentsPage, type StudentInput } from '../../pages/students/StudentsPage';
import { WaitingListPage } from '../../pages/students/WaitingListPage';

/**
 * Three kinds of session appear below, and which one does what is load-bearing.
 *
 * Seeding needs Teacher and Coordinator together: creating a student is
 * Teacher-gated, and creating the course and teacher an enrolled student needs
 * is Coordinator-gated. That is `goToStudentsPage`.
 *
 * The acting session is always single-role, in its own browser context. The
 * widened candidate read is available to Teacher *or* Coordinator, and a
 * session holding both would hide a read that had been gated on only one of
 * them. So every Waiting List scenario acts as a Coordinator holding no other
 * role, and every Students screen scenario as a Teacher holding no other role.
 */
let seedCounter = 0;

/** A surname unique to this run, so a listing can be read scoped to one family. */
function uniqueFamilySurname(): string {
  seedCounter += 1;
  return `Family-${Date.now()}-${test.info().workerIndex}-${seedCounter}`;
}

/** The student a capture or create wizard is filled in with; never saved below. */
function newStudent(surname: string): StudentInput {
  return {
    firstName: 'Captured',
    lastName: surname,
    dateOfBirth: '2013-07-14',
    grade: 'Grade4',
    class: 'A1',
    phase: 'Junior',
    language: 'English',
  };
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

interface TeacherSession {
  page: Page;
  students: StudentsPage;
  close: () => Promise<void>;
}

async function signInAsTeacher(browser: Browser): Promise<TeacherSession> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await loginAsRoles(page, ['Teacher']);
  const students = new StudentsPage(page);
  await students.gotoStudents();
  return { page, students, close: () => context.close() };
}

interface SeededPair {
  waitingName: string;
  waitingSurname: string;
  waitingStudentId: string;
  enrolledName: string;
  enrolledSurname: string;
  enrolledStudentId: string;
}

/**
 * One waiting-list student and one enrolled student, each under their own
 * unique surname so each is searched for separately, and unlinked.
 */
async function seedOneOfEach(page: Page): Promise<SeededPair> {
  const target = await seedEnrollmentTarget(page);
  const enrolledStudentId = await seedEnrolledStudent(page, target);
  const enrolled = await fetchStudentById(page, enrolledStudentId);
  const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });

  return {
    waitingName: `${entry.firstName} ${entry.lastName}`,
    waitingSurname: entry.lastName,
    waitingStudentId: entry.studentId,
    enrolledName: `${enrolled.firstName} ${enrolled.lastName}`,
    enrolledSurname: enrolled.lastName!,
    enrolledStudentId,
  };
}

/**
 * The same two students under one run-unique family surname, so a listing read
 * scoped to that surname is expected to hold exactly one row. Their first names
 * differ (`Waiting` and `Amara`), which is what tells the two apart inside the
 * family.
 */
async function seedOneFamilyOfEach(page: Page): Promise<SeededPair & { familySurname: string }> {
  const familySurname = uniqueFamilySurname();

  const target = await seedEnrollmentTarget(page);
  const enrolledStudentId = await seedEnrolledStudent(page, target, familySurname);
  const enrolled = await fetchStudentById(page, enrolledStudentId);
  const entry = await seedWaitingListEntry(page, {
    occurrenceType: 'DuringSchool',
    lastName: familySurname,
  });

  return {
    familySurname,
    waitingName: `${entry.firstName} ${entry.lastName}`,
    waitingSurname: entry.lastName,
    waitingStudentId: entry.studentId,
    enrolledName: `${enrolled.firstName} ${enrolled.lastName}`,
    enrolledSurname: enrolled.lastName!,
    enrolledStudentId,
  };
}

test.describe(
  'The capture wizard offers a student already on the waiting list',
  { tag: '@272IT50' },
  () => {
    test('S1 — the seeded waiting-list student is among the candidates and can be picked', async ({
      page,
      browser,
    }) => {
      await goToStudentsPage(page);
      const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
      const waitingName = `${entry.firstName} ${entry.lastName}`;

      const coordinator = await signInAsCoordinator(browser);
      const { waitingList } = coordinator;

      await waitingList.openCaptureWizard();
      await waitingList.fillStudentFields(newStudent(uniqueFamilySurname()));
      await waitingList.goToNextStep();

      // Candidates exist, so the step is the search rather than its stand-in.
      await expect(waitingList.siblingsPlaceholder()).toBeHidden();

      await waitingList.searchSiblingCandidates(entry.lastName);
      await expect(waitingList.siblingCandidateResult(waitingName)).toBeVisible();

      await waitingList.addSibling(waitingName);
      await expect(waitingList.siblingListRow(waitingName)).toBeVisible();

      // Nothing is saved: the capture is abandoned once the tab has been read.
      await waitingList.closeWizard();

      await coordinator.close();
    });
  },
);

test.describe('The capture wizard still offers an enrolled student', { tag: '@272IT51' }, () => {
  test('S2 — the enrolled student is among the candidates and can be picked', async ({
    page,
    browser,
  }) => {
    await goToStudentsPage(page);
    const target = await seedEnrollmentTarget(page);
    const enrolledStudentId = await seedEnrolledStudent(page, target);
    const enrolled = await fetchStudentById(page, enrolledStudentId);
    const enrolledName = `${enrolled.firstName} ${enrolled.lastName}`;

    const coordinator = await signInAsCoordinator(browser);
    const { waitingList } = coordinator;

    await waitingList.openCaptureWizard();
    await waitingList.fillStudentFields(newStudent(uniqueFamilySurname()));
    await waitingList.goToNextStep();

    await waitingList.searchSiblingCandidates(enrolled.lastName!);
    await expect(waitingList.siblingCandidateResult(enrolledName)).toBeVisible();

    await waitingList.addSibling(enrolledName);
    await expect(waitingList.siblingListRow(enrolledName)).toBeVisible();

    await waitingList.closeWizard();

    await coordinator.close();
  });
});

test.describe(
  "The Students screen's create wizard offers a waiting-list student",
  { tag: '@272IT52' },
  () => {
    test('S3 — a Teacher is offered the waiting-list student and can pick them', async ({
      page,
      browser,
    }) => {
      await goToStudentsPage(page);
      const entry = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
      const waitingName = `${entry.firstName} ${entry.lastName}`;

      const teacher = await signInAsTeacher(browser);
      const { students } = teacher;

      await students.startCreatingStudent(newStudent(uniqueFamilySurname()));
      await students.goToNextStep();

      await students.searchSiblingCandidates(entry.lastName);
      await expect(students.siblingCandidateResult(waitingName)).toBeVisible();

      await students.addSibling(waitingName);
      await expect(students.siblingListRow(waitingName)).toBeVisible();

      await students.closeWizard();

      await teacher.close();
    });
  },
);

test.describe(
  'An enrolled sibling of a waiting-list student is not listed on the Waiting List',
  { tag: '@272IT53' },
  () => {
    test('S4 — the family holds exactly one row there, and it is the waiting-list student', async ({
      page,
      browser,
    }) => {
      await goToStudentsPage(page);
      const family = await seedOneFamilyOfEach(page);

      const coordinator = await signInAsCoordinator(browser);
      const { waitingList } = coordinator;

      // The link is made through the wizard's own controls, not the fixture:
      // giving the waiting-list wizard a path to a cross-population link is
      // this story's central claim.
      await waitingList.openSiblingsTab(
        waitingList.rowFor('During School', family.familySurname),
      );
      await waitingList.addSibling(family.enrolledName);
      await expect(waitingList.siblingListRow(family.enrolledName)).toBeVisible();
      await waitingList.closeWizard();

      await coordinator.page.reload();

      // Read scoped to the family, and counted. "Our student is present" would
      // hold whether or not the enrolled sibling leaked in beside them; this
      // fails the moment the widened read reaches the listing.
      const familyRows = waitingList.rowFor('During School', family.familySurname);
      await expect(familyRows).toHaveCount(1);
      await expect(waitingList.studentName(familyRows)).toContainText(family.waitingName);

      await expect(waitingList.allRows().filter({ hasText: family.enrolledName })).toHaveCount(0);

      // The link survived the read — a listing kept clean by dropping the link
      // is not the behaviour asked for.
      await waitingList.openSiblingsTab(
        waitingList.rowFor('During School', family.familySurname),
      );
      await expect(waitingList.siblingListRow(family.enrolledName)).toBeVisible();

      await coordinator.close();
    });
  },
);

test.describe(
  'A waiting-list sibling of an enrolled student is not listed on the Students screen',
  { tag: '@272IT54' },
  () => {
    test('S5 — the family holds exactly one row there, and it is the enrolled student', async ({
      page,
      browser,
    }) => {
      await goToStudentsPage(page);
      const family = await seedOneFamilyOfEach(page);

      const teacher = await signInAsTeacher(browser);
      const { students } = teacher;

      // The other direction from S4: the link is made from the enrolled
      // student's own wizard.
      await students.filterByName(family.familySurname);
      await students.openSiblingsTab(family.enrolledName);
      await students.addSibling(family.waitingName);
      await expect(students.siblingListRow(family.waitingName)).toBeVisible();
      await students.closeWizard();

      await teacher.page.reload();
      await students.filterByName(family.familySurname);

      const listedFamily = students.listedStudentNames().filter({ hasText: family.familySurname });
      await expect(listedFamily).toHaveCount(1);
      await expect(listedFamily).toHaveText(family.enrolledName);
      await expect(
        students.listedStudentNames().filter({ hasText: family.waitingName }),
      ).toHaveCount(0);

      await students.clearFilters();
      await students.filterByName(family.waitingSurname);
      await expect(
        students.listedStudentNames().filter({ hasText: family.waitingName }),
      ).toHaveCount(0);

      await students.clearFilters();
      await students.filterByName(family.familySurname);
      await students.openSiblingsTab(family.enrolledName);
      await expect(students.siblingListRow(family.waitingName)).toBeVisible();

      await teacher.close();
    });
  },
);

test.describe('Each candidate states which listing it belongs to', { tag: '@272IT55' }, () => {
  test('S6 — both states carry their own affordance, in the capture wizard', async ({
    page,
    browser,
  }) => {
    await goToStudentsPage(page);
    const pair = await seedOneOfEach(page);

    const coordinator = await signInAsCoordinator(browser);
    const { waitingList } = coordinator;

    await waitingList.openCaptureWizard();
    await waitingList.fillStudentFields(newStudent(uniqueFamilySurname()));
    await waitingList.goToNextStep();

    await waitingList.searchSiblingCandidates(pair.waitingSurname);
    const waitingIcon = waitingList.siblingCandidatePopulationIcon(pair.waitingName);
    await expect(waitingIcon).toBeVisible();
    await expect(waitingIcon).toHaveAttribute('title', /on the waiting list/);
    await expect(waitingIcon).toHaveAttribute('aria-label', /on the waiting list/);
    // The two affordances must state different things: one generic affordance
    // on every row would satisfy "an icon is present" while telling the reader
    // nothing. Each row is therefore denied the other's wording.
    await expect(waitingIcon).not.toHaveAttribute('title', /enrolled/);
    await expect(waitingIcon).not.toHaveAttribute('aria-label', /enrolled/);

    await waitingList.searchSiblingCandidates(pair.enrolledSurname);
    const enrolledIcon = waitingList.siblingCandidatePopulationIcon(pair.enrolledName);
    await expect(enrolledIcon).toBeVisible();
    await expect(enrolledIcon).toHaveAttribute('title', /enrolled/);
    await expect(enrolledIcon).toHaveAttribute('aria-label', /enrolled/);
    await expect(enrolledIcon).not.toHaveAttribute('title', /waiting list/);
    await expect(enrolledIcon).not.toHaveAttribute('aria-label', /waiting list/);

    await waitingList.closeWizard();

    await coordinator.close();
  });

  test("S7 — the same is true in the Students screen's wizard", async ({ page, browser }) => {
    await goToStudentsPage(page);
    const pair = await seedOneOfEach(page);

    const teacher = await signInAsTeacher(browser);
    const { students } = teacher;

    await students.startCreatingStudent(newStudent(uniqueFamilySurname()));
    await students.goToNextStep();

    await students.searchSiblingCandidates(pair.waitingSurname);
    const waitingIcon = students.siblingCandidatePopulationIcon(pair.waitingName);
    await expect(waitingIcon).toBeVisible();
    await expect(waitingIcon).toHaveAttribute('title', /on the waiting list/);
    await expect(waitingIcon).toHaveAttribute('aria-label', /on the waiting list/);
    await expect(waitingIcon).not.toHaveAttribute('title', /enrolled/);
    await expect(waitingIcon).not.toHaveAttribute('aria-label', /enrolled/);

    await students.searchSiblingCandidates(pair.enrolledSurname);
    const enrolledIcon = students.siblingCandidatePopulationIcon(pair.enrolledName);
    await expect(enrolledIcon).toBeVisible();
    await expect(enrolledIcon).toHaveAttribute('title', /enrolled/);
    await expect(enrolledIcon).toHaveAttribute('aria-label', /enrolled/);
    await expect(enrolledIcon).not.toHaveAttribute('title', /waiting list/);
    await expect(enrolledIcon).not.toHaveAttribute('aria-label', /waiting list/);

    await students.closeWizard();

    await teacher.close();
  });
});

test.describe('Each linked sibling states its own listing', { tag: '@272IT56' }, () => {
  test('S8 — a mixed sibling group, read from the edit wizard', async ({ page, browser }) => {
    await goToStudentsPage(page);

    const subject = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    const waitingSibling = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });
    const target = await seedEnrollmentTarget(page);
    const enrolledStudentId = await seedEnrolledStudent(page, target);
    const enrolled = await fetchStudentById(page, enrolledStudentId);

    // Linking is this scenario's precondition, not its subject — S4 and S5
    // already prove the UI path — so the fixture is the right tool for it.
    await linkSiblings(page, subject.studentId, waitingSibling.studentId);
    await linkSiblings(page, subject.studentId, enrolledStudentId);

    const waitingSiblingName = `${waitingSibling.firstName} ${waitingSibling.lastName}`;
    const enrolledName = `${enrolled.firstName} ${enrolled.lastName}`;

    const coordinator = await signInAsCoordinator(browser);
    const { waitingList } = coordinator;

    await waitingList.openSiblingsTab(waitingList.rowFor('During School', subject.lastName));

    await expect(waitingList.siblingListRows()).toHaveCount(2);

    const waitingIcon = waitingList.siblingPopulationIcon(waitingSiblingName);
    await expect(waitingIcon).toBeVisible();
    await expect(waitingIcon).toHaveAttribute('title', /on the waiting list/);
    await expect(waitingIcon).toHaveAttribute('aria-label', /on the waiting list/);

    const enrolledIcon = waitingList.siblingPopulationIcon(enrolledName);
    await expect(enrolledIcon).toBeVisible();
    await expect(enrolledIcon).toHaveAttribute('title', /enrolled/);
    await expect(enrolledIcon).toHaveAttribute('aria-label', /enrolled/);

    // Two rows in one table, differing only by the linked student's own state:
    // an icon derived from the wizard's mode would render the same thing twice,
    // so each row is denied the other's wording.
    await expect(waitingIcon).not.toHaveAttribute('title', /enrolled/);
    await expect(waitingIcon).not.toHaveAttribute('aria-label', /enrolled/);
    await expect(enrolledIcon).not.toHaveAttribute('title', /waiting list/);
    await expect(enrolledIcon).not.toHaveAttribute('aria-label', /waiting list/);

    await coordinator.close();
  });

  test('S9 — a staged sibling carries its state before anything is saved', async ({
    page,
    browser,
  }) => {
    await goToStudentsPage(page);
    const pair = await seedOneOfEach(page);

    const teacher = await signInAsTeacher(browser);
    const { students } = teacher;

    await students.startCreatingStudent(newStudent(uniqueFamilySurname()));
    await students.goToNextStep();

    await students.addSibling(pair.waitingName);
    await students.addSibling(pair.enrolledName);

    // Read without saving: in create mode a picked candidate is moved into the
    // table locally, so the row is rendered from what the wizard is holding
    // rather than from a read of a saved link.
    const waitingIcon = students.siblingPopulationIcon(pair.waitingName);
    await expect(waitingIcon).toBeVisible();
    await expect(waitingIcon).toHaveAttribute('title', /on the waiting list/);
    await expect(waitingIcon).toHaveAttribute('aria-label', /on the waiting list/);

    const enrolledIcon = students.siblingPopulationIcon(pair.enrolledName);
    await expect(enrolledIcon).toBeVisible();
    await expect(enrolledIcon).toHaveAttribute('title', /enrolled/);
    await expect(enrolledIcon).toHaveAttribute('aria-label', /enrolled/);

    await expect(waitingIcon).not.toHaveAttribute('title', /enrolled/);
    await expect(waitingIcon).not.toHaveAttribute('aria-label', /enrolled/);
    await expect(enrolledIcon).not.toHaveAttribute('title', /waiting list/);
    await expect(enrolledIcon).not.toHaveAttribute('aria-label', /waiting list/);

    await students.closeWizard();

    await teacher.close();
  });
});
