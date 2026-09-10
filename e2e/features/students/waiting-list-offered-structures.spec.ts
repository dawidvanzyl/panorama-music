import { test, expect } from '../../fixtures/base';
import { goToWaitingListPage } from '../../fixtures/testUsers';
import {
  seedWaitingListEntry,
  seedCourseOfType,
  ensureInstrumentCourse,
  fetchLessonStructureId,
  fetchStructureWithoutInstrumentCourse,
} from '../../fixtures/waitingList';
import type { StructureCombination, WaitingListPage } from '../../pages/students/WaitingListPage';
import type { Page } from '@playwright/test';

/** Same convention as waiting-list-capture.spec.ts — a run is told apart by the surname it writes. */
function uniqueSurname(label: string): string {
  return `${label}${Date.now()}W${test.info().workerIndex}`;
}

const studentDefaults = {
  dateOfBirth: '2014-05-12',
  grade: 'Grade4' as const,
  class: 'A1' as const,
  phase: 'Junior' as const,
  language: 'English' as const,
};

// Seeding a student needs Teacher and seeding a course needs Coordinator,
// while the surfaces under test are the Coordinator's. No scenario here has a
// role boundary as its subject, so one session holds both.
const SEED_AND_READ_ROLES = ['Teacher', 'Coordinator'] as const;

/**
 * The combination every scenario gives an instrument course and then reads
 * back. Each negative below is an absence, and an absence passes just as
 * happily when a control failed to render, rendered empty or lost its data —
 * so every scenario asserts this one is offered on the same surface in the
 * same run. It shares its occurrence type with the negative because the enrol
 * modal fixes the occurrence type at whatever the entry settled on.
 */
const ANCHOR = { occurrenceType: 'AfterSchool', lessonType: 'Individual', durationType: 'Hour' } as const;

const ANCHOR_COMBINATION: StructureCombination = {
  occurrenceLabel: 'After School',
  lessonLabel: 'Individual',
  durationLabel: 'Hour',
};

/**
 * The reserved course-free triple, spelled the way the surfaces do. It is
 * `COURSE_FREE_LESSON_STRUCTURE`, and `fetchStructureWithoutInstrumentCourse`
 * is the only way any scenario here reaches it — never seed an instrument
 * course against it from this file.
 */
const COURSE_FREE_COMBINATION: StructureCombination = {
  occurrenceLabel: 'After School',
  lessonLabel: 'Group',
  durationLabel: 'Hour',
};

/** Gives the anchor combination its instrument course, so the surfaces offer it. */
async function offerTheAnchor(page: Page): Promise<void> {
  await ensureInstrumentCourse(page, await fetchLessonStructureId(page, ANCHOR));
}

/**
 * The two reads every scenario makes, in the order that matters: the anchor
 * first, so a surface that rendered nothing fails before its silence about the
 * course-free combination can be mistaken for a pass.
 */
async function expectWaitingListTabOffersOnlyTheAnchor(waitingListPage: WaitingListPage): Promise<void> {
  expect(
    await waitingListPage.waitingListTabOffers(ANCHOR_COMBINATION),
    'the anchor: After School · Individual · Hour has an instrument course, so the tab must offer it',
  ).toBe(true);
  expect(
    await waitingListPage.waitingListTabOffers(COURSE_FREE_COMBINATION),
    'After School · Group · Hour has no instrument course, so no sequence of choices may arrive at it',
  ).toBe(false);
}

async function expectEnrolModalOffersOnlyTheAnchor(waitingListPage: WaitingListPage): Promise<void> {
  // Which occurrence type the offered set is being read under — fixed by the
  // entry, and unchanged by this story.
  await expect(waitingListPage.enrolOccurrenceType()).toHaveText('After School');

  expect(
    await waitingListPage.enrolModalOffers({ lessonLabel: 'Individual', durationLabel: 'Hour' }),
    'the anchor: Individual · Hour has an instrument course under After School, so the modal must offer it',
  ).toBe(true);
  expect(
    await waitingListPage.enrolModalOffers({ lessonLabel: 'Group', durationLabel: 'Hour' }),
    'Group · Hour has no instrument course under After School, so the modal may not arrive at it',
  ).toBe(false);
}

test.describe(
  'The capture wizard offers only combinations the school runs an instrument course for',
  { tag: ['@272IT61'] },
  () => {
    test('the course-free combination is not offered at capture, while one with a course is', async ({ page }) => {
      const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_READ_ROLES]);
      // Fails loudly if the catalogue no longer holds the state this scenario
      // is about, rather than quietly reading some other structure.
      await fetchStructureWithoutInstrumentCourse(page);
      await offerTheAnchor(page);
      // The offered set is read once when the page loads, so the reload is
      // what makes the seeded course visible to the wizard.
      await page.reload();

      await waitingListPage.openCaptureWizardAtWaitingListTab({
        firstName: 'Nomsa',
        lastName: uniqueSurname('Offered'),
        ...studentDefaults,
      });

      await expectWaitingListTabOffersOnlyTheAnchor(waitingListPage);
    });

    test('a course that is not an instrument course does not make a combination offered', async ({ page }) => {
      const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_READ_ROLES]);
      const courseFree = await fetchStructureWithoutInstrumentCourse(page);
      // A course on the reserved structure, of a type that is not Instrument —
      // which the convention permits, and which is this scenario's whole
      // point. This is what separates "an instrument course exists" from "any
      // course exists".
      await seedCourseOfType(page, courseFree.lessonStructureId, 'G2Recorder');
      await offerTheAnchor(page);
      await page.reload();

      await waitingListPage.openCaptureWizardAtWaitingListTab({
        firstName: 'Sipho',
        lastName: uniqueSurname('NonInstrument'),
        ...studentDefaults,
      });

      await expectWaitingListTabOffersOnlyTheAnchor(waitingListPage);
    });
  },
);

test.describe(
  'The edit wizard offers only combinations the school runs an instrument course for',
  { tag: ['@272IT62'] },
  () => {
    test("the course-free combination is not offered when an entry on an offered structure is edited", async ({
      page,
    }) => {
      const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_READ_ROLES]);
      await fetchStructureWithoutInstrumentCourse(page);
      await offerTheAnchor(page);
      const entry = await seedWaitingListEntry(page, {
        occurrenceType: ANCHOR.occurrenceType,
        lessonType: ANCHOR.lessonType,
        durationType: ANCHOR.durationType,
      });
      await page.reload();

      await waitingListPage.openEditWizard(waitingListPage.rowFor('After School', entry.lastName));
      await waitingListPage.selectTab('Waiting List');

      // The anchor is also this entry's own combination, so a Coordinator can
      // still save it unchanged.
      await expectWaitingListTabOffersOnlyTheAnchor(waitingListPage);
    });

    test('the same holds for an entry that is itself sitting on the course-free combination', async ({ page }) => {
      const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_READ_ROLES]);
      const courseFree = await fetchStructureWithoutInstrumentCourse(page);
      await offerTheAnchor(page);
      // A real state: entries predate this story, and a course can be deleted
      // out from under one. The row is inserted directly, which is how the
      // state is reachable at all now that the capture endpoint refuses it.
      const entry = await seedWaitingListEntry(page, {
        occurrenceType: courseFree.occurrenceType,
        lessonType: courseFree.lessonType,
        durationType: courseFree.durationType,
      });
      await page.reload();

      await waitingListPage.openEditWizard(waitingListPage.rowFor('After School', entry.lastName));
      await waitingListPage.selectTab('Waiting List');

      // Nothing is asserted about what is pre-selected: re-presenting an entry
      // captured against a combination the school no longer runs is out of
      // scope for this story, and pinning it here would invent a requirement.
      await expectWaitingListTabOffersOnlyTheAnchor(waitingListPage);
    });
  },
);

test.describe(
  'The enrol modal offers only combinations the school runs an instrument course for',
  { tag: ['@272IT63'] },
  () => {
    test('the course-free combination is not offered when enrolling from an offered structure', async ({ page }) => {
      const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_READ_ROLES]);
      await fetchStructureWithoutInstrumentCourse(page);
      await offerTheAnchor(page);
      const entry = await seedWaitingListEntry(page, {
        occurrenceType: ANCHOR.occurrenceType,
        lessonType: ANCHOR.lessonType,
        durationType: ANCHOR.durationType,
      });
      await page.reload();

      await waitingListPage.openEnrolModal(waitingListPage.rowFor('After School', entry.lastName));

      await expectEnrolModalOffersOnlyTheAnchor(waitingListPage);
    });

    test("the same holds for an entry whose own combination has no instrument course", async ({ page }) => {
      const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_READ_ROLES]);
      const courseFree = await fetchStructureWithoutInstrumentCourse(page);
      await offerTheAnchor(page);
      const entry = await seedWaitingListEntry(page, {
        occurrenceType: courseFree.occurrenceType,
        lessonType: courseFree.lessonType,
        durationType: courseFree.durationType,
      });
      await page.reload();

      await waitingListPage.openEnrolModal(waitingListPage.rowFor('After School', entry.lastName));

      // Nothing is asserted about the pre-filled lesson and duration, for the
      // same out-of-scope reason as the edit scenario above, and nothing about
      // the enrolment refusal — that has its own code and its own spec, and
      // duplicating it here would make this fail for something that is not its
      // subject.
      await expectEnrolModalOffersOnlyTheAnchor(waitingListPage);
    });
  },
);

test.describe(
  'A combination the school runs an instrument course for is offered on all three surfaces, and works',
  { tag: ['@272IT61', '@272IT62', '@272IT63', '@272IT64'] },
  () => {
    test('capture, edit and enrol each offer it, and a capture on it reaches the list', async ({ page }) => {
      const waitingListPage = await goToWaitingListPage(page, [...SEED_AND_READ_ROLES]);
      // Read on all three surfaces in one run against one seeded course. Three
      // separate positives would each pass on a surface that offers
      // everything, which is exactly the behaviour this story corrects — so
      // the course-free combination is the counterweight on every one of them.
      await fetchStructureWithoutInstrumentCourse(page);
      await offerTheAnchor(page);
      await page.reload();

      const surname = uniqueSurname('AllSurfaces');
      const student = { firstName: 'Lerato', lastName: surname, ...studentDefaults };

      await waitingListPage.openCaptureWizardAtWaitingListTab(student);
      await expectWaitingListTabOffersOnlyTheAnchor(waitingListPage);
      await waitingListPage.closeWizard();

      // Offered means usable, not merely listed: a surface that offers a
      // combination the save then refuses has not delivered the rule.
      await waitingListPage.captureStudent(student, {
        ...ANCHOR_COMBINATION,
        instrumentLabel: 'Guitar',
      });

      const row = waitingListPage.rowFor('After School', surname);
      await expect(row).toBeVisible();
      await expect(waitingListPage.meta(row)).toContainText('Individual');
      await expect(waitingListPage.meta(row)).toContainText('Hour');
      await expect(waitingListPage.meta(row)).toContainText('Guitar');

      await waitingListPage.openEditWizard(row);
      await waitingListPage.selectTab('Waiting List');
      await expectWaitingListTabOffersOnlyTheAnchor(waitingListPage);
      await waitingListPage.closeWizard();

      await waitingListPage.openEnrolModal(waitingListPage.rowFor('After School', surname));
      await expectEnrolModalOffersOnlyTheAnchor(waitingListPage);
    });
  },
);
