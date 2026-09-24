import { getAccessToken } from '../../../services/token-storage';
import { handleUnauthorized } from '../../../services/auth';
import type { ReportDefinitionModel, ReportFieldsModel, ReportResultModel } from '../models/report';

const API_BASE = '/api/reports';

// --- API contracts (private — never exposed to components) ---

interface ApiFieldOption {
  value: string;
  label: string;
}

interface ApiFilterField {
  key: string;
  collection: string;
  label: string;
  dataType: string;
  operators: string[];
  options: ApiFieldOption[];
}

interface ApiColumnField {
  key: string;
  collection: string;
  header: string;
  displayOrder: number;
  dependsOn: string | null;
  locked: boolean;
}

interface ApiReportFields {
  filters: ApiFilterField[];
  columns: ApiColumnField[];
}

interface ApiReportRunColumn {
  key: string;
  header: string;
}

interface ApiReportRunSection {
  studentId: string;
  rows: string[][];
}

interface ApiReportRunResult {
  ranAt: string;
  studentCount: number;
  columns: ApiReportRunColumn[];
  sections: ApiReportRunSection[];
}

export class ReportsError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ReportsError';
  }
}

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function assertOk(response: Response): Promise<void> {
  if (response.status === 401) {
    handleUnauthorized();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new ReportsError(body.error ?? `HTTP ${response.status}`, response.status);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  await assertOk(response);
  return response.json() as Promise<T>;
}

/**
 * Wraps a network failure (fetch rejecting outright — offline, DNS, CORS) in
 * the same `ReportsError` a non-2xx response produces, so callers never need
 * to distinguish "the request failed" from "the request never landed".
 */
async function guardNetworkFailure<T>(work: () => Promise<T>): Promise<T> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ReportsError) throw error;
    throw new ReportsError('Could not reach the server.', 0);
  }
}

function mapFields(api: ApiReportFields): ReportFieldsModel {
  return {
    filters: api.filters.map((filter) => ({
      key: filter.key,
      collection: filter.collection,
      label: filter.label,
      dataType: filter.dataType as ReportFieldsModel['filters'][number]['dataType'],
      operators: filter.operators as ReportFieldsModel['filters'][number]['operators'],
      options: filter.options,
    })),
    columns: api.columns.map((column) => ({
      key: column.key,
      collection: column.collection,
      header: column.header,
      displayOrder: column.displayOrder,
      dependsOn: column.dependsOn,
      locked: column.locked,
    })),
  };
}

function mapRunResult(api: ApiReportRunResult): ReportResultModel {
  return {
    ranAt: new Date(api.ranAt),
    studentCount: api.studentCount,
    columns: api.columns,
    sections: api.sections,
  };
}

/**
 * The Student registry. Never cached: the Guardian, Course and
 * Extra-Curricular filters carry live datasource options (teacher names,
 * relationships, activities), so a stale copy would show the builder options
 * that no longer exist or hide ones just added.
 */
export async function getFields(): Promise<ReportFieldsModel> {
  return guardNetworkFailure(async () => {
    const response = await fetch(`${API_BASE}/fields`, { headers: authHeaders() });
    return mapFields(await handleResponse<ApiReportFields>(response));
  });
}

/** Runs a report definition against live data. Never cached — every call is a fresh run. */
export async function runReport(definition: ReportDefinitionModel): Promise<ReportResultModel> {
  return guardNetworkFailure(async () => {
    const response = await fetch(`${API_BASE}/run`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(definition),
    });
    return mapRunResult(await handleResponse<ApiReportRunResult>(response));
  });
}
