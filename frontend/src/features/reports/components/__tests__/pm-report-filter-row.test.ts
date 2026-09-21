import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PmReportFilterRow } from '../pm-report-filter-row';
import type { ReportFieldsModel, ReportFilterModel } from '../../models/report';

const fields: ReportFieldsModel = {
  filters: [
    {
      key: 'student.grade',
      collection: 'Student',
      label: 'Grade',
      dataType: 'List',
      operators: ['equals', 'in'],
      options: [
        { value: 'Grade4', label: 'Grade 4' },
        { value: 'Grade5', label: 'Grade 5' },
      ],
    },
  ],
  columns: [],
};

describe('pm-report-filter-row — in checklist survives a re-render', { tags: ['317UC-bug3'] }, () => {
  let el: PmReportFilterRow;

  beforeEach(() => {
    el = new PmReportFilterRow();
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('keeps the same dropdown element (and its open state) across a values-only re-render (R3)', () => {
    el.fields = fields;
    const filter: ReportFilterModel = { field: 'student.grade', operator: 'in', values: [] };
    el.filter = filter;

    const dropdownBefore = el.shadowRoot!.getElementById('valueSlot')!.firstElementChild;
    expect(dropdownBefore?.tagName).toBe('PM-REPORT-CHECKLIST-DROPDOWN');

    // Open it, the way a Teacher's click would (handled inside the dropdown
    // itself — simulated here by toggling its internal panel class directly,
    // since that class is exactly what a re-render must not reset).
    const panel = dropdownBefore!.shadowRoot!.getElementById('panel')!;
    panel.classList.add('checklist__panel--open');

    // The exact sequence a tick produces: pm-report-filters-panel reuses this
    // row and re-assigns `.filter` with the updated values.
    el.filter = { ...filter, values: ['Grade4'] };

    const dropdownAfter = el.shadowRoot!.getElementById('valueSlot')!.firstElementChild;
    expect(dropdownAfter).toBe(dropdownBefore);
    expect(panel.classList.contains('checklist__panel--open')).toBe(true);
  });

  it('still rebuilds the control when the operator changes away from in', () => {
    el.fields = fields;
    el.filter = { field: 'student.grade', operator: 'in', values: [] };
    const dropdown = el.shadowRoot!.getElementById('valueSlot')!.firstElementChild;

    el.filter = { field: 'student.grade', operator: 'equals', values: ['Grade4'] };

    const selectAfter = el.shadowRoot!.getElementById('valueSlot')!.firstElementChild;
    expect(selectAfter?.tagName).toBe('SELECT');
    expect(selectAfter).not.toBe(dropdown);
  });
});
