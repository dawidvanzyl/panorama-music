import { describe, it, expect } from 'vitest';
import { groupFilterAttributes, groupColumns, collectionPresentation, COLLECTIONS } from '../report-collections';
import type { ReportFieldsModel } from '../../models/report';

const fields: ReportFieldsModel = {
  filters: [
    {
      key: 'student.grade',
      collection: 'Student',
      label: 'Grade',
      dataType: 'List',
      operators: ['equals'],
      options: [],
    },
    {
      key: 'course.courseType',
      collection: 'Course',
      label: 'Course Type',
      dataType: 'List',
      operators: ['equals'],
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
      key: 'extraCurricular.phase',
      collection: 'ExtraCurricular',
      label: 'Phase',
      dataType: 'List',
      operators: ['equals'],
      options: [],
    },
  ],
  columns: [
    { key: 'student.name', collection: 'Student', header: 'Student', displayOrder: 1, dependsOn: null, locked: true },
    {
      key: 'course.courseType',
      collection: 'Course',
      header: 'Course Type',
      displayOrder: 1,
      dependsOn: 'student.name',
      locked: false,
    },
    {
      key: 'guardian.cell',
      collection: 'Guardian',
      header: 'Cell',
      displayOrder: 2,
      dependsOn: 'guardian.name',
      locked: false,
    },
    {
      key: 'guardian.name',
      collection: 'Guardian',
      header: 'Guardian',
      displayOrder: 1,
      dependsOn: 'student.name',
      locked: false,
    },
  ],
};

describe('groupFilterAttributes', { tags: ['318UC4'] }, () => {
  it('groups filter attributes Student, Guardian, Course, Extra-Curricular, keeping registry order within each group', () => {
    const groups = groupFilterAttributes(fields);

    expect(groups.map((group) => group.collection.key)).toEqual(['Student', 'Guardian', 'Course', 'ExtraCurricular']);
    expect(groups.map((group) => group.collection.badge)).toEqual(['STU', 'GRD', 'CRS', 'ECA']);
    expect(groups[0].fields.map((field) => field.key)).toEqual(['student.grade']);
  });
});

describe('groupColumns', () => {
  it('groups columns by collection, sorted by display order within each group', () => {
    const groups = groupColumns(fields);

    const guardianGroup = groups.find((group) => group.collection.key === 'Guardian')!;
    expect(guardianGroup.columns.map((column) => column.key)).toEqual(['guardian.name', 'guardian.cell']);
  });
});

describe('collectionPresentation', () => {
  it('returns each collection entry by key', () => {
    expect(collectionPresentation('Guardian').badge).toBe('GRD');
    expect(collectionPresentation('ExtraCurricular').label).toBe('Extra-Curricular');
  });

  it('exposes the four collections in render order', () => {
    expect(COLLECTIONS.map((collection) => collection.key)).toEqual([
      'Student',
      'Guardian',
      'Course',
      'ExtraCurricular',
    ]);
  });
});
