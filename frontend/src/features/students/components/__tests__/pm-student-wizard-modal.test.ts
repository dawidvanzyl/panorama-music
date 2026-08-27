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
  (stepShadow.getElementById('phase') as HTMLSelectElement).value = 'Junior';
  (stepShadow.getElementById('language') as HTMLSelectElement).value = 'English';
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

    const tabs = [...modal.shadowRoot!.querySelectorAll('.wizard__tab')] as HTMLButtonElement[];

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
