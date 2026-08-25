import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ExtraCurricularsError,
  addPracticeTime,
  removePracticeTime,
  type ExtraCurricular,
} from '../../services/extra-curriculars';

const mockGetExtraCurriculars = vi.fn();
const mockHasAnyRole = vi.fn();

vi.mock('../../services/extra-curriculars', async () => {
  const actual = await vi.importActual<typeof import('../../services/extra-curriculars')>(
    '../../services/extra-curriculars',
  );
  return {
    ...actual,
    getExtraCurriculars: () => mockGetExtraCurriculars(),
    addPracticeTime: vi.fn(),
    removePracticeTime: vi.fn(),
  };
});

vi.mock('../../../../services/token-storage', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/token-storage')>(
    '../../../../services/token-storage',
  );
  return { ...actual, hasAnyRole: (roles: string[]) => mockHasAnyRole(roles) };
});

import '../pm-extra-curriculars-page';
import type { PmExtraCurricularPracticeTimes } from '../../components/pm-extra-curricular-practice-times';
import type { PmExtraCurricularTable } from '../../components/pm-extra-curricular-table';

/** Slots come back in the order the server settled — day of week from Monday, then start time. */
const marimba: ExtraCurricular = {
  extraCurricularId: 'ec1',
  description: 'Marimba Band',
  phase: 'Senior',
  practiceTimes: [
    { practiceTimeId: 'pt1', day: 'Monday', startTime: '15:00:00' },
    { practiceTimeId: 'pt2', day: 'Wednesday', startTime: '15:00:00' },
    { practiceTimeId: 'pt3', day: 'Friday', startTime: '14:00:00' },
  ],
};

const choir: ExtraCurricular = {
  extraCurricularId: 'ec2',
  description: 'Junior Choir',
  phase: 'Junior',
  practiceTimes: [{ practiceTimeId: 'pt4', day: 'Tuesday', startTime: '14:30:00' }],
};

const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function mountPage(): Promise<HTMLElement> {
  const el = document.createElement('pm-extra-curriculars-page');
  document.body.appendChild(el);
  await flush();
  await flush();
  return el;
}

function tableOf(el: HTMLElement): PmExtraCurricularTable {
  return el.shadowRoot!.getElementById('table') as unknown as PmExtraCurricularTable;
}

function panelOf(el: HTMLElement): PmExtraCurricularPracticeTimes | null {
  return tableOf(el).shadowRoot!.querySelector(
    'pm-extra-curricular-practice-times',
  ) as unknown as PmExtraCurricularPracticeTimes | null;
}

function inPanel(el: HTMLElement, id: string): HTMLElement {
  return panelOf(el)!.shadowRoot!.getElementById(id) as HTMLElement;
}

/** The chevron on the row of the activity with this description. */
function expanderFor(el: HTMLElement, description: string): HTMLButtonElement {
  const rows = [...tableOf(el).shadowRoot!.querySelectorAll('tbody tr')] as HTMLTableRowElement[];
  const row = rows.find((candidate) => candidate.cells[1]?.textContent === description)!;
  return row.querySelector('.ec-table__chevron') as HTMLButtonElement;
}

async function toggleRow(el: HTMLElement, description: string): Promise<void> {
  expanderFor(el, description).dispatchEvent(new MouseEvent('click'));
  await flush();
}

/** Every slot the open panel lists, in the order it lists them. */
function panelSlotsOf(el: HTMLElement): string[] {
  const rows = [...panelOf(el)!.shadowRoot!.querySelectorAll('tbody tr')] as HTMLTableRowElement[];
  return rows.map((row) => `${row.cells[0].textContent} ${row.cells[1].textContent}`);
}

/** The row's own Practice Times cell, which must agree with the panel. */
function summaryCellOf(el: HTMLElement, description: string): string {
  const rows = [...tableOf(el).shadowRoot!.querySelectorAll('tbody tr')] as HTMLTableRowElement[];
  const row = rows.find((candidate) => candidate.cells[1]?.textContent === description)!;
  return row.cells[3].textContent ?? '';
}

function panelErrorOf(el: HTMLElement): HTMLElement {
  return inPanel(el, 'error');
}

function panelErrorTextOf(el: HTMLElement): string {
  return inPanel(el, 'errorText').textContent ?? '';
}

function isPanelErrorVisible(el: HTMLElement): boolean {
  return panelErrorOf(el).classList.contains('ec-panel__error--visible');
}

async function pressAdd(el: HTMLElement, day: string, startTime: string): Promise<void> {
  (inPanel(el, 'day') as HTMLSelectElement).value = day;
  (inPanel(el, 'startTime') as HTMLInputElement).value = startTime;
  inPanel(el, 'addBtn').dispatchEvent(new MouseEvent('click'));
  await flush();
  await flush();
}

async function pressRemove(el: HTMLElement, slot: string): Promise<void> {
  const rows = [...panelOf(el)!.shadowRoot!.querySelectorAll('tbody tr')] as HTMLTableRowElement[];
  const row = rows.find((candidate) => `${candidate.cells[0].textContent} ${candidate.cells[1].textContent}` === slot)!;
  row.querySelector('.ec-panel__remove')!.dispatchEvent(new MouseEvent('click'));
  await flush();
  await flush();
}

/** What the catalogue reads as on the next load, once a change has landed. */
function thenCatalogueIs(...activities: ExtraCurricular[]): void {
  mockGetExtraCurriculars.mockResolvedValue(activities);
}

function withSlots(activity: ExtraCurricular, ...practiceTimes: ExtraCurricular['practiceTimes']): ExtraCurricular {
  return { ...activity, practiceTimes };
}

beforeEach(() => {
  mockHasAnyRole.mockReset();
  mockHasAnyRole.mockReturnValue(true);
  mockGetExtraCurriculars.mockReset();
  mockGetExtraCurriculars.mockResolvedValue([marimba, choir]);
  vi.mocked(addPracticeTime).mockReset();
  vi.mocked(removePracticeTime).mockReset();
});

describe('practice-times panel — opens beneath the row it belongs to', { tags: ['276UC10'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('lists every slot of that activity under a heading naming it', async () => {
    el = await mountPage();

    expect(panelOf(el)).toBeNull();

    await toggleRow(el, 'Marimba Band');

    expect(inPanel(el, 'title').textContent).toBe('Practice Times — Marimba Band');
    expect(panelSlotsOf(el)).toEqual(['Monday 15:00', 'Wednesday 15:00', 'Friday 14:00']);
  });

  it('shows the slots of the activity it belongs to and no other', async () => {
    el = await mountPage();

    await toggleRow(el, 'Junior Choir');

    expect(inPanel(el, 'title').textContent).toBe('Practice Times — Junior Choir');
    expect(panelSlotsOf(el)).toEqual(['Tuesday 14:30']);
  });

  it('opens the panel directly beneath its own activity row', async () => {
    el = await mountPage();

    await toggleRow(el, 'Marimba Band');

    const rows = [...tableOf(el).shadowRoot!.querySelectorAll('tbody tr')] as HTMLTableRowElement[];
    expect(rows[0].cells[1].textContent).toBe('Marimba Band');
    expect(rows[1].dataset.practiceTimesPanelFor).toBe('ec1');
  });
});

describe('practice-times panel — closes again', { tags: ['276UC11'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('removes the panel and returns the chevron to its collapsed glyph', async () => {
    el = await mountPage();

    await toggleRow(el, 'Marimba Band');
    expect(expanderFor(el, 'Marimba Band').textContent).toBe('expand_more');

    await toggleRow(el, 'Marimba Band');

    expect(panelOf(el)).toBeNull();
    // The collapsed state is visible in its own right, not inferred from the
    // panel's absence.
    expect(expanderFor(el, 'Marimba Band').textContent).toBe('chevron_right');
  });
});

describe('practice-times panel — adds a slot', { tags: ['276UC12'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('lists the new slot in the panel and in the row summary, without a reload', async () => {
    el = await mountPage();
    await toggleRow(el, 'Junior Choir');

    vi.mocked(addPracticeTime).mockResolvedValue({
      practiceTimeId: 'pt5',
      day: 'Thursday',
      startTime: '16:00:00',
    });
    thenCatalogueIs(
      marimba,
      withSlots(choir, choir.practiceTimes[0], { practiceTimeId: 'pt5', day: 'Thursday', startTime: '16:00:00' }),
    );

    await pressAdd(el, 'Thursday', '16:00');

    expect(vi.mocked(addPracticeTime)).toHaveBeenCalledWith('ec2', { day: 'Thursday', startTime: '16:00' });
    expect(panelSlotsOf(el)).toEqual(['Tuesday 14:30', 'Thursday 16:00']);
    // The summary above the panel agrees with it — a panel that refreshed only
    // itself would leave this stale.
    expect(summaryCellOf(el, 'Junior Choir')).toBe('Tuesday 14:30 · Thursday 16:00');
  });

  it('still offers exactly the seven days after the change re-renders the table', async () => {
    el = await mountPage();
    await toggleRow(el, 'Junior Choir');

    expect((inPanel(el, 'day') as HTMLSelectElement).options).toHaveLength(7);

    vi.mocked(addPracticeTime).mockResolvedValue({
      practiceTimeId: 'pt5',
      day: 'Thursday',
      startTime: '16:00:00',
    });
    thenCatalogueIs(
      marimba,
      withSlots(choir, choir.practiceTimes[0], { practiceTimeId: 'pt5', day: 'Thursday', startTime: '16:00:00' }),
    );

    await pressAdd(el, 'Thursday', '16:00');
    await pressAdd(el, 'Saturday', '08:00');

    // The table moves the retained panel between parents on every render, so the
    // element reconnects each time. Anything one-time done on connect would have
    // given the select a second and third set of Monday-Sunday by now.
    expect((inPanel(el, 'day') as HTMLSelectElement).options).toHaveLength(7);
  });

  it('keeps the day and start time already chosen across the re-render', async () => {
    el = await mountPage();
    await toggleRow(el, 'Junior Choir');

    vi.mocked(addPracticeTime).mockResolvedValue({
      practiceTimeId: 'pt5',
      day: 'Thursday',
      startTime: '16:00:00',
    });
    thenCatalogueIs(
      marimba,
      withSlots(choir, choir.practiceTimes[0], { practiceTimeId: 'pt5', day: 'Thursday', startTime: '16:00:00' }),
    );

    await pressAdd(el, 'Thursday', '16:00');

    // The next slot is usually a single change away, so the panel is not rebuilt
    // under the user — which is the reason the element is retained at all.
    expect((inPanel(el, 'day') as HTMLSelectElement).value).toBe('Thursday');
    expect((inPanel(el, 'startTime') as HTMLInputElement).value).toBe('16:00');
  });

  it('shows the server refusal on the panel and leaves the slots as they were', async () => {
    el = await mountPage();
    await toggleRow(el, 'Junior Choir');

    vi.mocked(addPracticeTime).mockRejectedValue(new ExtraCurricularsError('Extra-curricular was not found.', 404));

    await pressAdd(el, 'Thursday', '16:00');

    expect(isPanelErrorVisible(el)).toBe(true);
    expect(panelErrorTextOf(el)).toBe('Extra-curricular was not found.');
    expect(panelSlotsOf(el)).toEqual(['Tuesday 14:30']);
  });
});

describe('practice-times panel — refuses a slot the activity already holds', { tags: ['276UC13'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('names the slot, marks both controls and sends nothing', async () => {
    el = await mountPage();
    await toggleRow(el, 'Marimba Band');

    await pressAdd(el, 'Monday', '15:00');

    expect(panelErrorTextOf(el)).toBe('Monday 15:00 is already a practice time for this activity.');
    expect(isPanelErrorVisible(el)).toBe(true);
    expect((inPanel(el, 'day') as HTMLSelectElement).classList.contains('ec-panel__select--error')).toBe(true);
    expect((inPanel(el, 'startTime') as HTMLInputElement).classList.contains('ec-panel__time--error')).toBe(true);
    // A guard that shows the banner and posts anyway would fail only here.
    expect(vi.mocked(addPracticeTime)).not.toHaveBeenCalled();
    expect(panelSlotsOf(el)).toEqual(['Monday 15:00', 'Wednesday 15:00', 'Friday 14:00']);
  });

  it('accepts the same day at a different start time', async () => {
    el = await mountPage();
    await toggleRow(el, 'Marimba Band');

    vi.mocked(addPracticeTime).mockResolvedValue({ practiceTimeId: 'pt9', day: 'Monday', startTime: '16:00:00' });
    thenCatalogueIs(
      withSlots(
        marimba,
        marimba.practiceTimes[0],
        { practiceTimeId: 'pt9', day: 'Monday', startTime: '16:00:00' },
        marimba.practiceTimes[1],
        marimba.practiceTimes[2],
      ),
      choir,
    );

    await pressAdd(el, 'Monday', '16:00');

    // The rule is one slot per day-and-time, not one slot per day.
    expect(vi.mocked(addPracticeTime)).toHaveBeenCalledWith('ec1', { day: 'Monday', startTime: '16:00' });
    expect(panelSlotsOf(el)).toEqual(['Monday 15:00', 'Monday 16:00', 'Wednesday 15:00', 'Friday 14:00']);
  });
});

describe('practice-times panel — removes a slot', { tags: ['276UC14'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('drops only that slot from the panel and the row summary', async () => {
    el = await mountPage();
    await toggleRow(el, 'Marimba Band');

    vi.mocked(removePracticeTime).mockResolvedValue();
    thenCatalogueIs(withSlots(marimba, marimba.practiceTimes[0], marimba.practiceTimes[2]), choir);

    // The middle slot: a removal written against a position rather than an
    // identity takes out a neighbour, which the first or last would hide.
    await pressRemove(el, 'Wednesday 15:00');

    expect(vi.mocked(removePracticeTime)).toHaveBeenCalledWith('ec1', 'pt2');
    expect(panelSlotsOf(el)).toEqual(['Monday 15:00', 'Friday 14:00']);
    expect(summaryCellOf(el, 'Marimba Band')).toBe('Monday 15:00 · Friday 14:00');
  });
});

describe('practice-times panel — refuses removing the last slot', { tags: ['276UC15'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('states the rule, keeps the slot and sends nothing', async () => {
    el = await mountPage();
    await toggleRow(el, 'Junior Choir');

    await pressRemove(el, 'Tuesday 14:30');

    expect(panelErrorTextOf(el)).toBe('An activity must have at least one practice time.');
    expect(isPanelErrorVisible(el)).toBe(true);
    expect(vi.mocked(removePracticeTime)).not.toHaveBeenCalled();
    expect(panelSlotsOf(el)).toEqual(['Tuesday 14:30']);
    expect(summaryCellOf(el, 'Junior Choir')).toBe('Tuesday 14:30');
  });

  it('refuses as soon as a slot becomes the last, without a reload', async () => {
    el = await mountPage();
    await toggleRow(el, 'Junior Choir');

    // Two slots to begin with, so the first removal succeeds and leaves one.
    thenCatalogueIs(
      marimba,
      withSlots(choir, choir.practiceTimes[0], { practiceTimeId: 'pt6', day: 'Friday', startTime: '08:00:00' }),
    );
    tableOf(el).extraCurriculars = await mockGetExtraCurriculars();
    await flush();

    vi.mocked(removePracticeTime).mockResolvedValue();
    thenCatalogueIs(marimba, withSlots(choir, choir.practiceTimes[0]));
    await pressRemove(el, 'Friday 08:00');

    expect(panelSlotsOf(el)).toEqual(['Tuesday 14:30']);

    await pressRemove(el, 'Tuesday 14:30');

    // A guard evaluated once at render, against the count the panel opened with,
    // would let the activity be emptied here.
    expect(vi.mocked(removePracticeTime)).toHaveBeenCalledTimes(1);
    expect(panelErrorTextOf(el)).toBe('An activity must have at least one practice time.');
    expect(panelSlotsOf(el)).toEqual(['Tuesday 14:30']);
  });
});

describe('practice-times panel — shows slots in day-then-time order', { tags: ['276UC16'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('re-reads the settled order rather than appending each addition to the end', async () => {
    mockGetExtraCurriculars.mockResolvedValue([
      withSlots(choir, { practiceTimeId: 'pt7', day: 'Friday', startTime: '14:00:00' }),
    ]);
    el = await mountPage();
    await toggleRow(el, 'Junior Choir');

    const later = { practiceTimeId: 'pt8', day: 'Monday' as const, startTime: '16:00:00' };
    const earlier = { practiceTimeId: 'pt9', day: 'Monday' as const, startTime: '09:15:00' };
    const friday = { practiceTimeId: 'pt7', day: 'Friday' as const, startTime: '14:00:00' };

    vi.mocked(addPracticeTime).mockResolvedValue(later);
    thenCatalogueIs(withSlots(choir, later, friday));
    await pressAdd(el, 'Monday', '16:00');

    vi.mocked(addPracticeTime).mockResolvedValue(earlier);
    thenCatalogueIs(withSlots(choir, earlier, later, friday));
    await pressAdd(el, 'Monday', '09:15');

    // Both slots were added after the Friday one and still sort before it, in
    // the panel and in the summary alike.
    expect(panelSlotsOf(el)).toEqual(['Monday 09:15', 'Monday 16:00', 'Friday 14:00']);
    expect(summaryCellOf(el, 'Junior Choir')).toBe('Monday 09:15 · Monday 16:00 · Friday 14:00');
  });
});

describe('practice-times panel — read-only for a Teacher', { tags: ['276UC17'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('lists the slots with neither the Add control nor a per-slot Remove', async () => {
    mockHasAnyRole.mockReturnValue(false);
    el = await mountPage();

    await toggleRow(el, 'Marimba Band');

    expect(panelSlotsOf(el)).toEqual(['Monday 15:00', 'Wednesday 15:00', 'Friday 14:00']);
    // Absent, not disabled — the same convention the create form follows.
    expect(inPanel(el, 'add').hidden).toBe(true);
    expect(inPanel(el, 'actionsHeader').hidden).toBe(true);
    expect(panelOf(el)!.shadowRoot!.querySelectorAll('.ec-panel__remove')).toHaveLength(0);
  });
});
