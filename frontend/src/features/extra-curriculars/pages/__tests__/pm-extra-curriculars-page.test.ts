import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { ExtraCurricularsError, createExtraCurricular, type ExtraCurricular } from '../../services/extra-curriculars';

const mockGetExtraCurriculars = vi.fn();
const mockHasAnyRole = vi.fn();

vi.mock('../../services/extra-curriculars', async () => {
  const actual = await vi.importActual<typeof import('../../services/extra-curriculars')>(
    '../../services/extra-curriculars',
  );
  return {
    ...actual,
    getExtraCurriculars: () => mockGetExtraCurriculars(),
    createExtraCurricular: vi.fn(),
  };
});

vi.mock('../../../../services/token-storage', async () => {
  const actual = await vi.importActual<typeof import('../../../../services/token-storage')>(
    '../../../../services/token-storage',
  );
  return { ...actual, hasAnyRole: (roles: string[]) => mockHasAnyRole(roles) };
});

import '../pm-extra-curriculars-page';
import type { PmExtraCurricularForm } from '../../components/pm-extra-curricular-form';
import type { PmExtraCurricularTable } from '../../components/pm-extra-curricular-table';

const marimba: ExtraCurricular = {
  extraCurricularId: 'ec1',
  description: 'Marimba Band',
  phase: 'Senior',
  practiceTimes: [
    { practiceTimeId: 'pt1', day: 'Monday', startTime: '09:15:00' },
    { practiceTimeId: 'pt2', day: 'Monday', startTime: '16:00:00' },
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

function formOf(el: HTMLElement): PmExtraCurricularForm {
  return el.shadowRoot!.getElementById('form') as unknown as PmExtraCurricularForm;
}

function tableOf(el: HTMLElement): PmExtraCurricularTable {
  return el.shadowRoot!.getElementById('table') as unknown as PmExtraCurricularTable;
}

function filterBarOf(el: HTMLElement): HTMLElement {
  return el.shadowRoot!.getElementById('filterBar') as HTMLElement;
}

function inForm(el: HTMLElement, id: string): HTMLElement {
  return formOf(el).shadowRoot!.getElementById(id) as HTMLElement;
}

function formErrorOf(el: HTMLElement): HTMLElement {
  return inForm(el, 'error');
}

function rowTextsOf(el: HTMLElement): string[][] {
  const rows = tableOf(el).shadowRoot!.querySelectorAll('tbody tr');
  return [...rows].map((row) => [...row.querySelectorAll('td')].map((cell) => cell.textContent ?? ''));
}

function emptyMessageOf(el: HTMLElement): HTMLElement {
  return tableOf(el).shadowRoot!.getElementById('empty') as HTMLElement;
}

/** The staged slot chips, as they read to a person. */
function chipTextsOf(el: HTMLElement): string[] {
  const chips = formOf(el).shadowRoot!.querySelectorAll('.ec-form__chip');
  return [...chips].map((chip) => (chip as HTMLElement).dataset.slot ?? '');
}

function noSlotsMessageOf(el: HTMLElement): HTMLElement {
  return inForm(el, 'noSlots');
}

async function stageSlot(el: HTMLElement, day: string, startTime: string): Promise<void> {
  (inForm(el, 'day') as HTMLSelectElement).value = day;
  (inForm(el, 'startTime') as HTMLInputElement).value = startTime;
  inForm(el, 'addBtn').dispatchEvent(new MouseEvent('click'));
  await flush();
}

async function removeChip(el: HTMLElement, slot: string): Promise<void> {
  const chips = [...formOf(el).shadowRoot!.querySelectorAll('.ec-form__chip')] as HTMLElement[];
  const chip = chips.find((candidate) => candidate.dataset.slot === slot)!;
  chip.querySelector('button')!.dispatchEvent(new MouseEvent('click'));
  await flush();
}

async function enterActivity(el: HTMLElement, description: string, phase: string): Promise<void> {
  (inForm(el, 'description') as HTMLInputElement).value = description;
  (inForm(el, 'phase') as HTMLSelectElement).value = phase;
  await flush();
}

async function submitForm(el: HTMLElement): Promise<void> {
  inForm(el, 'createBtn').dispatchEvent(new MouseEvent('click'));
  await flush();
  await flush();
}

function filterControlOf(el: HTMLElement, id: string): HTMLInputElement | HTMLSelectElement {
  return filterBarOf(el).shadowRoot!.getElementById(id) as HTMLInputElement | HTMLSelectElement;
}

async function changeFilter(el: HTMLElement, id: string, value: string, event = 'change'): Promise<void> {
  const control = filterControlOf(el, id);
  control.value = value;
  control.dispatchEvent(new Event(event));
  await flush();
  await flush();
}

beforeEach(() => {
  mockHasAnyRole.mockReset();
  mockHasAnyRole.mockReturnValue(true);
  mockGetExtraCurriculars.mockReset();
  mockGetExtraCurriculars.mockResolvedValue([marimba, choir]);
  vi.mocked(createExtraCurricular).mockReset();
});

describe('pm-extra-curriculars-page — lists each activity with its slots', { tags: ['275UC12'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('shows the description, a phase badge and the slots joined in the order the server settled', async () => {
    el = await mountPage();

    expect(rowTextsOf(el)).toEqual([
      ['', 'Marimba Band', 'Senior', 'Monday 09:15 · Monday 16:00 · Friday 14:00', ''],
      ['', 'Junior Choir', 'Junior', 'Tuesday 14:30', ''],
    ]);
  });

  it('renders the phase as a badge coloured by phase, not as bare text', async () => {
    el = await mountPage();

    const badges = [...tableOf(el).shadowRoot!.querySelectorAll('.ec-table__badge')] as HTMLElement[];
    expect(badges.map((badge) => badge.textContent)).toEqual(['Senior', 'Junior']);
    expect(badges[0].classList.contains('ec-table__badge--senior')).toBe(true);
    expect(badges[1].classList.contains('ec-table__badge--junior')).toBe(true);
  });

  it('trims the time of day to hours and minutes, with no seconds and no date', async () => {
    el = await mountPage();

    const cell = rowTextsOf(el)[1][3];
    expect(cell).toBe('Tuesday 14:30');
    expect(cell).not.toContain(':00:00');
  });
});

describe('pm-extra-curriculars-page — shows an empty state when nothing matches', { tags: ['275UC13'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('renders the empty-state message in place of rows', async () => {
    el = await mountPage();

    await changeFilter(el, 'description', 'nothing matches this', 'input');

    expect(rowTextsOf(el)).toEqual([]);
    expect(emptyMessageOf(el).hidden).toBe(false);
    expect(emptyMessageOf(el).textContent).toBe('No extra-curricular activities found.');
  });

  it('hides the message again once something matches', async () => {
    el = await mountPage();

    await changeFilter(el, 'description', 'nothing matches this', 'input');
    await changeFilter(el, 'description', 'Marimba', 'input');

    expect(emptyMessageOf(el).hidden).toBe(true);
  });
});

describe('pm-extra-curriculars-page — stages a practice time as a chip', { tags: ['275UC14'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('adds the slot as a removable chip and leaves the controls ready for the next one', async () => {
    el = await mountPage();

    expect(noSlotsMessageOf(el).hidden).toBe(false);
    expect(noSlotsMessageOf(el).textContent).toBe('No practice times added.');

    await stageSlot(el, 'Monday', '15:00');

    expect(chipTextsOf(el)).toEqual(['Monday 15:00']);
    expect(noSlotsMessageOf(el).hidden).toBe(true);
    // Every chip offers its own remove control.
    expect(formOf(el).shadowRoot!.querySelectorAll('.ec-form__chip button')).toHaveLength(1);

    await stageSlot(el, 'Wednesday', '07:30');

    expect(chipTextsOf(el)).toEqual(['Monday 15:00', 'Wednesday 07:30']);
    // Nothing was sent: staging is client-side until Create Activity.
    expect(createExtraCurricular).not.toHaveBeenCalled();
  });

  it('refuses a slot with no start time chosen and stages nothing', async () => {
    el = await mountPage();

    await stageSlot(el, 'Monday', '');

    expect(chipTextsOf(el)).toEqual([]);
    expect(formErrorOf(el).textContent).toContain('Choose a day and a start time');
  });
});

describe('pm-extra-curriculars-page — removes one staged chip', { tags: ['275UC15'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('drops only that chip and leaves the rest untouched', async () => {
    el = await mountPage();

    await stageSlot(el, 'Monday', '15:00');
    await stageSlot(el, 'Tuesday', '15:00');
    await stageSlot(el, 'Thursday', '15:00');

    await removeChip(el, 'Tuesday 15:00');

    expect(chipTextsOf(el)).toEqual(['Monday 15:00', 'Thursday 15:00']);
  });

  it('sends only the chips still staged when the activity is created', async () => {
    vi.mocked(createExtraCurricular).mockResolvedValue(marimba);
    el = await mountPage();

    await enterActivity(el, 'Marimba Band', 'Senior');
    await stageSlot(el, 'Monday', '15:00');
    await stageSlot(el, 'Tuesday', '15:00');
    await stageSlot(el, 'Thursday', '15:00');
    await removeChip(el, 'Tuesday 15:00');
    await submitForm(el);

    // A remove that only hid the chip would send three.
    expect(createExtraCurricular).toHaveBeenCalledWith({
      description: 'Marimba Band',
      phase: 'Senior',
      practiceTimes: [
        { day: 'Monday', startTime: '15:00' },
        { day: 'Thursday', startTime: '15:00' },
      ],
    });
  });
});

describe('pm-extra-curriculars-page — refuses a create with nothing staged', { tags: ['275UC16'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('shows the banner, sends nothing, and keeps what was already entered', async () => {
    el = await mountPage();

    await enterActivity(el, 'Marimba Band', 'Senior');
    await submitForm(el);

    expect(formErrorOf(el).textContent).toBe('An activity must have at least one practice time.');
    expect(createExtraCurricular).not.toHaveBeenCalled();
    // A refusal, not a reset — the user's work survives it.
    expect((inForm(el, 'description') as HTMLInputElement).value).toBe('Marimba Band');
    expect((inForm(el, 'phase') as HTMLSelectElement).value).toBe('Senior');
  });
});

describe('pm-extra-curriculars-page — refuses a duplicate staged slot', { tags: ['275UC17'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('names the slot, adds no second chip and disturbs nothing else', async () => {
    el = await mountPage();

    await enterActivity(el, 'Marimba Band', 'Senior');
    await stageSlot(el, 'Monday', '15:00');
    await stageSlot(el, 'Monday', '15:00');

    expect(formErrorOf(el).textContent).toBe('Monday 15:00 is already a practice time for this activity.');
    expect(chipTextsOf(el)).toEqual(['Monday 15:00']);
    expect((inForm(el, 'description') as HTMLInputElement).value).toBe('Marimba Band');
    expect((inForm(el, 'phase') as HTMLSelectElement).value).toBe('Senior');
  });

  it('accepts a different start time on the same day', async () => {
    el = await mountPage();

    await stageSlot(el, 'Monday', '15:00');
    await stageSlot(el, 'Monday', '16:00');

    // The rule is one slot per day-and-time pair, not one slot per day.
    expect(chipTextsOf(el)).toEqual(['Monday 15:00', 'Monday 16:00']);
  });
});

describe('pm-extra-curriculars-page — clears the form after a create', { tags: ['275UC18'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('empties the description, phase and chips and lists the new activity', async () => {
    const created: ExtraCurricular = {
      extraCurricularId: 'ec3',
      description: 'Recorder Ensemble',
      phase: 'Junior',
      practiceTimes: [{ practiceTimeId: 'pt5', day: 'Wednesday', startTime: '13:30:00' }],
    };
    vi.mocked(createExtraCurricular).mockResolvedValue(created);
    el = await mountPage();
    mockGetExtraCurriculars.mockResolvedValue([marimba, choir, created]);

    await enterActivity(el, 'Recorder Ensemble', 'Junior');
    await stageSlot(el, 'Wednesday', '13:30');
    await submitForm(el);

    expect((inForm(el, 'description') as HTMLInputElement).value).toBe('');
    expect((inForm(el, 'phase') as HTMLSelectElement).value).toBe('');
    expect(chipTextsOf(el)).toEqual([]);
    expect(noSlotsMessageOf(el).hidden).toBe(false);
    expect(rowTextsOf(el)).toHaveLength(3);
    expect(rowTextsOf(el)[2]).toContain('Wednesday 13:30');
  });

  it('clears the filters so an activity created outside the current selection is still shown', async () => {
    const created: ExtraCurricular = {
      extraCurricularId: 'ec3',
      description: 'Recorder Ensemble',
      phase: 'Junior',
      practiceTimes: [{ practiceTimeId: 'pt5', day: 'Wednesday', startTime: '13:30:00' }],
    };
    vi.mocked(createExtraCurricular).mockResolvedValue(created);
    el = await mountPage();
    mockGetExtraCurriculars.mockResolvedValue([marimba, choir, created]);

    await changeFilter(el, 'phase', 'Senior');
    expect(rowTextsOf(el)).toHaveLength(1);

    await enterActivity(el, 'Recorder Ensemble', 'Junior');
    await stageSlot(el, 'Wednesday', '13:30');
    await submitForm(el);

    expect((filterControlOf(el, 'phase') as HTMLSelectElement).value).toBe('');
    expect(rowTextsOf(el)).toHaveLength(3);
  });

  it('shows the reason inline and leaves the entered values in place when the create is refused', async () => {
    vi.mocked(createExtraCurricular).mockRejectedValue(
      new ExtraCurricularsError('An activity must have at least one practice time.', 400),
    );
    el = await mountPage();

    await enterActivity(el, 'Recorder Ensemble', 'Junior');
    await stageSlot(el, 'Wednesday', '13:30');
    await submitForm(el);

    expect(formErrorOf(el).textContent).toContain('at least one practice time');
    expect((inForm(el, 'description') as HTMLInputElement).value).toBe('Recorder Ensemble');
    expect(chipTextsOf(el)).toEqual(['Wednesday 13:30']);
  });
});

describe('pm-extra-curriculars-page — narrows the list by phase', { tags: ['275UC19'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('leaves only activities of the chosen phase, and restores both on All Phases', async () => {
    el = await mountPage();
    const readsOnLoad = mockGetExtraCurriculars.mock.calls.length;

    await changeFilter(el, 'phase', 'Junior');
    expect(rowTextsOf(el).map((row) => row[1])).toEqual(['Junior Choir']);

    await changeFilter(el, 'phase', 'Senior');
    expect(rowTextsOf(el).map((row) => row[1])).toEqual(['Marimba Band']);

    await changeFilter(el, 'phase', '');
    expect(rowTextsOf(el).map((row) => row[1])).toEqual(['Marimba Band', 'Junior Choir']);

    // Narrowed over the cached catalogue, without a further round trip.
    expect(mockGetExtraCurriculars.mock.calls.length).toBe(readsOnLoad);
  });
});

describe('pm-extra-curriculars-page — narrows the list by description', { tags: ['275UC20'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('matches on any part of the description, ignoring case', async () => {
    el = await mountPage();

    await changeFilter(el, 'description', 'choir', 'input');

    expect(rowTextsOf(el).map((row) => row[1])).toEqual(['Junior Choir']);
  });

  it('combines with the phase filter rather than replacing it', async () => {
    el = await mountPage();

    await changeFilter(el, 'description', 'band', 'input');
    await changeFilter(el, 'phase', 'Junior');

    expect(rowTextsOf(el)).toEqual([]);
  });
});

describe('pm-extra-curriculars-page — narrows the list by day', { tags: ['275UC21'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('keeps an activity holding a practice time on that day, whatever its other days', async () => {
    el = await mountPage();

    await changeFilter(el, 'day', 'Friday');
    // Marimba Band practises on Monday twice and Friday once — one match is enough.
    expect(rowTextsOf(el).map((row) => row[1])).toEqual(['Marimba Band']);

    await changeFilter(el, 'day', 'Tuesday');
    expect(rowTextsOf(el).map((row) => row[1])).toEqual(['Junior Choir']);

    await changeFilter(el, 'day', 'Saturday');
    expect(rowTextsOf(el)).toEqual([]);
  });
});

describe('pm-extra-curriculars-page — read-only for a Teacher who is not a Coordinator', { tags: ['275UC24'] }, () => {
  let el: HTMLElement;

  afterEach(() => document.body.removeChild(el));

  it('renders the filter bar and table with the create form absent rather than disabled', async () => {
    mockHasAnyRole.mockReturnValue(false);
    el = await mountPage();

    expect(formOf(el).hidden).toBe(true);
    expect((filterBarOf(el) as HTMLElement).hidden).toBe(false);
    expect(tableOf(el).shadowRoot!.getElementById('actionsHeader')!.hidden).toBe(true);
    // The list itself is still read and shown in full.
    expect(rowTextsOf(el)).toEqual([
      ['', 'Marimba Band', 'Senior', 'Monday 09:15 · Monday 16:00 · Friday 14:00'],
      ['', 'Junior Choir', 'Junior', 'Tuesday 14:30'],
    ]);
  });

  it('asks only about the Coordinator role, so holding Admin grants nothing here', async () => {
    el = await mountPage();

    expect(mockHasAnyRole).toHaveBeenCalledWith(['Coordinator']);
  });
});
