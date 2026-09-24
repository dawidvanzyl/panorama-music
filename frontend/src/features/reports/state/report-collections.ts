import type { ReportColumn, ReportField, ReportFieldsModel } from '../models/report';

export interface CollectionPresentation {
  key: string;
  label: string;
  heading: string;
  badge: string;
  colour: string;
}

/** The four collections a report can filter or project over, in the order they render. */
export const COLLECTIONS: readonly CollectionPresentation[] = [
  { key: 'Student', label: 'Student', heading: 'STUDENT', badge: 'STU', colour: '#4f7cff' },
  { key: 'Guardian', label: 'Guardian', heading: 'GUARDIAN', badge: 'GRD', colour: '#8fd44e' },
  { key: 'Course', label: 'Course', heading: 'COURSE', badge: 'CRS', colour: '#f0a040' },
  {
    key: 'ExtraCurricular',
    label: 'Extra-Curricular',
    heading: 'EXTRA-CURRICULAR',
    badge: 'ECA',
    colour: '#c084fc',
  },
];

const _byKey = new Map(COLLECTIONS.map((collection) => [collection.key, collection]));

/** The collection's presentation entry; falls back to Student's if the key is somehow unknown. */
export function collectionPresentation(collection: string): CollectionPresentation {
  return _byKey.get(collection) ?? COLLECTIONS[0];
}

export interface FilterAttributeGroup {
  collection: CollectionPresentation;
  fields: ReportField[];
}

export interface ColumnGroup {
  collection: CollectionPresentation;
  columns: ReportColumn[];
}

/** Groups the filter attributes by collection, in collection order, keeping registry order within each group. */
export function groupFilterAttributes(fields: ReportFieldsModel): FilterAttributeGroup[] {
  return COLLECTIONS.map((collection) => ({
    collection,
    fields: fields.filters.filter((field) => field.collection === collection.key),
  })).filter((group) => group.fields.length > 0);
}

/** Groups the columns by collection, in collection order, sorted by display order within each group. */
export function groupColumns(fields: ReportFieldsModel): ColumnGroup[] {
  return COLLECTIONS.map((collection) => ({
    collection,
    columns: fields.columns
      .filter((column) => column.collection === collection.key)
      .sort((a, b) => a.displayOrder - b.displayOrder),
  })).filter((group) => group.columns.length > 0);
}
