import { describe, it, expect } from 'vitest';
import { buildFilterSummary, buildPrintHeader, buildRunLine } from '../report-print-header';
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
        { value: 'Grade6', label: 'Grade 6' },
      ],
    },
    {
      key: 'student.hasSibling',
      collection: 'Student',
      label: 'Has Sibling',
      dataType: 'Boolean',
      operators: ['equals'],
      options: [
        { value: 'Yes', label: 'Yes' },
        { value: 'No', label: 'No' },
      ],
    },
    {
      key: 'student.name',
      collection: 'Student',
      label: 'Name',
      dataType: 'Text',
      operators: ['contains'],
      options: [],
    },
    {
      key: 'guardian.name',
      collection: 'Guardian',
      label: 'Name',
      dataType: 'Text',
      operators: ['contains'],
      options: [],
    },
    {
      key: 'student.phase',
      collection: 'Student',
      label: 'Phase',
      dataType: 'List',
      operators: ['equals'],
      options: [{ value: 'Junior', label: 'Junior' }],
    },
    {
      key: 'extraCurricular.phase',
      collection: 'ExtraCurricular',
      label: 'Phase',
      dataType: 'List',
      operators: ['equals'],
      options: [{ value: 'Junior', label: 'Junior' }],
    },
    {
      key: 'student.teacher',
      collection: 'Student',
      label: 'Teacher',
      dataType: 'Datasource',
      operators: ['equals'],
      options: [{ value: 't1', label: 'Ms Smith (inactive)' }],
    },
  ],
  columns: [],
};

describe('buildFilterSummary', { tags: ['320UC1'] }, () => {
  it('renders Grade in Grade 4, Grade 5, Grade 6 · Has Sibling = Yes', () => {
    const filters: ReportFilterModel[] = [
      { field: 'student.grade', operator: 'in', values: ['Grade4', 'Grade5', 'Grade6'] },
      { field: 'student.hasSibling', operator: 'equals', values: ['Yes'] },
    ];

    expect(buildFilterSummary(filters, fields)).toBe('Filters: Grade in Grade 4, Grade 5, Grade 6 · Has Sibling = Yes');
  });

  it('renders a Text contains filter with the word and the text as typed', () => {
    const filters: ReportFilterModel[] = [{ field: 'guardian.name', operator: 'contains', values: ['van'] }];

    expect(buildFilterSummary(filters, fields)).toBe('Filters: Guardian · Name contains van');
  });

  it('prefixes a label shared by two collections and leaves an unshared label unprefixed', () => {
    const filters: ReportFilterModel[] = [
      { field: 'student.name', operator: 'contains', values: ['Ava'] },
      { field: 'extraCurricular.phase', operator: 'equals', values: ['Junior'] },
      { field: 'student.hasSibling', operator: 'equals', values: ['Yes'] },
    ];

    const summary = buildFilterSummary(filters, fields);

    expect(summary).toContain('Student · Name contains Ava');
    expect(summary).toContain('Extra-Curricular · Phase = Junior');
    expect(summary).toContain('Has Sibling = Yes');
  });

  it('renders a Datasource value using its option label', () => {
    const filters: ReportFilterModel[] = [{ field: 'student.teacher', operator: 'equals', values: ['t1'] }];

    expect(buildFilterSummary(filters, fields)).toBe('Filters: Teacher = Ms Smith (inactive)');
  });
});

describe('buildPrintHeader', { tags: ['320UC2'] }, () => {
  it('returns a null filters line for a report with no filters', () => {
    const header = buildPrintHeader({
      title: 'New report',
      ranAt: new Date(2026, 0, 1, 9, 30),
      studentCount: 5,
      creatorEmail: null,
      filters: [],
      fields,
    });

    expect(header.filtersLine).toBeNull();
  });
});

describe('buildRunLine', { tags: ['320UC3'] }, () => {
  it("reads 'Run {timestamp} · 3 students' with no Created by segment for an unsaved report", () => {
    const ranAt = new Date(2026, 0, 1, 9, 30);

    const runLine = buildRunLine(ranAt, 3, null);

    expect(runLine).toBe('Run 2026-01-01 09:30 · 3 students');
    expect(runLine).not.toContain('Created by');
  });

  it('uses the singular noun for exactly one student', () => {
    const ranAt = new Date(2026, 0, 1, 9, 30);

    expect(buildRunLine(ranAt, 1, null)).toBe('Run 2026-01-01 09:30 · 1 student');
  });

  it('appends the Created by segment for a saved report', () => {
    const ranAt = new Date(2026, 0, 1, 9, 30);

    expect(buildRunLine(ranAt, 2, 'teacher@example.com')).toBe(
      'Run 2026-01-01 09:30 · 2 students · Created by teacher@example.com',
    );
  });
});
