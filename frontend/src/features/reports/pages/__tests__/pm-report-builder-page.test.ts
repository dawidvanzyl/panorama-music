import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { getFields, getSavedReport, updateReport, saveReport, runReport, ReportsError } from '../../services/reports';
import { clearBuilderState, holdDefinition, holdEditingReport } from '../../state/report-builder-state';
import type { ReportFieldsModel, SavedReportDetail } from '../../models/report';

vi.mock('../../services/reports', async () => {
  const actual = await vi.importActual<typeof import('../../services/reports')>('../../services/reports');
  return {
    ...actual,
    getFields: vi.fn(),
    getSavedReport: vi.fn(),
    updateReport: vi.fn(),
    saveReport: vi.fn(),
    runReport: vi.fn(),
  };
});

import '../pm-report-builder-page';
import type { PmReportFiltersPanel } from '../../components/pm-report-filters-panel';
import type { PmReportColumnsPanel } from '../../components/pm-report-columns-panel';
import type { PmSaveReportModal } from '../../components/pm-save-report-modal';

const fields: ReportFieldsModel = {
  filters: [
    {
      key: 'student.grade',
      collection: 'Student',
      label: 'Grade',
      dataType: 'List',
      operators: ['equals', 'in'],
      options: [{ value: 'Grade4', label: 'Grade 4' }],
    },
  ],
  columns: [
    { key: 'student.name', collection: 'Student', header: 'Student', displayOrder: 1, dependsOn: null, locked: true },
    { key: 'student.class', collection: 'Student', header: 'Class', displayOrder: 2, dependsOn: null, locked: false },
  ],
};

const ownedDetail: SavedReportDetail = {
  identity: { id: 'r1', name: 'Grade 4 Contacts', createdBy: 'me@test.com', isOwner: true },
  definition: {
    filters: [{ field: 'student.grade', operator: 'equals', values: ['Grade4'] }],
    columns: ['student.name', 'student.class'],
  },
};

const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function mountEditing(reportId = 'r1'): Promise<HTMLElement> {
  const el = document.createElement('pm-report-builder-page');
  el.setAttribute('report-id', reportId);
  document.body.appendChild(el);
  await flush();
  return el;
}

function filtersPanelOf(el: HTMLElement): PmReportFiltersPanel {
  return el.shadowRoot!.getElementById('filtersPanel') as unknown as PmReportFiltersPanel;
}

function filterCountOf(el: HTMLElement): string {
  return filtersPanelOf(el).shadowRoot!.getElementById('count')!.textContent ?? '';
}

function columnsPanelOf(el: HTMLElement): PmReportColumnsPanel {
  return el.shadowRoot!.getElementById('columnsPanel') as unknown as PmReportColumnsPanel;
}

function selectedColumnKeysOf(el: HTMLElement): string[] {
  return [...columnsPanelOf(el).shadowRoot!.querySelectorAll('[data-checked="true"]')].map((row) =>
    (row as HTMLElement).dataset.testid!.replace('column-item-', ''),
  );
}

function saveModalOf(el: HTMLElement): PmSaveReportModal {
  return el.shadowRoot!.getElementById('saveModal') as unknown as PmSaveReportModal;
}

function breadcrumbOf(el: HTMLElement): string {
  return (el.shadowRoot!.querySelector('[data-testid="builder-breadcrumb-name"]') as HTMLElement).textContent ?? '';
}

let originalHash: string;

beforeEach(() => {
  originalHash = window.location.hash;
  vi.mocked(getFields).mockReset().mockResolvedValue(fields);
  vi.mocked(getSavedReport).mockReset().mockResolvedValue(ownedDetail);
  vi.mocked(updateReport).mockReset();
  vi.mocked(saveReport).mockReset();
  vi.mocked(runReport).mockReset();
  clearBuilderState();
});

describe('pm-report-builder-page — edit mode loads the saved report', { tags: ['322UC12'] }, () => {
  let el: HTMLElement;

  afterEach(() => {
    document.body.removeChild(el);
    window.location.hash = originalHash;
  });

  it('holds the saved filters and columns, with the name in the breadcrumb', async () => {
    el = await mountEditing();

    expect(filterCountOf(el)).toBe('1');
    expect(selectedColumnKeysOf(el).sort()).toEqual(['student.class', 'student.name']);
    expect(breadcrumbOf(el)).toBe('Grade 4 Contacts');
  });

  it('returns a non-owned report to the Reports page instead of opening the builder', async () => {
    vi.mocked(getSavedReport).mockResolvedValue({
      identity: { id: 'r1', name: 'Not mine', createdBy: 'other@test.com', isOwner: false },
      definition: { filters: [], columns: ['student.name'] },
    });

    el = await mountEditing();

    expect(window.location.hash).toBe('#/reports');
  });

  it('returns a 404 to the Reports page', async () => {
    vi.mocked(getSavedReport).mockRejectedValue(new ReportsError('The saved report was not found.', 404));

    el = await mountEditing();

    expect(window.location.hash).toBe('#/reports');
  });

  it('prefers a held definition from a matching editing context over the server definition', async () => {
    holdEditingReport({ id: 'r1', name: 'Grade 4 Contacts', createdBy: 'me@test.com', isOwner: true });
    holdDefinition({ filters: [], columns: ['student.name', 'student.class'] });

    el = await mountEditing();

    expect(filterCountOf(el)).toBe('0');
  });
});

describe('pm-report-builder-page — edit mode Save updates the report', { tags: ['322UC13'] }, () => {
  let el: HTMLElement;

  afterEach(() => {
    document.body.removeChild(el);
    window.location.hash = originalHash;
  });

  it('opens the save modal pre-filled with the report name and calls updateReport, never saveReport', async () => {
    vi.mocked(updateReport).mockResolvedValue({
      id: 'r1',
      name: 'Grade 4 Contacts',
      createdBy: 'me@test.com',
      isOwner: true,
    });
    el = await mountEditing();

    (el.shadowRoot!.getElementById('save') as HTMLButtonElement).click();
    const modal = saveModalOf(el);
    const nameInput = modal.shadowRoot!.getElementById('nameInput') as HTMLInputElement;

    expect(modal.hasAttribute('open')).toBe(true);
    expect(nameInput.value).toBe('Grade 4 Contacts');

    (modal.shadowRoot!.getElementById('saveBtn') as HTMLButtonElement).click();
    await flush();

    expect(updateReport).toHaveBeenCalledWith('r1', 'Grade 4 Contacts', ownedDetail.definition);
    expect(saveReport).not.toHaveBeenCalled();
  });
});
