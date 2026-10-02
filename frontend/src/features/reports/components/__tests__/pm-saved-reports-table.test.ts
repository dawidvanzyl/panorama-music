import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PmSavedReportsTable } from '../pm-saved-reports-table';
import type { SavedReportSummary } from '../../models/report';

describe('pm-saved-reports-table — owner-only Edit and Delete', { tags: ['322UC11'] }, () => {
  let el: PmSavedReportsTable;

  beforeEach(() => {
    el = new PmSavedReportsTable();
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  const reports: SavedReportSummary[] = [
    { id: 'owned-1', name: 'Mine', createdBy: 'me@test.com', isOwner: true, lastRunAt: null },
    { id: 'foreign-1', name: 'Theirs', createdBy: 'them@test.com', isOwner: false, lastRunAt: null },
  ];

  it('offers Run, Edit and Delete in that order on the owned row, and only Run on the foreign row', () => {
    el.reports = reports;

    const rows = [...el.shadowRoot!.querySelectorAll('[data-testid="saved-report-row"]')];
    const ownedRow = rows.find((row) => (row as HTMLElement).dataset.reportId === 'owned-1')!;
    const foreignRow = rows.find((row) => (row as HTMLElement).dataset.reportId === 'foreign-1')!;

    const ownedButtons = [...ownedRow.querySelectorAll('button')].map((button) => button.textContent);
    const foreignButtons = [...foreignRow.querySelectorAll('button')].map((button) => button.textContent);

    expect(ownedButtons).toEqual(['Run', 'Edit', 'Delete']);
    expect(foreignButtons).toEqual(['Run']);
  });

  it('emits saved-report-edit-requested with the row id when Edit is chosen', () => {
    el.reports = reports;
    const handler = vi.fn();
    el.addEventListener('saved-report-edit-requested', handler);

    const ownedRow = el.shadowRoot!.querySelector('[data-report-id="owned-1"]')!;
    const editButton = [...ownedRow.querySelectorAll('button')].find((button) => button.textContent === 'Edit')!;
    editButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ id: 'owned-1' });
  });

  it('emits saved-report-delete-requested with the row id and name when Delete is chosen', () => {
    el.reports = reports;
    const handler = vi.fn();
    el.addEventListener('saved-report-delete-requested', handler);

    const ownedRow = el.shadowRoot!.querySelector('[data-report-id="owned-1"]')!;
    const deleteButton = [...ownedRow.querySelectorAll('button')].find((button) => button.textContent === 'Delete')!;
    deleteButton.dispatchEvent(new MouseEvent('click', { bubbles: true }));

    expect(handler).toHaveBeenCalledTimes(1);
    expect((handler.mock.calls[0][0] as CustomEvent).detail).toEqual({ id: 'owned-1', name: 'Mine' });
  });
});
