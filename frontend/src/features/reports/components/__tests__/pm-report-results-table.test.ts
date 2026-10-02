import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PmReportResultsTable } from '../pm-report-results-table';
import type { ReportResultColumn, ReportResultSection } from '../../models/report';

describe('pm-report-results-table — sibling badge', { tags: ['319UC6'] }, () => {
  let el: PmReportResultsTable;

  beforeEach(() => {
    el = new PmReportResultsTable();
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('shows the badge beside the name on the first row only and adds no column', () => {
    const columns: ReportResultColumn[] = [
      { key: 'student.name', header: 'Student' },
      { key: 'course.courseType', header: 'Course Type' },
    ];
    const sections: ReportResultSection[] = [
      {
        studentId: 's1',
        siblingBadge: '1.2',
        rows: [
          ['Cal van Zyl', 'Instrument'],
          ['', 'Theory'],
          ['', 'Choir'],
        ],
      },
    ];

    el.columns = columns;
    el.sections = sections;

    const table = el.shadowRoot!.getElementById('table') as HTMLTableElement;
    const headerCells = [...table.querySelectorAll('#headerRow th')].map((th) => th.textContent);
    const rows = [...table.querySelectorAll('tbody tr')];
    const firstRowCells = [...rows[0].querySelectorAll('td')];
    const badge = firstRowCells[0].querySelector('[data-testid="sibling-badge"]');

    expect(headerCells).toEqual(['Student', 'Course Type']);
    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.querySelectorAll('td').length === 2)).toBe(true);
    expect(badge?.textContent).toBe('1.2');
    expect(firstRowCells[0].textContent).toBe('Cal van Zyl1.2');
    expect([...rows[1].querySelectorAll('td')][0].querySelector('[data-testid="sibling-badge"]')).toBeNull();
    expect([...rows[2].querySelectorAll('td')][0].querySelector('[data-testid="sibling-badge"]')).toBeNull();
  });

  it('renders no badge for an unmarked section', () => {
    const columns: ReportResultColumn[] = [{ key: 'student.name', header: 'Student' }];
    const sections: ReportResultSection[] = [{ studentId: 's1', siblingBadge: null, rows: [['Dee Naidoo']] }];

    el.columns = columns;
    el.sections = sections;

    const table = el.shadowRoot!.getElementById('table') as HTMLTableElement;
    const firstCell = table.querySelector('tbody tr td') as HTMLElement;

    expect(firstCell.querySelector('[data-testid="sibling-badge"]')).toBeNull();
    expect(firstCell.textContent).toBe('Dee Naidoo');
  });
});
