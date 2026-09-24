import { describe, it, expect } from 'vitest';
import {
  createDefinition,
  chooseAttribute,
  changeOperator,
  toggleColumn,
  columnAvailability,
  canRun,
  clear,
} from '../report-builder-state';
import type { ReportField, ReportFieldsModel, ReportFilterModel } from '../../models/report';

const textField: ReportField = {
  key: 'student.name',
  collection: 'Student',
  label: 'Name',
  dataType: 'Text',
  operators: ['equals', 'contains'],
  options: [],
};

const listField: ReportField = {
  key: 'student.grade',
  collection: 'Student',
  label: 'Grade',
  dataType: 'List',
  operators: ['equals', 'in'],
  options: [
    { value: 'Grade4', label: 'Grade 4' },
    { value: 'Grade5', label: 'Grade 5' },
  ],
};

const boolField: ReportField = {
  key: 'student.hasSiblings',
  collection: 'Student',
  label: 'Has Sibling',
  dataType: 'Boolean',
  operators: ['equals'],
  options: [
    { value: 'Yes', label: 'Yes' },
    { value: 'No', label: 'No' },
  ],
};

const fields: ReportFieldsModel = {
  filters: [textField, listField, boolField],
  columns: [
    { key: 'student.name', collection: 'Student', header: 'Student', displayOrder: 1, dependsOn: null, locked: true },
    {
      key: 'student.class',
      collection: 'Student',
      header: 'Class',
      displayOrder: 2,
      dependsOn: 'student.name',
      locked: false,
    },
    {
      key: 'student.phase',
      collection: 'Student',
      header: 'Phase',
      displayOrder: 3,
      dependsOn: 'student.name',
      locked: false,
    },
  ],
};

describe('createDefinition', { tags: ['317UC1'] }, () => {
  it('gives a new builder only Student, with a counter of 1', () => {
    const definition = createDefinition(fields);

    expect(definition.columns).toEqual(['student.name']);
    expect(definition.filters).toEqual([]);
  });

  it('leaves Student selected when toggled — it is locked', () => {
    const after = toggleColumn(fields, ['student.name'], 'student.name');

    expect(after).toEqual(['student.name']);
  });
});

describe('toggleColumn — ten-column cap', { tags: ['317UC2'] }, () => {
  it('refuses a tick that would exceed 10, and re-enables once one is deselected', () => {
    const tenSelected = ['student.name', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8', 'c9'];
    const twelveColumnFields: ReportFieldsModel = {
      filters: [],
      columns: [
        {
          key: 'student.name',
          collection: 'Student',
          header: 'Student',
          displayOrder: 1,
          dependsOn: null,
          locked: true,
        },
        ...Array.from({ length: 11 }, (_, i) => ({
          key: `c${i + 1}`,
          collection: 'Student',
          header: `C${i + 1}`,
          displayOrder: i + 2,
          dependsOn: 'student.name',
          locked: false,
        })),
      ],
    };

    expect(columnAvailability(twelveColumnFields, tenSelected).disabled.has('c10')).toBe(true);

    const attemptedEleventh = toggleColumn(twelveColumnFields, tenSelected, 'c10');
    expect(attemptedEleventh).toEqual(tenSelected);

    const afterDeselect = tenSelected.filter((key) => key !== 'c9');
    expect(columnAvailability(twelveColumnFields, afterDeselect).disabled.has('c10')).toBe(false);

    const nowAllowed = toggleColumn(twelveColumnFields, afterDeselect, 'c10');
    expect(nowAllowed).toContain('c10');
  });
});

describe('chooseAttribute', { tags: ['317UC3'] }, () => {
  it('resets a text attribute to contains + empty', () => {
    expect(chooseAttribute(textField)).toEqual({ field: 'student.name', operator: 'contains', values: [''] });
  });

  it('resets a list attribute to equals + the first option', () => {
    expect(chooseAttribute(listField)).toEqual({ field: 'student.grade', operator: 'equals', values: ['Grade4'] });
  });

  it('resets a boolean attribute to equals + Yes', () => {
    expect(chooseAttribute(boolField)).toEqual({ field: 'student.hasSiblings', operator: 'equals', values: ['Yes'] });
  });
});

describe('changeOperator', { tags: ['317UC4'] }, () => {
  it('keeps only the first value when in switches to equals', () => {
    const filter: ReportFilterModel = {
      field: 'student.grade',
      operator: 'in',
      values: ['Grade4', 'Grade5', 'Grade6'],
    };

    const after = changeOperator(filter, 'equals');

    expect(after.values).toEqual(['Grade4']);
  });
});

describe('changeOperator — switching to in starts empty', { tags: ['317UC17'] }, () => {
  it('clears the carried-over equals value when switching to in (#325)', () => {
    // The exact shape chooseAttribute() produces for a freshly-chosen List
    // attribute: equals + the registry's first option.
    const filter: ReportFilterModel = { field: 'student.grade', operator: 'equals', values: ['Grade1'] };

    const after = changeOperator(filter, 'in');

    expect(after.values).toEqual([]);
  });

  it('clears values switching from contains to in too', () => {
    const filter: ReportFilterModel = { field: 'student.name', operator: 'contains', values: ['zyl'] };

    const after = changeOperator(filter, 'in');

    expect(after.values).toEqual([]);
  });
});

describe('canRun', { tags: ['317UC5'] }, () => {
  it('is false with an empty text value', () => {
    const definition = {
      filters: [{ field: 'student.name', operator: 'contains', values: [''] } as ReportFilterModel],
      columns: ['student.name'],
    };
    expect(canRun(definition)).toBe(false);
  });

  it('is false with a whitespace-only value', () => {
    const definition = {
      filters: [{ field: 'student.name', operator: 'contains', values: ['   '] } as ReportFilterModel],
      columns: ['student.name'],
    };
    expect(canRun(definition)).toBe(false);
  });

  it('is false with an in filter with nothing checked', () => {
    const definition = {
      filters: [{ field: 'student.grade', operator: 'in', values: [] } as ReportFilterModel],
      columns: ['student.name'],
    };
    expect(canRun(definition)).toBe(false);
  });

  it('is true once the value is completed', () => {
    const definition = {
      filters: [{ field: 'student.name', operator: 'contains', values: ['zyl'] } as ReportFilterModel],
      columns: ['student.name'],
    };
    expect(canRun(definition)).toBe(true);
  });

  it('is true once the incomplete filter is removed', () => {
    const definition = { filters: [], columns: ['student.name'] };
    expect(canRun(definition)).toBe(true);
  });
});

describe('clear', { tags: ['317UC6'] }, () => {
  it('returns the builder to no filters and Student only', () => {
    const cleared = clear(fields);

    expect(cleared).toEqual({ filters: [], columns: ['student.name'] });
  });
});

describe('toggleColumn — P4 cascade', () => {
  it('ticking a dependant auto-ticks its anchor', () => {
    const after = toggleColumn(fields, ['student.name'], 'student.class');

    expect(after).toEqual(['student.name', 'student.class']);
  });

  it('unticking the anchor unticks its dependants', () => {
    // Student is locked and can never itself be unticked in #317, so this
    // exercises the generic cascade against a synthetic unlocked anchor.
    const chainFields: ReportFieldsModel = {
      filters: [],
      columns: [
        {
          key: 'student.name',
          collection: 'Student',
          header: 'Student',
          displayOrder: 1,
          dependsOn: null,
          locked: true,
        },
        {
          key: 'anchor',
          collection: 'Student',
          header: 'Anchor',
          displayOrder: 2,
          dependsOn: 'student.name',
          locked: false,
        },
        {
          key: 'dependant',
          collection: 'Student',
          header: 'Dependant',
          displayOrder: 3,
          dependsOn: 'anchor',
          locked: false,
        },
      ],
    };

    const after = toggleColumn(chainFields, ['student.name', 'anchor', 'dependant'], 'anchor');

    expect(after).toEqual(['student.name']);
  });
});

const guardianColumns: ReportFieldsModel['columns'] = [
  { key: 'student.name', collection: 'Student', header: 'Student', displayOrder: 1, dependsOn: null, locked: true },
  {
    key: 'guardian.name',
    collection: 'Guardian',
    header: 'Guardian',
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
    key: 'guardian.email',
    collection: 'Guardian',
    header: 'Email',
    displayOrder: 3,
    dependsOn: 'guardian.name',
    locked: false,
  },
];

describe('toggleColumn — Guardian anchor cascade', { tags: ['318UC1', '318UC2'] }, () => {
  it('ticking Cell with Guardian unticked also ticks Guardian, raising the count by two', () => {
    const guardianFields: ReportFieldsModel = { filters: [], columns: guardianColumns };

    const after = toggleColumn(guardianFields, ['student.name'], 'guardian.cell');

    expect(after).toEqual(['student.name', 'guardian.name', 'guardian.cell']);
  });

  it('unticking Guardian with Cell and Email ticked unticks them with it', () => {
    const guardianFields: ReportFieldsModel = { filters: [], columns: guardianColumns };

    const after = toggleColumn(
      guardianFields,
      ['student.name', 'guardian.name', 'guardian.cell', 'guardian.email'],
      'guardian.name',
    );

    expect(after).toEqual(['student.name']);
  });
});

describe('columnAvailability — Guardian dependant needs two slots', { tags: ['318UC3'] }, () => {
  it('disables Cell and the other Guardian dependants when only one slot remains', () => {
    const guardianFields: ReportFieldsModel = { filters: [], columns: guardianColumns };
    const nineSelected = ['student.name', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'];
    const withGuardianDependants: ReportFieldsModel = {
      filters: [],
      columns: [
        ...nineSelected
          .filter((key) => key !== 'student.name')
          .map((key, index) => ({
            key,
            collection: 'Student',
            header: key,
            displayOrder: index + 2,
            dependsOn: 'student.name',
            locked: false,
          })),
        ...guardianFields.columns,
      ],
    };

    const availability = columnAvailability(withGuardianDependants, nineSelected);

    expect(availability.disabled.has('guardian.cell')).toBe(true);
    expect(availability.disabled.has('guardian.email')).toBe(true);
    expect(availability.disabled.has('guardian.name')).toBe(false);
  });
});
