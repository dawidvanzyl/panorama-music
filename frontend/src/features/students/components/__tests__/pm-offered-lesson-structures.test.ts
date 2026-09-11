import { describe, it, expect, afterEach } from 'vitest';
import '../pm-waiting-list-step';
import '../pm-enrol-waiting-list-student-modal';
import type { PmWaitingListStep } from '../pm-waiting-list-step';
import type { PmEnrolWaitingListStudentModal } from '../pm-enrol-waiting-list-student-modal';
import type { LessonStructure, WaitingListEntryResult } from '../../services/waiting-list';

/**
 * What a waiting-list surface offers, read the way the question is actually
 * asked: not "does this select contain this option" but "is this
 * occurrence/lesson/duration combination reachable through these controls".
 * The three pickers narrow one another, so reaching a combination means
 * choosing each in turn — which is what these helpers do.
 */
const afterSchoolIndividualHour: LessonStructure = {
  lessonStructureId: 'ls-after-ind-hour',
  lessonType: 'Individual',
  durationType: 'Hour',
  occurrenceType: 'AfterSchool',
};

const duringSchoolGroupHalfHour: LessonStructure = {
  lessonStructureId: 'ls-during-group-half',
  lessonType: 'Group',
  durationType: 'HalfHour',
  occurrenceType: 'DuringSchool',
};

/** After School · Group · Hour is deliberately absent from the offered set. */
const offered: LessonStructure[] = [afterSchoolIndividualHour, duringSchoolGroupHalfHour];

const entryOnAnUnofferedStructure: WaitingListEntryResult = {
  waitingListEntryId: 'w2',
  studentId: 's2',
  firstName: 'Thandi',
  lastName: 'Khumalo',
  position: 2,
  lessonType: 'Group',
  durationType: 'Hour',
  instrumentType: 'Piano',
  notes: null,
  addedAt: '2026-07-11T09:00:00Z',
};

const entryOnAnOfferedStructure: WaitingListEntryResult = {
  waitingListEntryId: 'w1',
  studentId: 's1',
  firstName: 'Neo',
  lastName: 'Dube',
  position: 1,
  lessonType: 'Individual',
  durationType: 'Hour',
  instrumentType: 'Piano',
  notes: null,
  addedAt: '2026-07-10T09:00:00Z',
};

let mounted: HTMLElement | null = null;

afterEach(() => {
  mounted?.remove();
  mounted = null;
});

function mountStep(structures: LessonStructure[]): PmWaitingListStep {
  const step = document.createElement('pm-waiting-list-step') as PmWaitingListStep;
  document.body.appendChild(step);
  mounted = step;
  step.lessonStructures = structures;
  return step;
}

function mountEnrolModal(structures: LessonStructure[]): PmEnrolWaitingListStudentModal {
  const modal = document.createElement('pm-enrol-waiting-list-student-modal') as PmEnrolWaitingListStudentModal;
  document.body.appendChild(modal);
  mounted = modal;
  modal.teachers = [{ teacherId: 't1', firstName: 'Zanele', surname: 'Mokoena', isActive: true }];
  modal.lessonStructures = structures;
  return modal;
}

function selectIn(root: ShadowRoot, id: string): HTMLSelectElement {
  return root.getElementById(id) as HTMLSelectElement;
}

/** The real values a select offers, with its placeholder discounted. */
function choices(select: HTMLSelectElement): string[] {
  return [...select.options].map((option) => option.value).filter((value) => value !== '');
}

function choose(select: HTMLSelectElement, value: string): void {
  select.value = value;
  select.dispatchEvent(new Event('change'));
}

/** Every combination a sequence of choices through these three pickers arrives at. */
function reachableCombinations(root: ShadowRoot): string[] {
  const combinations: string[] = [];
  const occurrenceSelect = selectIn(root, 'occurrenceType');
  for (const occurrenceType of choices(occurrenceSelect)) {
    choose(occurrenceSelect, occurrenceType);
    combinations.push(...reachableUnderOccurrence(root, occurrenceType));
  }
  return combinations;
}

/** The same, for a surface whose occurrence type is fixed rather than chosen. */
function reachableUnderOccurrence(root: ShadowRoot, occurrenceType: string): string[] {
  const combinations: string[] = [];
  const lessonSelect = selectIn(root, 'lessonType');
  for (const lessonType of choices(lessonSelect)) {
    choose(lessonSelect, lessonType);
    for (const durationType of choices(selectIn(root, 'durationType'))) {
      combinations.push(`${occurrenceType} · ${lessonType} · ${durationType}`);
    }
  }
  return combinations;
}

describe('the capture wizard Waiting List tab', { tags: ['309UC6'] }, () => {
  it('offers only the combinations the school runs an instrument course for', () => {
    const step = mountStep(offered);

    const reachable = reachableCombinations(step.shadowRoot!);

    expect(reachable).toEqual(['DuringSchool · Group · HalfHour', 'AfterSchool · Individual · Hour']);
    expect(reachable).not.toContain('AfterSchool · Group · Hour');
  });
});

describe('the edit wizard Waiting List tab', { tags: ['309UC7'] }, () => {
  it('offers only the combinations the school runs an instrument course for', () => {
    const step = mountStep(offered);
    step.setValues({
      occurrenceType: 'AfterSchool',
      lessonType: 'Individual',
      durationType: 'Hour',
      instrumentType: 'Piano',
      notes: null,
      addedAt: '2026-07-10T09:00:00Z',
    });

    const reachable = reachableCombinations(step.shadowRoot!);

    expect(reachable).toEqual(['DuringSchool · Group · HalfHour', 'AfterSchool · Individual · Hour']);
    expect(reachable).not.toContain('AfterSchool · Group · Hour');
  });
});

describe('the enrol modal', { tags: ['309UC8'] }, () => {
  it('offers only the combinations the school runs an instrument course for, under the fixed occurrence type', () => {
    const modal = mountEnrolModal(offered);
    modal.show(entryOnAnOfferedStructure, 'AfterSchool');

    const reachable = reachableUnderOccurrence(modal.shadowRoot!, 'AfterSchool');

    expect(reachable).toEqual(['AfterSchool · Individual · Hour']);
    expect(reachable).not.toContain('AfterSchool · Group · Hour');
  });
});

describe('a school running no instrument courses at all', { tags: ['309UC9'] }, () => {
  it('is stated on the capture wizard Waiting List tab rather than left as empty controls', () => {
    const step = mountStep([]);

    const root = step.shadowRoot!;
    expect((root.getElementById('noOfferedStructures') as HTMLElement).hidden).toBe(false);
    expect(root.getElementById('noOfferedStructures')!.textContent).toContain('no instrument courses yet');
    expect((root.getElementById('form') as HTMLElement).hidden).toBe(true);
  });

  it('is stated on the edit wizard Waiting List tab rather than left as empty controls', () => {
    const step = mountStep([]);
    step.setValues({
      occurrenceType: 'AfterSchool',
      lessonType: 'Group',
      durationType: 'Hour',
      instrumentType: 'Recorder',
      notes: null,
      addedAt: '2026-07-10T09:00:00Z',
    });

    const root = step.shadowRoot!;
    expect((root.getElementById('noOfferedStructures') as HTMLElement).hidden).toBe(false);
    expect(root.getElementById('noOfferedStructures')!.textContent).toContain('no instrument courses yet');
    expect((root.getElementById('form') as HTMLElement).hidden).toBe(true);
  });

  it('is stated on the enrol modal rather than left as empty controls and an Enrol that cannot succeed', () => {
    const modal = mountEnrolModal([]);
    modal.show(entryOnAnOfferedStructure, 'AfterSchool');

    const root = modal.shadowRoot!;
    expect((root.getElementById('noOfferedStructures') as HTMLElement).hidden).toBe(false);
    expect(root.getElementById('noOfferedStructures')!.textContent).toContain('no instrument courses yet');
    expect((root.getElementById('form') as HTMLElement).hidden).toBe(true);
    expect((root.getElementById('confirmBtn') as HTMLButtonElement).hidden).toBe(true);
  });
});

/**
 * The enrol modal's occurrence type is fixed by the entry, so it has a dead end
 * of its own: courses exist, but none under the occurrence type this student
 * waited on. Same empty controls, so the same treatment — said in the narrower
 * wording that tells the Coordinator which of the two dead ends they are at.
 */
describe('a school running no instrument course under the entry own occurrence type', { tags: ['309UC9'] }, () => {
  it('is stated in the narrower wording, with the form and Enrol withdrawn', () => {
    const modal = mountEnrolModal([duringSchoolGroupHalfHour]);
    modal.show(entryOnAnOfferedStructure, 'AfterSchool');

    const root = modal.shadowRoot!;
    const notice = root.getElementById('noOfferedStructures') as HTMLElement;
    expect(notice.hidden).toBe(false);
    expect(notice.textContent).toContain('under this occurrence type');
    expect((root.getElementById('form') as HTMLElement).hidden).toBe(true);
    expect((root.getElementById('confirmBtn') as HTMLButtonElement).hidden).toBe(true);
  });
});

/**
 * Between the two dead ends and a clean pre-fill sits the case the Coordinator
 * actually meets most: the school still offers something under this occurrence
 * type, but not the combination this student was waiting for. The pre-fill has
 * nothing to land on, so the picker keeps its placeholder — and without a word
 * of explanation the only feedback is the browser's own validation bubble.
 */
describe('an entry waiting on a combination that is no longer offered', { tags: ['309UC12'] }, () => {
  it('says so, and still lets the Coordinator enrol on an offered combination', () => {
    const modal = mountEnrolModal(offered);
    modal.show(entryOnAnUnofferedStructure, 'AfterSchool');

    const root = modal.shadowRoot!;
    const notice = root.getElementById('entryStructureNotOffered') as HTMLElement;
    expect(notice.hidden).toBe(false);
    expect(notice.textContent).toContain('no longer offered');

    // Stated, not enforced: the form and Enrol stay exactly as they were, and
    // the picker is on its placeholder because the entry's value is gone.
    expect((root.getElementById('form') as HTMLElement).hidden).toBe(false);
    expect((root.getElementById('confirmBtn') as HTMLButtonElement).hidden).toBe(false);
    expect(selectIn(root, 'lessonType').value).toBe('');
    expect(choices(selectIn(root, 'lessonType'))).toEqual(['Individual']);

    const enrolments: unknown[] = [];
    modal.addEventListener('waiting-list-enrol-confirmed', (event) => {
      enrolments.push((event as CustomEvent).detail);
    });

    choose(selectIn(root, 'lessonType'), 'Individual');
    choose(selectIn(root, 'durationType'), 'Hour');
    selectIn(root, 'teacher').value = 't1';
    selectIn(root, 'step').value = 'Step1A';
    (root.getElementById('confirmBtn') as HTMLButtonElement).click();

    expect(enrolments).toHaveLength(1);
  });

  it('says nothing when the entry own combination is still offered', () => {
    const modal = mountEnrolModal(offered);
    modal.show(entryOnAnOfferedStructure, 'AfterSchool');

    const root = modal.shadowRoot!;
    expect((root.getElementById('entryStructureNotOffered') as HTMLElement).hidden).toBe(true);
    expect(selectIn(root, 'lessonType').value).toBe('Individual');
  });

  it('leaves the dead-end notice to speak for itself when nothing is offered at all', () => {
    const modal = mountEnrolModal([duringSchoolGroupHalfHour]);
    modal.show(entryOnAnUnofferedStructure, 'AfterSchool');

    const root = modal.shadowRoot!;
    expect((root.getElementById('noOfferedStructures') as HTMLElement).hidden).toBe(false);
    expect((root.getElementById('entryStructureNotOffered') as HTMLElement).hidden).toBe(true);
  });
});
