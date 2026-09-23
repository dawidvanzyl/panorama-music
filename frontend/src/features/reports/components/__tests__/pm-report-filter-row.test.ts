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
    {
      key: 'student.phase',
      collection: 'Student',
      label: 'Phase',
      dataType: 'List',
      operators: ['equals', 'in'],
      options: [
        { value: 'Junior', label: 'Junior' },
        { value: 'Senior', label: 'Senior' },
      ],
    },
    {
      key: 'student.name',
      collection: 'Student',
      label: 'Name',
      dataType: 'Text',
      operators: ['equals', 'contains'],
      options: [],
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

describe('pm-report-filter-row — text input and list select survive a re-render', { tags: ['317UC-bug8'] }, () => {
  let el: PmReportFilterRow;

  beforeEach(() => {
    el = new PmReportFilterRow();
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('keeps the same text input element across a values-only re-render (review-1 Blocker 3)', () => {
    el.fields = fields;
    el.filter = { field: 'student.name', operator: 'contains', values: ['z'] };

    const inputBefore = el.shadowRoot!.getElementById('valueSlot')!.firstElementChild;
    expect(inputBefore?.tagName).toBe('INPUT');

    // The exact sequence a keystroke produces: the builder page re-renders
    // the whole tree and the filters panel reuses this row.
    el.filter = { field: 'student.name', operator: 'contains', values: ['zy'] };

    const inputAfter = el.shadowRoot!.getElementById('valueSlot')!.firstElementChild as HTMLInputElement;
    expect(inputAfter).toBe(inputBefore);
    expect(inputAfter.value).toBe('zy');
  });

  it('keeps the same select element across a values-only re-render for a list equals filter', () => {
    el.fields = fields;
    el.filter = { field: 'student.grade', operator: 'equals', values: ['Grade4'] };

    const selectBefore = el.shadowRoot!.getElementById('valueSlot')!.firstElementChild;
    expect(selectBefore?.tagName).toBe('SELECT');

    el.filter = { field: 'student.grade', operator: 'equals', values: ['Grade5'] };

    const selectAfter = el.shadowRoot!.getElementById('valueSlot')!.firstElementChild as HTMLSelectElement;
    expect(selectAfter).toBe(selectBefore);
    expect(selectAfter.value).toBe('Grade5');
  });

  it('rebuilds the select (with the new field options) when the attribute switches between two List fields', () => {
    el.fields = fields;
    el.filter = { field: 'student.grade', operator: 'equals', values: ['Grade4'] };
    const gradeSelect = el.shadowRoot!.getElementById('valueSlot')!.firstElementChild;

    // The exact shape chooseAttribute() produces for a freshly-chosen List
    // attribute: equals + the new field's first option. Reusing the old
    // <select> here would leave Grade's options mounted under Phase.
    el.filter = { field: 'student.phase', operator: 'equals', values: ['Junior'] };

    const phaseSelect = el.shadowRoot!.getElementById('valueSlot')!.firstElementChild as HTMLSelectElement;
    expect(phaseSelect).not.toBe(gradeSelect);
    expect([...phaseSelect.options].map((o) => o.value)).toEqual(['Junior', 'Senior']);
  });
});
