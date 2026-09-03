import { describe, it, expect, afterEach } from 'vitest';
import { PmStudentWizardModal } from '../pm-student-wizard-modal';
import type { StudentResult } from '../../services/students';

const alice: StudentResult = {
  studentId: 's1',
  firstName: 'Alice',
  lastName: 'Vance',
  dateOfBirth: '2014-05-12',
  grade: 'Grade4',
  class: 'A1',
  phase: 'Junior',
  language: 'English',
};

function localStyleSheetFor(shadowRoot: ShadowRoot): CSSStyleSheet {
  const [, localSheet] = shadowRoot.adoptedStyleSheets;
  return localSheet;
}

function ruleFor(sheet: CSSStyleSheet, selector: string): CSSStyleRule {
  const rule = Array.from(sheet.cssRules).find((r) => (r as CSSStyleRule).selectorText === selector);
  if (!rule) throw new Error(`No rule found for selector ${selector}`);
  return rule as CSSStyleRule;
}

describe('pm-student-wizard-modal fixed-size layout', { tags: ['207UC1', '207UC2'] }, () => {
  it('gives the modal card an unconditional fixed height independent of the active step', () => {
    const modal = new PmStudentWizardModal();
    const localSheet = localStyleSheetFor(modal.shadowRoot!);

    const cardRule = ruleFor(localSheet, '.modal__card');
    expect(cardRule.style.getPropertyValue('height')).toBe('600px');
    expect(cardRule.style.getPropertyValue('display')).toBe('flex');
    expect(cardRule.style.getPropertyValue('flex-direction')).toBe('column');

    const selectors = Array.from(localSheet.cssRules).map((r) => (r as CSSStyleRule).selectorText);
    expect(selectors.filter((s) => s.includes('.modal__card'))).toEqual(['.modal__card']);
  });

  it('lets only the active step flex to fill the fixed card while header/tabs/actions stay pinned', () => {
    const modal = new PmStudentWizardModal();
    const localSheet = localStyleSheetFor(modal.shadowRoot!);

    const visibleStepRule = ruleFor(localSheet, '.wizard__step--visible');
    expect(visibleStepRule.style.getPropertyValue('flex')).toBe('1 1 0%');
    expect(visibleStepRule.style.getPropertyValue('min-height')).toBe('0px');

    const headerRule = ruleFor(localSheet, '.modal__header');
    expect(headerRule.style.getPropertyValue('flex-shrink')).toBe('0');

    const tabsRule = ruleFor(localSheet, '.wizard__tabs');
    expect(tabsRule.style.getPropertyValue('flex-shrink')).toBe('0');

    const actionsRule = ruleFor(localSheet, '.wizard__actions');
    expect(actionsRule.style.getPropertyValue('flex-shrink')).toBe('0');
  });
});

let modal: PmStudentWizardModal;

function mountModal(): PmStudentWizardModal {
  modal = document.createElement('pm-student-wizard-modal') as PmStudentWizardModal;
  document.body.appendChild(modal);
  return modal;
}

function byId<T extends HTMLElement>(id: string): T {
  return modal.shadowRoot!.getElementById(id) as T;
}

/** Fills the Student tab with a valid new student, as every create flow must. */
function fillStudentStep(): void {
  const stepShadow = byId('studentStep').shadowRoot!;
  (stepShadow.getElementById('firstName') as HTMLInputElement).value = 'Nadia';
  (stepShadow.getElementById('lastName') as HTMLInputElement).value = 'Vance';
  (stepShadow.getElementById('dateOfBirth') as HTMLInputElement).value = '2014-05-12';
  (stepShadow.getElementById('grade') as HTMLSelectElement).value = 'Grade4';
  (stepShadow.getElementById('class') as HTMLSelectElement).value = 'A1';
  (stepShadow.getElementById('language') as HTMLSelectElement).value = 'English';
  // Chosen the way a user chooses it: the Extra-Curriculars step follows this
  // field's change event, so setting the value alone would announce nothing.
  choosePhase('Junior');
}

/** Chooses a phase on the Student tab the way a user does, so the wizard reacts. */
function choosePhase(phase: string): void {
  const phaseSelect = byId('studentStep').shadowRoot!.getElementById('phase') as HTMLSelectElement;
  phaseSelect.value = phase;
  phaseSelect.dispatchEvent(new Event('change'));
}

/** Chooses a grade on the Student tab the way a user does, so the wizard reacts. */
function chooseGrade(grade: string): void {
  const gradeSelect = byId('studentStep').shadowRoot!.getElementById('grade') as HTMLSelectElement;
  gradeSelect.value = grade;
  gradeSelect.dispatchEvent(new Event('change'));
}

/** Steps the create wizard from Student through to whatever its last step is. */
function advanceToFinalStep(): void {
  byId<HTMLButtonElement>('nextBtn').click();
  byId<HTMLButtonElement>('nextBtn').click();
  byId<HTMLButtonElement>('nextBtn').click();
  if (!byId('nextBtn').hidden) byId<HTMLButtonElement>('nextBtn').click();
}

afterEach(() => {
  if (modal?.isConnected) document.body.removeChild(modal);
});

describe('pm-student-wizard-modal — the Extra-Curriculars tab', { tags: ['277UC11'] }, () => {
  it('offers an Extra-Curriculars tab immediately after the Courses tab', () => {
    mountModal();

    // Waiting List is present in the DOM but starts hidden — this mount never
    // called openForCreate/openForEdit — so only visible tabs are asserted
    // here; 293UC13 covers the full enrolled-mode set explicitly.
    const tabs = ([...modal.shadowRoot!.querySelectorAll('.wizard__tab')] as HTMLButtonElement[]).filter(
      (tab) => !tab.hidden,
    );

    expect(tabs.map((tab) => tab.textContent)).toEqual([
      'Student',
      'Siblings',
      'Guardians',
      'Courses',
      'Extra-Curriculars',
    ]);
  });

  it('shows the Extra-Curriculars step when its tab is chosen in edit mode', () => {
    mountModal();
    modal.openForEdit(alice);

    byId<HTMLButtonElement>('tabExtraCurriculars').click();

    expect(byId('stepExtraCurriculars').classList.contains('wizard__step--visible')).toBe(true);
    expect(byId('stepCourses').classList.contains('wizard__step--visible')).toBe(false);
  });
});

describe('pm-student-wizard-modal — Extra-Curriculars is the create wizard final step', { tags: ['277UC22'] }, () => {
  it('gives Courses a Next and moves Save onto Extra-Curriculars', () => {
    mountModal();
    modal.openForCreate([]);
    fillStudentStep();

    // Student → Siblings → Guardians → Courses.
    byId<HTMLButtonElement>('nextBtn').click();
    byId<HTMLButtonElement>('nextBtn').click();
    byId<HTMLButtonElement>('nextBtn').click();

    expect(byId('stepCourses').classList.contains('wizard__step--visible')).toBe(true);
    // Courses is no longer the last step, so it offers Next rather than Save.
    expect(byId('nextBtn').hidden).toBe(false);
    expect(byId('saveBtn').hidden).toBe(true);

    byId<HTMLButtonElement>('nextBtn').click();

    expect(byId('stepExtraCurriculars').classList.contains('wizard__step--visible')).toBe(true);
    expect(byId('saveBtn').hidden).toBe(false);
    expect(byId('nextBtn').hidden).toBe(true);
    expect(byId('previousBtn').hidden).toBe(false);
  });

  it('returns to Courses from Extra-Curriculars on Previous', () => {
    mountModal();
    modal.openForCreate([]);
    fillStudentStep();
    byId<HTMLButtonElement>('nextBtn').click();
    byId<HTMLButtonElement>('nextBtn').click();
    byId<HTMLButtonElement>('nextBtn').click();
    byId<HTMLButtonElement>('nextBtn').click();

    byId<HTMLButtonElement>('previousBtn').click();

    expect(byId('stepCourses').classList.contains('wizard__step--visible')).toBe(true);
  });

  it("carries the student's own phase onto the tab as the picker's non-editable Phase value", () => {
    mountModal();
    modal.openForCreate([]);
    fillStudentStep();
    byId<HTMLButtonElement>('nextBtn').click();
    byId<HTMLButtonElement>('nextBtn').click();
    byId<HTMLButtonElement>('nextBtn').click();
    byId<HTMLButtonElement>('nextBtn').click();

    const stepShadow = byId('extraCurricularsStep').shadowRoot!;
    (stepShadow.getElementById('addBtn') as HTMLButtonElement).click();

    expect((stepShadow.getElementById('phaseField') as HTMLInputElement).value).toBe('Junior');
  });
});

describe('pm-student-wizard-modal — the phase field governs the step', { tags: ['277UC31', '277UC32'] }, () => {
  /** Everything but the phase, so the phase alone is what moves in these tests. */
  function fillStudentStepWithoutPhase(): void {
    const stepShadow = byId('studentStep').shadowRoot!;
    (stepShadow.getElementById('firstName') as HTMLInputElement).value = 'Nadia';
    (stepShadow.getElementById('lastName') as HTMLInputElement).value = 'Vance';
    (stepShadow.getElementById('dateOfBirth') as HTMLInputElement).value = '2014-05-12';
    (stepShadow.getElementById('grade') as HTMLSelectElement).value = 'Grade4';
    (stepShadow.getElementById('class') as HTMLSelectElement).value = 'A1';
    (stepShadow.getElementById('language') as HTMLSelectElement).value = 'English';
  }

  it('makes the step available the moment a phase is chosen, and it carries Save', () => {
    mountModal();
    modal.openForCreate([]);
    fillStudentStepWithoutPhase();

    // With no phase yet, the step is not on offer at all.
    expect(byId('tabExtraCurriculars').hidden).toBe(true);

    choosePhase('Junior');

    expect(byId('tabExtraCurriculars').hidden).toBe(false);
    advanceToFinalStep();
    expect(byId('stepExtraCurriculars').classList.contains('wizard__step--visible')).toBe(true);
    expect(byId('saveBtn').hidden).toBe(false);
    expect(byId('nextBtn').hidden).toBe(true);
  });

  it('removes the step when the phase is cleared, handing Save back to Courses', () => {
    mountModal();
    modal.openForCreate([]);
    fillStudentStep();
    advanceToFinalStep();
    expect(byId('stepExtraCurriculars').classList.contains('wizard__step--visible')).toBe(true);

    // Cleared directly rather than via the grade: the phase field is the
    // mechanism, and grade Private is only one way of emptying it.
    choosePhase('');

    expect(byId('tabExtraCurriculars').hidden).toBe(true);
    expect(byId('stepCourses').classList.contains('wizard__step--visible')).toBe(true);
    expect(byId('saveBtn').hidden).toBe(false);
  });

  it('removes the step when the grade is set to Private, which empties the phase field', () => {
    mountModal();
    modal.openForCreate([]);
    fillStudentStep();
    expect(byId('tabExtraCurriculars').hidden).toBe(false);

    chooseGrade('Private');

    // Same outcome as Addendum 1 stated, now reached through the phase.
    expect(byId('tabExtraCurriculars').hidden).toBe(true);
    expect(modal.pendingExtraCurricularIds).toEqual([]);
  });
});

describe('pm-student-wizard-modal — a Private-grade student in create mode', { tags: ['277UC26'] }, () => {
  it('offers no Extra-Curriculars step, and Courses carries Save', () => {
    mountModal();
    modal.openForCreate([]);
    fillStudentStep();
    chooseGrade('Private');

    byId<HTMLButtonElement>('nextBtn').click();
    byId<HTMLButtonElement>('nextBtn').click();
    byId<HTMLButtonElement>('nextBtn').click();

    expect(byId('tabExtraCurriculars').hidden).toBe(true);
    expect(byId('stepCourses').classList.contains('wizard__step--visible')).toBe(true);
    // Courses is their last step, so it is the one carrying Save.
    expect(byId('saveBtn').hidden).toBe(false);
    expect(byId('nextBtn').hidden).toBe(true);
  });

  it('leaves the wizard unchanged for every other grade', () => {
    mountModal();
    modal.openForCreate([]);
    fillStudentStep();
    chooseGrade('Private');
    // Going back to a school grade means choosing the class and phase again —
    // Private cleared both, and both are required for every other grade.
    chooseGrade('Grade4');
    fillStudentStep();

    advanceToFinalStep();

    expect(byId('tabExtraCurriculars').hidden).toBe(false);
    expect(byId('stepExtraCurriculars').classList.contains('wizard__step--visible')).toBe(true);
    expect(byId('saveBtn').hidden).toBe(false);
  });
});

describe('pm-student-wizard-modal — grade becoming Private discards staged activities', { tags: ['277UC27'] }, () => {
  it('drops what was staged and removes the step, sending nothing', () => {
    mountModal();
    modal.openForCreate([]);
    fillStudentStep();
    advanceToFinalStep();

    // Stage one activity on the step the grade is about to remove.
    const stepShadow = byId('extraCurricularsStep').shadowRoot!;
    (stepShadow.getElementById('addBtn') as HTMLButtonElement).click();
    modal.assignableExtraCurriculars = [
      {
        extraCurricularId: 'ec1',
        description: 'Choir',
        phase: 'Junior',
        practiceTimes: [{ practiceTimeId: 'pt1', day: 'Tuesday', startTime: '14:30:00' }],
      },
    ];
    (stepShadow.getElementById('activitySelect') as HTMLSelectElement).value = 'ec1';
    (stepShadow.getElementById('assignBtn') as HTMLButtonElement).click();
    expect(modal.pendingExtraCurricularIds).toEqual(['ec1']);

    byId<HTMLButtonElement>('tabStudent').click();
    chooseGrade('Private');

    expect(modal.pendingExtraCurricularIds).toEqual([]);
    expect(byId('tabExtraCurriculars').hidden).toBe(true);
    expect(stepShadow.querySelectorAll('tbody tr')).toHaveLength(0);
  });

  it('returns to Courses when the grade turns Private while the step is showing', () => {
    mountModal();
    modal.openForCreate([]);
    fillStudentStep();
    advanceToFinalStep();
    expect(byId('stepExtraCurriculars').classList.contains('wizard__step--visible')).toBe(true);

    chooseGrade('Private');

    // Never left showing a step the wizard no longer offers.
    expect(byId('stepExtraCurriculars').classList.contains('wizard__step--visible')).toBe(false);
    expect(byId('stepCourses').classList.contains('wizard__step--visible')).toBe(true);
    expect(byId('saveBtn').hidden).toBe(false);
  });
});

describe('pm-student-wizard-modal — a Private-grade student in edit mode', { tags: ['277UC28'] }, () => {
  it('offers no Extra-Curriculars tab, leaving Courses last', () => {
    mountModal();

    modal.openForEdit({ ...alice, grade: 'Private', class: null, phase: null });

    const visibleTabs = ([...modal.shadowRoot!.querySelectorAll('.wizard__tab')] as HTMLButtonElement[]).filter(
      (tab) => !tab.hidden,
    );
    expect(visibleTabs.map((tab) => tab.textContent)).toEqual(['Student', 'Siblings', 'Guardians', 'Courses']);
  });

  it('offers the tab again when a different, non-Private student is opened', () => {
    mountModal();
    modal.openForEdit({ ...alice, grade: 'Private', class: null, phase: null });

    modal.openForEdit(alice);

    // The flag belongs to the student being edited, not to the modal instance.
    expect(byId('tabExtraCurriculars').hidden).toBe(false);
  });
});

describe('pm-student-wizard-modal — changing a grade to Private in edit mode', { tags: ['277UC29'] }, () => {
  it('hides the tab on the change, leaving the deletion to the save', () => {
    mountModal();
    modal.openForEdit(alice);
    byId<HTMLButtonElement>('tabExtraCurriculars').click();
    expect(byId('stepExtraCurriculars').classList.contains('wizard__step--visible')).toBe(true);

    byId<HTMLButtonElement>('tabStudent').click();
    chooseGrade('Private');

    expect(byId('tabExtraCurriculars').hidden).toBe(true);
    expect(byId('stepExtraCurriculars').classList.contains('wizard__step--visible')).toBe(false);
  });
});

const individualHourDuringSchool = {
  lessonStructureId: 'ls1',
  lessonType: 'Individual' as const,
  durationType: 'Hour' as const,
  occurrenceType: 'DuringSchool' as const,
};

/** Fills the Waiting List tab's selects with a known, seeded combination. */
function fillWaitingListStep(): void {
  const stepShadow = byId('waitingListStep').shadowRoot!;
  (stepShadow.getElementById('occurrenceType') as HTMLSelectElement).value = individualHourDuringSchool.occurrenceType;
  (stepShadow.getElementById('lessonType') as HTMLSelectElement).value = individualHourDuringSchool.lessonType;
  (stepShadow.getElementById('durationType') as HTMLSelectElement).value = individualHourDuringSchool.durationType;
  (stepShadow.getElementById('instrumentType') as HTMLSelectElement).value = 'Piano';
}

describe('pm-student-wizard-modal — waiting-list mode tabs', { tags: ['293UC12', '293UC13'] }, () => {
  it('presents exactly Student, Siblings, Guardians and Waiting List in waiting-list mode', () => {
    mountModal();
    modal.openForCreate([], 'waitingList');

    const visibleTabs = ([...modal.shadowRoot!.querySelectorAll('.wizard__tab')] as HTMLButtonElement[]).filter(
      (tab) => !tab.hidden,
    );

    expect(visibleTabs.map((tab) => tab.textContent)).toEqual(['Student', 'Siblings', 'Guardians', 'Waiting List']);
  });

  it('presents exactly Student, Siblings, Guardians, Courses and Extra-Curriculars in enrolled mode', () => {
    mountModal();
    modal.openForCreate([]);
    fillStudentStep();
    choosePhase('Junior');

    const visibleTabs = ([...modal.shadowRoot!.querySelectorAll('.wizard__tab')] as HTMLButtonElement[]).filter(
      (tab) => !tab.hidden,
    );

    expect(visibleTabs.map((tab) => tab.textContent)).toEqual([
      'Student',
      'Siblings',
      'Guardians',
      'Courses',
      'Extra-Curriculars',
    ]);
  });

  it('titles the modal for capture', () => {
    mountModal();
    modal.openForCreate([], 'waitingList');

    expect(byId('title').textContent).toBe('Capture Waiting List Student');
  });
});

describe(
  'pm-student-wizard-modal — waiting-list capture is a linear wizard',
  { tags: ['293UC14', '293UC15', '293UC16', '293UC17'] },
  () => {
    it('opens with the Student tab active, the other tabs not directly selectable, and Previous/Next offered', () => {
      mountModal();
      modal.openForCreate([], 'waitingList');

      expect(byId('stepStudent').classList.contains('wizard__step--visible')).toBe(true);
      expect(byId<HTMLButtonElement>('tabSiblings').disabled).toBe(true);
      expect(byId<HTMLButtonElement>('tabGuardians').disabled).toBe(true);
      expect(byId<HTMLButtonElement>('tabWaitingList').disabled).toBe(true);
      expect(byId('nextBtn').hidden).toBe(false);
      expect(byId('saveBtn').hidden).toBe(true);
    });

    it('advances Student to Siblings to Guardians to Waiting List in order, offering Save only on the last', () => {
      mountModal();
      modal.openForCreate([], 'waitingList');
      fillStudentStep();

      byId<HTMLButtonElement>('nextBtn').click();
      expect(byId('stepSiblings').classList.contains('wizard__step--visible')).toBe(true);
      expect(byId('saveBtn').hidden).toBe(true);

      byId<HTMLButtonElement>('nextBtn').click();
      expect(byId('stepGuardians').classList.contains('wizard__step--visible')).toBe(true);
      expect(byId('saveBtn').hidden).toBe(true);

      byId<HTMLButtonElement>('nextBtn').click();
      expect(byId('stepWaitingList').classList.contains('wizard__step--visible')).toBe(true);
      expect(byId('saveBtn').hidden).toBe(false);
      expect(byId('nextBtn').hidden).toBe(true);
    });

    it('returns from Waiting List to Guardians on Previous', () => {
      mountModal();
      modal.openForCreate([], 'waitingList');
      fillStudentStep();
      byId<HTMLButtonElement>('nextBtn').click();
      byId<HTMLButtonElement>('nextBtn').click();
      byId<HTMLButtonElement>('nextBtn').click();

      byId<HTMLButtonElement>('previousBtn').click();

      expect(byId('stepGuardians').classList.contains('wizard__step--visible')).toBe(true);
    });
  },
);

describe(
  'pm-student-wizard-modal — the Waiting List tab',
  { tags: ['293UC18', '293UC19', '293UC20', '293UC21'] },
  () => {
    it('offers Occurrence, Lesson, Duration and Instrument Type, and no course field', () => {
      mountModal();
      modal.openForCreate([], 'waitingList');

      const stepShadow = byId('waitingListStep').shadowRoot!;
      expect(stepShadow.getElementById('occurrenceType')).not.toBeNull();
      expect(stepShadow.getElementById('lessonType')).not.toBeNull();
      expect(stepShadow.getElementById('durationType')).not.toBeNull();
      expect(stepShadow.getElementById('instrumentType')).not.toBeNull();
      expect(stepShadow.querySelector('[id*="course" i]')).toBeNull();
    });

    it('states that Date Added is set automatically instead of offering a field for it', () => {
      mountModal();
      modal.openForCreate([], 'waitingList');

      const stepShadow = byId('waitingListStep').shadowRoot!;
      expect(stepShadow.getElementById('addedAt')).toBeNull();
      expect(stepShadow.textContent).toContain('set automatically');
    });

    it('constrains Notes to the documented maximum length', () => {
      mountModal();
      modal.openForCreate([], 'waitingList');

      const notes = byId('waitingListStep').shadowRoot!.getElementById('notes') as HTMLTextAreaElement;

      expect(notes.maxLength).toBe(500);
    });

    it('hides Class and Phase when Grade is Private in waiting-list mode too', () => {
      mountModal();
      modal.openForCreate([], 'waitingList');

      chooseGrade('Private');

      const studentShadow = byId('studentStep').shadowRoot!;
      expect((studentShadow.getElementById('classField') as HTMLElement).hidden).toBe(true);
      expect((studentShadow.getElementById('phaseField') as HTMLElement).hidden).toBe(true);
    });
  },
);

describe('pm-student-wizard-modal — saving a waiting-list capture', { tags: ['293UC22'] }, () => {
  it('dispatches waiting-list-capture-requested carrying the student, siblings, guardians and waiting-list details', () => {
    mountModal();
    modal.lessonStructures = [individualHourDuringSchool];
    modal.openForCreate([], 'waitingList');
    fillStudentStep();
    byId<HTMLButtonElement>('nextBtn').click();
    byId<HTMLButtonElement>('nextBtn').click();
    byId<HTMLButtonElement>('nextBtn').click();
    fillWaitingListStep();

    let detail: unknown = null;
    modal.addEventListener('waiting-list-capture-requested', (event) => {
      detail = (event as CustomEvent).detail;
    });
    byId<HTMLButtonElement>('saveBtn').click();

    expect(detail).toMatchObject({
      input: { firstName: 'Nadia', lastName: 'Vance' },
      pendingSiblingIds: [],
      pendingGuardians: [],
      waitingListInput: {
        lessonStructureId: 'ls1',
        instrumentType: 'Piano',
        notes: null,
      },
    });
  });

  it('refuses to save and stays on the Waiting List tab when a required field is left unchosen', () => {
    mountModal();
    modal.lessonStructures = [individualHourDuringSchool];
    modal.openForCreate([], 'waitingList');
    fillStudentStep();
    byId<HTMLButtonElement>('nextBtn').click();
    byId<HTMLButtonElement>('nextBtn').click();
    byId<HTMLButtonElement>('nextBtn').click();
    // Instrument Type left at its placeholder.

    let dispatched = false;
    modal.addEventListener('waiting-list-capture-requested', () => {
      dispatched = true;
    });
    byId<HTMLButtonElement>('saveBtn').click();

    expect(dispatched).toBe(false);
    expect(byId('stepWaitingList').classList.contains('wizard__step--visible')).toBe(true);
  });
});
