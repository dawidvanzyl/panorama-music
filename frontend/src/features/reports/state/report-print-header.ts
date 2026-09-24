import { collectionPresentation } from './report-collections';
import { formatReportDate } from '../services/report-date-format';
import type { ReportField, ReportFieldsModel, ReportFilterModel, ReportFilterOperator } from '../models/report';

export interface PrintHeaderModel {
  title: string;
  runLine: string;
  filtersLine: string | null;
}

export function buildPrintHeader(input: {
  title: string;
  ranAt: Date;
  studentCount: number;
  creatorEmail: string | null;
  filters: ReportFilterModel[];
  fields: ReportFieldsModel;
}): PrintHeaderModel {
  return {
    title: input.title,
    runLine: buildRunLine(input.ranAt, input.studentCount, input.creatorEmail),
    filtersLine: buildFilterSummary(input.filters, input.fields),
  };
}

export function buildRunLine(ranAt: Date, studentCount: number, creatorEmail: string | null): string {
  const noun = studentCount === 1 ? 'student' : 'students';
  const base = `Run ${formatReportDate(ranAt)} · ${studentCount} ${noun}`;
  return creatorEmail ? `${base} · Created by ${creatorEmail}` : base;
}

export function buildFilterSummary(filters: ReportFilterModel[], fields: ReportFieldsModel): string | null {
  if (filters.length === 0) return null;
  return `Filters: ${filters.map((filter) => formatFilter(filter, fields)).join(' · ')}`;
}

function formatFilter(filter: ReportFilterModel, fields: ReportFieldsModel): string {
  const field = fields.filters.find((candidate) => candidate.key === filter.field);
  if (!field) throw new Error(`Unknown filter field: ${filter.field}`);

  return `${attributeLabel(field, fields)} ${operatorWord(filter.operator)} ${formatValues(filter, field)}`;
}

function operatorWord(operator: ReportFilterOperator): string {
  switch (operator) {
    case 'equals':
      return '=';
    case 'in':
      return 'in';
    case 'contains':
      return 'contains';
  }
}

function attributeLabel(field: ReportField, fields: ReportFieldsModel): string {
  const collectionsSharingLabel = new Set(
    fields.filters.filter((candidate) => candidate.label === field.label).map((candidate) => candidate.collection),
  );
  return collectionsSharingLabel.size > 1
    ? `${collectionPresentation(field.collection).label} · ${field.label}`
    : field.label;
}

function formatValues(filter: ReportFilterModel, field: ReportField): string {
  if (field.dataType === 'Text') return filter.values.join(', ');

  const labelsByValue = new Map(field.options.map((option) => [option.value, option.label]));
  return filter.values
    .map((value) => {
      const label = labelsByValue.get(value);
      if (label === undefined) throw new Error(`Unknown option value for ${field.key}: ${value}`);
      return label;
    })
    .join(', ');
}
