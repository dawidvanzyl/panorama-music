import type { Browser, Page } from '@playwright/test';
import { test, expect } from '../../fixtures/base';
import { goToStudentsPage, goToWaitingListPage } from '../../fixtures/testUsers';
import {
  seedEnrollmentTarget,
  seedEnrolledStudent,
  type SeededEnrollmentTarget,
} from '../../fixtures/enrollment';
import {
  seedWaitingListEntry,
  seedCourseOfType,
  fetchLessonStructureId,
  fetchStructureWithoutInstrumentCourse,
  attemptEnrolFromWaitingList,
  fetchStudentEnrollments,
  fetchStudentById,
  type SeededWaitingListEntry,
} from '../../fixtures/waitingList';
import { addGuardianToStudent, fetchGuardians, type SeededGuardian } from '../../fixtures/guardians';
import { linkSiblings } from '../../fixtures/siblings';
import { waitingListEntryExists } from '../../fixtures/db';
import { WaitingListPage } from '../../pages/students/WaitingListPage';

/**
 * Two sessions appear below, and which one does what is load-bearing.
 *
 * The seeding session holds Teacher and Coordinator (`goToStudentsPage`):
 * creating a student, creating the enrolled sibling and enrolling them are all
 * Teacher-gated, and the Students screen is the only place the enrolled
 * sibling's own guardians can be read back through the UI.
 *
 * Every enrolment is driven from a Coordinator-only session in its own browser
 * context. The reconciliation writes links to a record an enrolled student
 * depends on, which is exactly what the guardian maintenance scope withholds
 * from a Coordinator elsewhere. A session holding Teacher is not subject to
 * that scope, so enrolling through one would pass for an implementation that
 * reuses the scoped add-path and still withholds for a real Coordinator.
 *
 * The same Coordinator context also adds the withheld guardian, because only a
 * caller subject to the scope can produce the state these scenarios repair.
 *
 * Seeding order is the other load-bearing thing here. Linking two students
 * shares each one's existing guardians with the other, and the add path links a
 * new guardian to whichever siblings exist at the moment it runs — so the
 * siblings are linked while neither holds any guardian, and only then is the
 * guardian added. Reaching the same state with an unlink would leave these
 * specs green against an implementation that repairs an unlink but not a
 * withholding.
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

interface EnrolledSibling {
  studentId: string;
  fullName: string;
  /** The roster's name filter matches one name part, so the surname is what narrows it. */
  surname: string;
}

async function seedSibling(page: Page, target: SeededEnrollmentTarget): Promise<EnrolledSibling> {
  const studentId = await seedEnrolledStudent(page, target);
  const student = await fetchStudentById(page, studentId);
  return {
    studentId,
    fullName: `${student.firstName} ${student.lastName}`,
    surname: student.lastName!,
  };
}

const guardianIds = (guardians: { guardianId: string }[]): string[] =>
  guardians.map((g) => g.guardianId);

const timesHeld = (guardians: { guardianId: string }[], guardianId: string): number =>
  guardians.filter((g) => g.guardianId === guardianId).length;

test.describe(
  'Enrolling off the waiting list links the family guardian the enrolled sibling was withheld',
  { tag: '@272IT57' },
  () => {
    test('the withheld guardian reaches the enrolled sibling as part of the enrolment', async ({
      page,
      browser,
    }) => {
      const studentsPage = await goToStudentsPage(page);
      const target = await seedEnrollmentTarget(page);
      const enrolled = await seedSibling(page, target);
      const entry = await seedWaitingListEntry(page, {
        occurrenceType: 'DuringSchool',
        lessonType: 'Individual',
        durationType: 'Hour',
        instrumentType: 'Piano',
      });
      await linkSiblings(page, entry.studentId, enrolled.studentId);

      // Added from the Coordinator-only session, after the link exists: the
      // withholding this story repairs, produced by the mechanism that produces
      // it in the school.
      const coordinator = await signInAsCoordinator(browser);
      const guardian = await addGuardianToStudent(coordinator.page, entry.studentId, {
        firstName: 'Withheld',
        surname: uniqueSurname('Guardian'),
      });
      await seedCourseOfType(page, entry.lessonStructureId, 'Instrument');

      // The precondition itself. A scenario whose precondition quietly
      // collapsed looks identical to one that passed.
      const enrolledBefore = await fetchGuardians(page, enrolled.studentId);
      expect(guardianIds(enrolledBefore)).not.toContain(guardian.guardianId);
      expect(guardianIds(await fetchGuardians(page, entry.studentId))).toContain(
        guardian.guardianId
      );

      await coordinator.page.reload();
      const { waitingList } = coordinator;
      await waitingList.openEnrolModal(waitingList.rowFor('During School', entry.lastName));
      await waitingList.chooseEnrolTeacher(target.teacherName);
      await waitingList.enrolStep().selectOption('Step2A');
      await waitingList.confirmEnrol();

      // Accepted on its merits first: a refused enrolment reconciles nothing,
      // and would satisfy every "unchanged" assertion below by accident.
      await expect(waitingList.enrolModal).not.toHaveAttribute('open');
      await expect(waitingList.successBanner).toHaveText(
        `${entry.firstName} ${entry.lastName} was enrolled and removed from the waiting list.`
      );
      await expect(waitingList.rowFor('During School', entry.lastName)).toHaveCount(0);
      expect(await waitingListEntryExists(entry.waitingListEntryId)).toBe(false);

      const enrolledAfter = await fetchGuardians(page, enrolled.studentId);
      expect(timesHeld(enrolledAfter, guardian.guardianId)).toBe(1);

      // Reconciliation adds; it does not rewrite the sibling's own set.
      expect(new Set(guardianIds(enrolledAfter))).toEqual(
        new Set([...guardianIds(enrolledBefore), guardian.guardianId])
      );

      // Read a second time from the screen a Coordinator would actually look
      // at, which is what makes it an observable outcome rather than a row.
      await page.reload();
      await studentsPage.filterByName(enrolled.surname);
      await studentsPage.openGuardiansTab(enrolled.fullName);
      await expect(studentsPage.guardianListRow(guardian.fullName)).toBeVisible();
      await expect(studentsPage.guardianListRows()).toHaveCount(enrolledAfter.length);
      await studentsPage.closeWizard();

      await page.reload();
      await studentsPage.filterByName(enrolled.surname);
      await studentsPage.openGuardiansTab(enrolled.fullName);
      await expect(studentsPage.guardianListRow(guardian.fullName)).toBeVisible();

      // Shared outward, not moved.
      expect(timesHeld(await fetchGuardians(page, entry.studentId), guardian.guardianId)).toBe(1);

      await coordinator.close();
    });

    test('every enrolled sibling gains it and a waiting-list sibling is left alone', async ({
      page,
      browser,
    }) => {
      const studentsPage = await goToStudentsPage(page);
      const target = await seedEnrollmentTarget(page);
      const firstEnrolled = await seedSibling(page, target);
      const secondEnrolled = await seedSibling(page, target);
      const entry = await seedWaitingListEntry(page, {
        occurrenceType: 'DuringSchool',
        lessonType: 'Individual',
        durationType: 'Hour',
        instrumentType: 'Piano',
      });
      const waitingSibling = await seedWaitingListEntry(page, { occurrenceType: 'DuringSchool' });

      await linkSiblings(page, entry.studentId, firstEnrolled.studentId);
      await linkSiblings(page, entry.studentId, secondEnrolled.studentId);
      await linkSiblings(page, entry.studentId, waitingSibling.studentId);

      const coordinator = await signInAsCoordinator(browser);
      const guardian = await addGuardianToStudent(coordinator.page, entry.studentId, {
        firstName: 'Withheld',
        surname: uniqueSurname('Guardian'),
      });
      await seedCourseOfType(page, entry.lessonStructureId, 'Instrument');

      // Withheld from both enrolled siblings, and shared with the one who is
      // also waiting — the scope withholds nothing from a waiting-list sibling.
      expect(guardianIds(await fetchGuardians(page, firstEnrolled.studentId))).not.toContain(
        guardian.guardianId
      );
      expect(guardianIds(await fetchGuardians(page, secondEnrolled.studentId))).not.toContain(
        guardian.guardianId
      );
      const waitingSiblingBefore = await fetchGuardians(page, waitingSibling.studentId);
      expect(timesHeld(waitingSiblingBefore, guardian.guardianId)).toBe(1);

      await coordinator.page.reload();
      const { waitingList } = coordinator;
      await waitingList.openEnrolModal(waitingList.rowFor('During School', entry.lastName));
      await waitingList.chooseEnrolTeacher(target.teacherName);
      await waitingList.enrolStep().selectOption('Step2A');
      await waitingList.confirmEnrol();

      await expect(waitingList.enrolModal).not.toHaveAttribute('open');
      await expect(waitingList.successBanner).toContainText(`${entry.firstName} ${entry.lastName}`);
      expect(await waitingListEntryExists(entry.waitingListEntryId)).toBe(false);

      // Both, each once — this is what catches a reconciliation that stops
      // after the first sibling.
      expect(
        timesHeld(await fetchGuardians(page, firstEnrolled.studentId), guardian.guardianId)
      ).toBe(1);
      expect(
        timesHeld(await fetchGuardians(page, secondEnrolled.studentId), guardian.guardianId)
      ).toBe(1);

      // A student who was never subject to the withholding is not touched twice
      // by its repair, and their own entry is untouched.
      const waitingSiblingAfter = await fetchGuardians(page, waitingSibling.studentId);
      expect(timesHeld(waitingSiblingAfter, guardian.guardianId)).toBe(1);
      expect(waitingSiblingAfter).toHaveLength(waitingSiblingBefore.length);
      expect(await waitingListEntryExists(waitingSibling.waitingListEntryId)).toBe(true);

      await coordinator.page.reload();
      await expect(
        waitingList.rowFor('During School', waitingSibling.lastName)
      ).toBeVisible();

      // Both readings, as in the scenario above: the second enrolled sibling on
      // the screen that owns them.
      await page.reload();
      await studentsPage.filterByName(secondEnrolled.surname);
      await studentsPage.openGuardiansTab(secondEnrolled.fullName);
      await expect(studentsPage.guardianListRow(guardian.fullName)).toBeVisible();

      await coordinator.close();
    });
  }
);

test.describe(
  'An already-shared guardian is not linked to the enrolled sibling a second time',
  { tag: '@272IT58' },
  () => {
    /**
     * This scenario cannot fail on its own: an implementation that reconciles
     * nothing at all passes it. It has meaning only as the pair to the
     * `@272IT57` scenarios and to the mixed-family one below, which fail loudly
     * for that implementation. If those are ever removed or skipped, this stops
     * proving anything and must not be read as coverage.
     */
    test('the sibling still holds it exactly once after the enrolment', async ({
      page,
      browser,
    }) => {
      const studentsPage = await goToStudentsPage(page);
      const target = await seedEnrollmentTarget(page);
      const enrolled = await seedSibling(page, target);
      const entry = await seedWaitingListEntry(page, {
        occurrenceType: 'DuringSchool',
        lessonType: 'Individual',
        durationType: 'Hour',
        instrumentType: 'Piano',
      });
      await linkSiblings(page, entry.studentId, enrolled.studentId);

      // Added from the seeding session, which holds Teacher and is therefore
      // unrestricted, after the link exists — so it propagates to both and
      // belongs to the enrolled student as much as to the waiting-list one.
      const shared = await addGuardianToStudent(page, enrolled.studentId, {
        firstName: 'Shared',
        surname: uniqueSurname('Guardian'),
      });
      await seedCourseOfType(page, entry.lessonStructureId, 'Instrument');

      const enrolledBefore = await fetchGuardians(page, enrolled.studentId);
      expect(timesHeld(enrolledBefore, shared.guardianId)).toBe(1);
      expect(timesHeld(await fetchGuardians(page, entry.studentId), shared.guardianId)).toBe(1);

      const coordinator = await signInAsCoordinator(browser);
      await coordinator.page.reload();
      const { waitingList } = coordinator;
      await waitingList.openEnrolModal(waitingList.rowFor('During School', entry.lastName));
      await waitingList.chooseEnrolTeacher(target.teacherName);
      await waitingList.enrolStep().selectOption('Step2A');
      await waitingList.confirmEnrol();

      await expect(waitingList.enrolModal).not.toHaveAttribute('open');
      await expect(waitingList.successBanner).toContainText(`${entry.firstName} ${entry.lastName}`);
      expect(await waitingListEntryExists(entry.waitingListEntryId)).toBe(false);

      const enrolledAfter = await fetchGuardians(page, enrolled.studentId);
      expect(timesHeld(enrolledAfter, shared.guardianId)).toBe(1);
      expect(enrolledAfter).toHaveLength(enrolledBefore.length);

      // A duplicated link is a thing a Coordinator would see, so it is read off
      // the screen too rather than from the API alone.
      await page.reload();
      await studentsPage.filterByName(enrolled.surname);
      await studentsPage.openGuardiansTab(enrolled.fullName);
      await expect(studentsPage.guardianListRow(shared.fullName)).toHaveCount(1);
      await expect(studentsPage.guardianListRows()).toHaveCount(enrolledBefore.length);

      await coordinator.close();
    });

    test('one shared and one withheld guardian are reconciled in the same enrolment', async ({
      page,
      browser,
    }) => {
      const studentsPage = await goToStudentsPage(page);
      const target = await seedEnrollmentTarget(page);
      const enrolled = await seedSibling(page, target);
      const entry = await seedWaitingListEntry(page, {
        occurrenceType: 'DuringSchool',
        lessonType: 'Individual',
        durationType: 'Hour',
        instrumentType: 'Piano',
      });
      await linkSiblings(page, entry.studentId, enrolled.studentId);

      const shared = await addGuardianToStudent(page, enrolled.studentId, {
        firstName: 'Shared',
        surname: uniqueSurname('Guardian'),
      });

      const coordinator = await signInAsCoordinator(browser);
      const withheld = await addGuardianToStudent(coordinator.page, entry.studentId, {
        firstName: 'Withheld',
        surname: uniqueSurname('Guardian'),
      });
      await seedCourseOfType(page, entry.lessonStructureId, 'Instrument');

      // The realistic family state: one guardian both hold, one the enrolled
      // sibling was withheld. Creating and skipping have to happen in the same
      // operation.
      const enrolledBefore = await fetchGuardians(page, enrolled.studentId);
      expect(guardianIds(enrolledBefore)).toEqual([shared.guardianId]);
      expect(new Set(guardianIds(await fetchGuardians(page, entry.studentId)))).toEqual(
        new Set([shared.guardianId, withheld.guardianId])
      );

      await coordinator.page.reload();
      const { waitingList } = coordinator;
      await waitingList.openEnrolModal(waitingList.rowFor('During School', entry.lastName));
      await waitingList.chooseEnrolTeacher(target.teacherName);
      await waitingList.enrolStep().selectOption('Step2A');
      await waitingList.confirmEnrol();

      await expect(waitingList.enrolModal).not.toHaveAttribute('open');
      await expect(waitingList.successBanner).toContainText(`${entry.firstName} ${entry.lastName}`);
      expect(await waitingListEntryExists(entry.waitingListEntryId)).toBe(false);

      const enrolledAfter = await fetchGuardians(page, enrolled.studentId);
      expect(enrolledAfter).toHaveLength(2);
      expect(timesHeld(enrolledAfter, shared.guardianId)).toBe(1);
      expect(timesHeld(enrolledAfter, withheld.guardianId)).toBe(1);

      // The shared guardian is the same record as before, not a second copy of
      // it wearing the same name — compared by identity, not by the row.
      expect(guardianIds(enrolledAfter)).toContain(shared.guardianId);

      const waitingAfter = await fetchGuardians(page, entry.studentId);
      expect(waitingAfter).toHaveLength(2);
      expect(timesHeld(waitingAfter, shared.guardianId)).toBe(1);
      expect(timesHeld(waitingAfter, withheld.guardianId)).toBe(1);

      await page.reload();
      await studentsPage.filterByName(enrolled.surname);
      await studentsPage.openGuardiansTab(enrolled.fullName);
      await expect(studentsPage.guardianListRows()).toHaveCount(2);
      await expect(studentsPage.guardianListRow(shared.fullName)).toHaveCount(1);
      await expect(studentsPage.guardianListRow(withheld.fullName)).toHaveCount(1);

      await coordinator.close();
    });
  }
);

interface WithheldFamily {
  entry: SeededWaitingListEntry;
  enrolled: EnrolledSibling;
  guardian: SeededGuardian;
  enrolledBefore: { guardianId: string }[];
}

/**
 * The family the refusal scenarios share: a waiting-list student holding a
 * guardian their enrolled sibling does not, produced by the withholding rather
 * than manufactured with an unlink. The entry's structure is the caller's, so a
 * scenario can record it against a structure with no instrument course.
 */
async function seedWithheldFamily(
  page: Page,
  coordinatorPage: Page,
  target: SeededEnrollmentTarget,
  entryOptions: Parameters<typeof seedWaitingListEntry>[1]
): Promise<WithheldFamily> {
  const enrolled = await seedSibling(page, target);
  const entry = await seedWaitingListEntry(page, entryOptions);
  await linkSiblings(page, entry.studentId, enrolled.studentId);

  const guardian = await addGuardianToStudent(coordinatorPage, entry.studentId, {
    firstName: 'Withheld',
    surname: uniqueSurname('Guardian'),
  });

  const enrolledBefore = await fetchGuardians(page, enrolled.studentId);
  expect(guardianIds(enrolledBefore)).not.toContain(guardian.guardianId);
  expect(guardianIds(await fetchGuardians(page, entry.studentId))).toContain(guardian.guardianId);

  return { entry, enrolled, guardian, enrolledBefore };
}

test.describe(
  'A refused enrolment off the waiting list leaves the sibling guardians unchanged',
  { tag: '@272IT59' },
  () => {
    /**
     * A direct-to-API scenario, like its sibling below and for the same kind of
     * reason. The enrol modal's selects now offer only combinations the school
     * runs an instrument course under, so a Coordinator cannot name one that
     * has none and the browser's own required-field validation returns before
     * any request is sent. The refusal underneath is still enforced — it is the
     * safety net for a course deleted after capture — and what this scenario is
     * about is what it leaves the sibling's guardians looking like, which does
     * not depend on which surface raised it.
     */
    test('a refusal raised while resolving the course writes nothing, and the corrected enrolment does', async ({
      page,
      browser,
    }) => {
      await goToStudentsPage(page);

      // The structure the school offers no instrument course for. The fixture
      // fails loudly rather than substituting one that has a course, since the
      // absence is this scenario's refusal.
      const structure = await fetchStructureWithoutInstrumentCourse(page);
      const target = await seedEnrollmentTarget(page);

      const coordinator = await signInAsCoordinator(browser);
      const family = await seedWithheldFamily(page, coordinator.page, target, {
        occurrenceType: structure.occurrenceType,
        lessonType: structure.lessonType,
        durationType: structure.durationType,
        instrumentType: 'Piano',
      });

      // The recovery leg: another combination under the entry's own occurrence
      // type, which does have an instrument course.
      const resolvableStructureId = await fetchLessonStructureId(page, {
        occurrenceType: structure.occurrenceType,
        lessonType: 'Individual',
        durationType: structure.durationType,
      });
      await seedCourseOfType(page, resolvableStructureId, 'Instrument');

      await coordinator.page.reload();
      const { waitingList } = coordinator;

      // The entry's own structure is named, so the refusal cannot be the
      // wrong-occurrence-type one wearing this scenario's name; the teacher
      // exists, so it cannot be a missing-teacher one either.
      const refusal = await attemptEnrolFromWaitingList(
        coordinator.page,
        family.entry.studentId,
        {
          lessonStructureId: family.entry.lessonStructureId,
          teacherId: target.teacherId,
          instrumentType: 'Piano',
          stepType: 'Step2A',
        }
      );

      // Refused, and the refusal says why — so a reconciliation skipped
      // because the request never ran at all cannot pass as this scenario.
      expect(refusal.status).toBe(400);
      expect(refusal.error).toMatch(/no instrument course/i);
      expect(await fetchStudentEnrollments(page, family.entry.studentId)).toHaveLength(0);
      expect(await waitingListEntryExists(family.entry.waitingListEntryId)).toBe(true);

      // Read after the refusal, not only at the end: the same members and the
      // same length, with the withheld guardian still absent.
      const enrolledAfterRefusal = await fetchGuardians(page, family.enrolled.studentId);
      expect(guardianIds(enrolledAfterRefusal)).not.toContain(family.guardian.guardianId);
      expect(new Set(guardianIds(enrolledAfterRefusal))).toEqual(
        new Set(guardianIds(family.enrolledBefore))
      );
      expect(
        timesHeld(await fetchGuardians(page, family.entry.studentId), family.guardian.guardianId)
      ).toBe(1);

      // Without this leg the refusal above would pass against an
      // implementation that never reconciles at all.
      const accepted = await attemptEnrolFromWaitingList(
        coordinator.page,
        family.entry.studentId,
        {
          lessonStructureId: resolvableStructureId,
          teacherId: target.teacherId,
          instrumentType: 'Piano',
          stepType: 'Step2A',
        }
      );
      expect(accepted.status).toBe(201);
      expect(await waitingListEntryExists(family.entry.waitingListEntryId)).toBe(false);

      await coordinator.page.reload();
      await expect(
        waitingList.rowFor('After School', family.entry.lastName)
      ).toHaveCount(0);

      // Exactly once, not twice: the refused confirmation left no residue.
      const enrolledAfterSuccess = await fetchGuardians(page, family.enrolled.studentId);
      expect(timesHeld(enrolledAfterSuccess, family.guardian.guardianId)).toBe(1);

      await coordinator.close();
    });

    test('a refusal raised while validating the request also leaves the sibling alone', async ({
      page,
      browser,
    }) => {
      const studentsPage = await goToStudentsPage(page);
      const target = await seedEnrollmentTarget(page);

      const coordinator = await signInAsCoordinator(browser);
      const family = await seedWithheldFamily(page, coordinator.page, target, {
        occurrenceType: 'DuringSchool',
        lessonType: 'Individual',
        durationType: 'Hour',
        instrumentType: 'Piano',
      });
      await seedCourseOfType(page, family.entry.lessonStructureId, 'Instrument');

      // A structure under the other occurrence type, carrying an instrument
      // course, so the refusal is for naming an occurrence type the student did
      // not wait under rather than for want of a course. The modal presents the
      // occurrence type as a fixed value and offers no control that could name
      // a different one, so this is submitted directly.
      const otherStructureId = await fetchLessonStructureId(page, {
        occurrenceType: 'AfterSchool',
        lessonType: 'Individual',
        durationType: 'HalfHour',
      });
      await seedCourseOfType(page, otherStructureId, 'Instrument');

      const { status } = await attemptEnrolFromWaitingList(coordinator.page, family.entry.studentId, {
        lessonStructureId: otherStructureId,
        teacherId: target.teacherId,
        instrumentType: 'Piano',
        stepType: 'Step2A',
      });
      expect(status).toBe(400);

      expect(await fetchStudentEnrollments(page, family.entry.studentId)).toHaveLength(0);
      expect(await waitingListEntryExists(family.entry.waitingListEntryId)).toBe(true);

      // The refusal here comes from validating the request against the entry,
      // not from resolving the course. An implementation that reconciles the
      // family before it finishes validating would leave the sibling holding
      // the guardian here while still passing the modal scenario above.
      const enrolledAfter = await fetchGuardians(page, family.enrolled.studentId);
      expect(guardianIds(enrolledAfter)).not.toContain(family.guardian.guardianId);
      expect(new Set(guardianIds(enrolledAfter))).toEqual(
        new Set(guardianIds(family.enrolledBefore))
      );
      expect(
        timesHeld(await fetchGuardians(page, family.entry.studentId), family.guardian.guardianId)
      ).toBe(1);

      await coordinator.page.reload();
      await expect(
        coordinator.waitingList.rowFor('During School', family.entry.lastName)
      ).toBeVisible();

      await page.reload();
      await studentsPage.filterByName(family.enrolled.surname);
      await studentsPage.openGuardiansTab(family.enrolled.fullName);
      await expect(studentsPage.guardianListRow(family.guardian.fullName)).toHaveCount(0);
      await expect(studentsPage.guardianListRows()).toHaveCount(family.enrolledBefore.length);

      await coordinator.close();
    });
  }
);
