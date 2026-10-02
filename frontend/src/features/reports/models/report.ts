/** A filter or column attribute's data type, as the builder needs to branch on it. */
export type ReportFieldDataType = 'Text' | 'List' | 'Boolean' | 'Datasource';

export type ReportFilterOperator = 'equals' | 'contains' | 'in';

export interface ReportFieldOption {
  value: string;
  label: string;
}

/** A registry filter attribute, mapped from the API contract into the feature's own shape. */
export interface ReportField {
  key: string;
  collection: string;
  label: string;
  dataType: ReportFieldDataType;
  operators: ReportFilterOperator[];
  options: ReportFieldOption[];
}

/** A registry column attribute. */
export interface ReportColumn {
  key: string;
  collection: string;
  header: string;
  displayOrder: number;
  dependsOn: string | null;
  locked: boolean;
}

/** The full Student registry as the builder needs it. */
export interface ReportFieldsModel {
  filters: ReportField[];
  columns: ReportColumn[];
}

/**
 * A filter row in the builder. The yes/no attributes are sent with no
 * operator shown, but a `ReportFilterModel` always carries `equals` for them
 * (P4/UC3) so the state functions never special-case a missing operator.
 */
export interface ReportFilterModel {
  field: string;
  operator: ReportFilterOperator;
  values: string[];
}

/** The report a Teacher is building: an ordered filter list and a column key set. */
export interface ReportDefinitionModel {
  filters: ReportFilterModel[];
  columns: string[];
}

export interface ReportResultColumn {
  key: string;
  header: string;
}

export interface ReportResultSection {
  studentId: string;
  rows: string[][];
  siblingBadge: string | null;
}

/** A completed run, mapped from the API contract into the feature's own shape. */
export interface ReportResultModel {
  ranAt: Date;
  studentCount: number;
  columns: ReportResultColumn[];
  sections: ReportResultSection[];
  savedReport: SavedReportIdentity | null;
}

/** A saved report's identity, as every screen that names it needs. */
export interface SavedReportIdentity {
  id: string;
  name: string;
  createdBy: string;
  isOwner: boolean;
}

/** A row on the Reports page's saved-reports list. */
export interface SavedReportSummary extends SavedReportIdentity {
  lastRunAt: Date | null;
}

export interface SavedReportDetail {
  identity: SavedReportIdentity;
  definition: ReportDefinitionModel;
}
