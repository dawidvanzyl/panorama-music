import { registerSessionCache } from '../../../services/session-cache';
import type {
  ReportDefinitionModel,
  ReportField,
  ReportFieldsModel,
  ReportFilterModel,
  ReportResultModel,
} from '../models/report';

const _maxColumns = 10;

/**
 * No filters, columns holding only the locked column(s) the registry
 * declares. Reads the lock from `fields` rather than hardcoding a key, so
 * changing which columns are locked is a registry data change, not a code
 * change here.
 */
export function createDefinition(fields: ReportFieldsModel): ReportDefinitionModel {
  return { filters: [], columns: fields.columns.filter((column) => column.locked).map((column) => column.key) };
}

export function addFilter(definition: ReportDefinitionModel, filter: ReportFilterModel): ReportDefinitionModel {
  return { ...definition, filters: [...definition.filters, filter] };
}

export function removeFilter(definition: ReportDefinitionModel, index: number): ReportDefinitionModel {
  return { ...definition, filters: definition.filters.filter((_, i) => i !== index) };
}

/**
 * The default operator/value(s) for a newly chosen attribute: text -> contains
 * + empty; list and datasource -> equals + the first option; boolean ->
 * equals + Yes, with the builder showing no operator control for it. A
 * Datasource attribute's options arrive live on `field.options`, the same
 * shape a List attribute's fixed options take.
 */
export function chooseAttribute(field: ReportField): ReportFilterModel {
  switch (field.dataType) {
    case 'List':
    case 'Datasource':
      return { field: field.key, operator: 'equals', values: field.options.length > 0 ? [field.options[0].value] : [] };
    case 'Boolean':
      return { field: field.key, operator: 'equals', values: ['Yes'] };
    case 'Text':
    default:
      return { field: field.key, operator: 'contains', values: [''] };
  }
}

export function replaceFilter(
  definition: ReportDefinitionModel,
  index: number,
  filter: ReportFilterModel,
): ReportDefinitionModel {
  return { ...definition, filters: definition.filters.map((existing, i) => (i === index ? filter : existing)) };
}

/**
 * Only `in` ever holds more than one value — switching away from it keeps
 * just the first value. Switching *to* `in` from anything else starts empty:
 * a List or Datasource filter defaults to `equals` and the first option
 * (`chooseAttribute`), and that value was never something the Teacher
 * ticked under "is any of" — carrying it over would pre-select an option
 * they never chose.
 */
export function changeOperator(filter: ReportFilterModel, operator: ReportFilterModel['operator']): ReportFilterModel {
  if (filter.operator === 'in' && operator !== 'in') {
    return { ...filter, operator, values: filter.values.length > 0 ? [filter.values[0]] : [] };
  }
  if (operator === 'in' && filter.operator !== 'in') {
    return { ...filter, operator, values: [] };
  }
  return { ...filter, operator };
}

export function setValues(filter: ReportFilterModel, values: string[]): ReportFilterModel {
  return { ...filter, values };
}

/**
 * The column cascade, applied generically over whatever dependency graph the
 * registry declares: ticking a dependant auto-ticks its anchor (counting
 * toward the cap); unticking an anchor unticks its dependants; the locked
 * column is never removed; a tick that would exceed the ten-column cap is
 * refused outright rather than partially applied.
 */
export function toggleColumn(fields: ReportFieldsModel, selected: string[], key: string): string[] {
  const byKey = new Map(fields.columns.map((column) => [column.key, column]));
  const column = byKey.get(key);
  if (!column) return selected;

  const isSelected = selected.includes(key);

  if (isSelected) {
    if (column.locked) return selected;

    // Unticking an anchor unticks every column (transitively) that depends on it.
    const toRemove = new Set<string>([key]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const candidate of fields.columns) {
        if (toRemove.has(candidate.key)) continue;
        if (candidate.dependsOn && toRemove.has(candidate.dependsOn)) {
          toRemove.add(candidate.key);
          changed = true;
        }
      }
    }
    return selected.filter((existing) => !toRemove.has(existing));
  }

  // Ticking a dependant auto-ticks its whole ancestor chain first.
  const toAdd: string[] = [];
  let cursor: string | null = key;
  const seen = new Set<string>();
  while (cursor && !seen.has(cursor)) {
    seen.add(cursor);
    if (!selected.includes(cursor) && !toAdd.includes(cursor)) toAdd.unshift(cursor);
    cursor = byKey.get(cursor)?.dependsOn ?? null;
  }

  if (selected.length + toAdd.length > _maxColumns) return selected;

  return [...selected, ...toAdd];
}

/**
 * An unselected, unlocked column is disabled when ticking it — which also
 * auto-ticks its own unselected ancestor chain, the same walk `toggleColumn`
 * does — would take the selection past the ten-column cap.
 */
export function columnAvailability(fields: ReportFieldsModel, selected: string[]): { disabled: ReadonlySet<string> } {
  const byKey = new Map(fields.columns.map((column) => [column.key, column]));
  const disabled = new Set<string>();

  for (const column of fields.columns) {
    if (column.locked || selected.includes(column.key)) continue;

    const toAdd: string[] = [];
    let cursor: string | null = column.key;
    const seen = new Set<string>();
    while (cursor && !seen.has(cursor)) {
      seen.add(cursor);
      if (!selected.includes(cursor) && !toAdd.includes(cursor)) toAdd.push(cursor);
      cursor = byKey.get(cursor)?.dependsOn ?? null;
    }

    if (selected.length + toAdd.length > _maxColumns) disabled.add(column.key);
  }

  return { disabled };
}

/**
 * False while any filter has no non-blank (trimmed) value, or an `in` filter
 * has none checked — completing the value or removing the row is what
 * re-enables Run report.
 */
export function canRun(definition: ReportDefinitionModel): boolean {
  return definition.filters.every((filter) => filter.values.some((value) => value.trim().length > 0));
}

/** Back to no filters and Student only. */
export function clear(fields: ReportFieldsModel): ReportDefinitionModel {
  return createDefinition(fields);
}

let _heldDefinition: ReportDefinitionModel | null = null;
let _heldResult: ReportResultModel | null = null;

/** Holds the builder's definition across the Run report -> results -> Edit report round trip. */
export function holdDefinition(definition: ReportDefinitionModel): void {
  _heldDefinition = definition;
}

export function takeHeldDefinition(): ReportDefinitionModel | null {
  return _heldDefinition;
}

export function holdResult(result: ReportResultModel): void {
  _heldResult = result;
}

export function takeHeldResult(): ReportResultModel | null {
  return _heldResult;
}

export function clearBuilderState(): void {
  _heldDefinition = null;
  _heldResult = null;
}

registerSessionCache(clearBuilderState);
