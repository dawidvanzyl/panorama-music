import { describe, it, expect, beforeEach, afterEach } from 'vitest';
// Side-effect import: the class below is used only as a type, so without this
// the module — and its customElements.define — would be elided.
import '../pm-extra-curriculars-step';
import type { PmExtraCurricularsStep } from '../pm-extra-curriculars-step';
import { NO_ACTIVITIES_ASSIGNED, PHASE_RESTRICTION_NOTE } from '../extra-curricular-options';
import type { StudentExtraCurricular } from '../../services/student-extra-curriculars';

const choir: StudentExtraCurricular = {
  extraCurricularId: 'ec1',
  description: 'Choir',
  phase: 'Junior',
  practiceTimes: [
    { practiceTimeId: 'pt1', day: 'Tuesday', startTime: '14:30:00' },
    { practiceTimeId: 'pt2', day: 'Thursday', startTime: '15:30:00' },
  ],
};

const orchestra: StudentExtraCurricular = {
  extraCurricularId: 'ec2',
  description: 'String Orchestra',
  phase: 'Junior',
  practiceTimes: [{ practiceTimeId: 'pt3', day: 'Monday', startTime: '14:30:00' }],
};

const drumline: StudentExtraCurricular = {
  extraCurricularId: 'ec3',
  description: 'Junior Drumline',
  phase: 'Junior',
  practiceTimes: [{ practiceTimeId: 'pt4', day: 'Tuesday', startTime: '13:30:00' }],
};

let step: PmExtraCurricularsStep;

function shadow(): ShadowRoot {
  return step.shadowRoot!;
}

function byId<T extends HTMLElement>(id: string): T {
  return shadow().getElementById(id) as T;
}

function rows(): HTMLTableRowElement[] {
  return [...shadow().querySelectorAll('tbody tr')] as HTMLTableRowElement[];
}

function cellsOf(row: HTMLTableRowElement): string[] {
  return [...row.querySelectorAll('td')].map((cell) => cell.textContent!);
}

function pickerOptions(): string[] {
  return [...byId<HTMLSelectElement>('activitySelect').options].map((option) => option.textContent!);
}

function isPanelOpen(): boolean {
  return byId('panel').classList.contains('ec-step__panel--expanded');
}

/** Opens the Add Activity panel and answers the request it makes with `offered`. */
function openPanel(offered: StudentExtraCurricular[]): void {
  byId<HTMLButtonElement>('addBtn').click();
  step.assignable = offered;
}

/** Opens the panel, chooses `extraCurricularId` and presses Assign. */
function assign(offered: StudentExtraCurricular[], extraCurricularId: string): void {
  openPanel(offered);
  byId<HTMLSelectElement>('activitySelect').value = extraCurricularId;
  byId<HTMLButtonElement>('assignBtn').click();
}

beforeEach(() => {
  step = document.createElement('pm-extra-curriculars-step') as PmExtraCurricularsStep;
  document.body.appendChild(step);
});

afterEach(() => {
  document.body.removeChild(step);
});

describe('pm-extra-curriculars-step — empty state', { tags: ['277UC12'] }, () => {
  it('shows the empty-state message in place of rows when the student takes part in nothing', () => {
    step.activate('s1', 'Junior');
    step.assigned = [];

    expect(rows()).toHaveLength(0);
    const empty = byId('empty');
    expect(empty.hidden).toBe(false);
    expect(empty.textContent).toBe(NO_ACTIVITIES_ASSIGNED);
  });

  it('hides the empty-state message once the student takes part in something', () => {
    step.activate('s1', 'Junior');
    step.assigned = [choir];

    expect(byId('empty').hidden).toBe(true);
  });
});

describe('pm-extra-curriculars-step — assigned rows', { tags: ['277UC13'] }, () => {
  beforeEach(() => {
    step.activate('s1', 'Junior');
    step.assigned = [choir, orchestra];
  });

  it('shows the activity, its phase, its practice-time slots and a Remove control per row', () => {
    expect(rows().map(cellsOf)).toEqual([
      ['Choir', 'Junior', 'Tuesday 14:30 · Thursday 15:30', 'Remove'],
      ['String Orchestra', 'Junior', 'Monday 14:30', 'Remove'],
    ]);
  });

  it('renders the phase as a badge coloured by phase, not as bare text', () => {
    step.assigned = [choir, { ...orchestra, phase: 'Senior' }];
    const badges = [...shadow().querySelectorAll('.ec-step__badge')] as HTMLElement[];

    expect(badges.map((badge) => badge.textContent)).toEqual(['Junior', 'Senior']);
    expect(badges[0].classList.contains('ec-step__badge--junior')).toBe(true);
    expect(badges[1].classList.contains('ec-step__badge--senior')).toBe(true);
  });
});

describe('pm-extra-curriculars-step — the Add Activity panel', { tags: ['277UC14'] }, () => {
  beforeEach(() => {
    step.activate('s1', 'Junior');
    step.assigned = [];
  });

  it('opens on Add Activity offering a picker, a disabled Phase field and Cancel and Assign', () => {
    expect(isPanelOpen()).toBe(false);

    openPanel([orchestra]);

    const phaseField = byId<HTMLInputElement>('phaseField');
    expect(isPanelOpen()).toBe(true);
    expect(byId('activitySelect')).not.toBeNull();
    // The student's own phase, shown so it is clear why the list is limited —
    // and not editable from here.
    expect(phaseField.value).toBe('Junior');
    expect(phaseField.disabled).toBe(true);
    expect(byId('note').textContent).toBe(PHASE_RESTRICTION_NOTE);
    expect(byId('cancelBtn').textContent).toBe('Cancel');
    expect(byId('assignBtn').textContent).toBe('Assign');
  });
});

describe('pm-extra-curriculars-step — what the picker offers', { tags: ['277UC15'] }, () => {
  it('labels each option with its description and its practice time', () => {
    step.activate('s1', 'Junior');
    step.assigned = [];

    openPanel([drumline, orchestra]);

    expect(pickerOptions()).toEqual(['Junior Drumline — Tuesday 13:30', 'String Orchestra — Monday 14:30']);
  });

  it('leaves out an activity already staged, which the server cannot know about in create mode', () => {
    step.activateForCreate('Junior');
    assign([choir, orchestra], choir.extraCurricularId);

    openPanel([choir, orchestra]);

    expect(pickerOptions()).toEqual(['String Orchestra — Monday 14:30']);
  });
});

describe('pm-extra-curriculars-step — assigning', { tags: ['277UC16'] }, () => {
  it('closes the panel and lists the activity in the assigned table', () => {
    step.activateForCreate('Junior');

    assign([choir, orchestra], orchestra.extraCurricularId);

    expect(isPanelOpen()).toBe(false);
    expect(rows().map((row) => cellsOf(row)[0])).toEqual(['String Orchestra']);
  });
});

describe('pm-extra-curriculars-step — cancelling the panel', { tags: ['277UC17'] }, () => {
  it('closes the panel without assigning anything or asking for anything to be assigned', () => {
    step.activate('s1', 'Junior');
    step.assigned = [];
    const requests: Event[] = [];
    step.addEventListener('extra-curricular-assign-requested', (event) => requests.push(event));

    openPanel([choir]);
    byId<HTMLButtonElement>('cancelBtn').click();

    expect(isPanelOpen()).toBe(false);
    expect(requests).toHaveLength(0);
    expect(rows()).toHaveLength(0);
  });
});

describe('pm-extra-curriculars-step — Assign with nothing chosen', { tags: ['277UC18'] }, () => {
  it('assigns nothing and sends nothing when the picker has no options to choose from', () => {
    step.activateForCreate('Junior');
    const requests: Event[] = [];
    step.addEventListener('extra-curricular-assign-requested', (event) => requests.push(event));

    openPanel([]);
    byId<HTMLButtonElement>('assignBtn').click();

    expect(requests).toHaveLength(0);
    expect(rows()).toHaveLength(0);
    // The panel stays open: nothing happened, so there is nothing to return from.
    expect(isPanelOpen()).toBe(true);
  });
});

describe('pm-extra-curriculars-step — removing an assignment', { tags: ['277UC19'] }, () => {
  it('drops only that row and offers the activity in the picker again', () => {
    step.activateForCreate('Junior');
    assign([choir, orchestra, drumline], choir.extraCurricularId);
    assign([orchestra, drumline], orchestra.extraCurricularId);
    expect(rows().map((row) => cellsOf(row)[0])).toEqual(['Choir', 'String Orchestra']);

    // The first of two, so a removal that dropped a neighbour instead would show.
    (rows()[0].querySelector('.ec-step__remove') as HTMLButtonElement).click();

    expect(rows().map((row) => cellsOf(row)[0])).toEqual(['String Orchestra']);

    openPanel([choir, orchestra, drumline]);
    expect(pickerOptions()).toEqual(['Choir — Tuesday 14:30', 'Junior Drumline — Tuesday 13:30']);
  });

  it('asks the page to remove a persisted assignment rather than dropping it in memory', () => {
    step.activate('s1', 'Junior');
    step.assigned = [choir, orchestra];
    const requests: CustomEvent[] = [];
    step.addEventListener('extra-curricular-remove-requested', (event) => requests.push(event as CustomEvent));

    (rows()[1].querySelector('.ec-step__remove') as HTMLButtonElement).click();

    expect(requests).toHaveLength(1);
    expect(requests[0].detail).toEqual({ studentId: 's1', extraCurricularId: orchestra.extraCurricularId });
    // Nothing is dropped locally — the table is refreshed from the server once
    // the removal actually lands.
    expect(rows()).toHaveLength(2);
  });
});

describe('pm-extra-curriculars-step — create mode stages, edit mode does not', { tags: ['277UC21'] }, () => {
  it('stages assignments in memory and sends no request while the student does not exist', () => {
    step.activateForCreate('Junior');
    const requests: Event[] = [];
    step.addEventListener('extra-curricular-assign-requested', (event) => requests.push(event));

    assign([choir, orchestra], choir.extraCurricularId);
    assign([orchestra], orchestra.extraCurricularId);

    expect(requests).toHaveLength(0);
    // Both staged, in the order they were chosen — the second did not replace
    // the first.
    expect(step.pendingExtraCurricularIds).toEqual(['ec1', 'ec2']);
  });

  it('asks the page to write an assignment straight away once the student exists', () => {
    step.activate('s1', 'Junior');
    step.assigned = [];
    const requests: CustomEvent[] = [];
    step.addEventListener('extra-curricular-assign-requested', (event) => requests.push(event as CustomEvent));

    assign([choir], choir.extraCurricularId);

    expect(requests).toHaveLength(1);
    expect(requests[0].detail).toEqual({ studentId: 's1', extraCurricularId: 'ec1' });
  });
});
