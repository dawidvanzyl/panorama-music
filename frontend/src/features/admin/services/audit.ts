import { getAccessToken } from '../../../services/token-storage';
import { handleUnauthorized } from '../../../services/auth';

const API_BASE = '/api/audit';

export interface AuditEventSummary {
  occurredAt: string;
  eventType: string;
  actorEmail: string | null;
  targetDisplay: string | null;
  outcome: 'success' | 'failure';
  reason: string | null;
  sourceIp: string;
}

export interface AuditEventPage {
  items: AuditEventSummary[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface AuditEventFilters {
  actor?: string;
  eventType?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
}

// Grouped by context prefix so a future context (e.g. students.*) can be
// added as its own group without restructuring the dropdown.
export const AUDIT_EVENT_TYPE_GROUPS: { context: string; options: { value: string; label: string }[] }[] = [
  {
    context: 'Identity',
    options: [
      { value: 'identity.user.login_succeeded', label: 'Login Succeeded' },
      { value: 'identity.user.login_failed', label: 'Login Failed' },
      { value: 'identity.user.logged_out', label: 'Logged Out' },
      // identity.refresh_token.refreshed deliberately excluded — it fires on
      // every token refresh (roughly every 15 min per active session) and
      // would flood this list with low-signal noise.
      { value: 'identity.refresh_token.revoked', label: 'Token Revoked' },
      { value: 'identity.refresh_token.reuse_detected', label: 'Token Reuse Detected' },
      { value: 'identity.user.registration_completed', label: 'Registration Completed' },
      { value: 'identity.password_reset.requested', label: 'Password Reset Requested' },
      { value: 'identity.password_reset.completed', label: 'Password Reset Completed' },
      { value: 'identity.user.created', label: 'User Created' },
      { value: 'identity.invite_token.generated', label: 'Invite Generated' },
      { value: 'identity.invite_token.regenerated', label: 'Invite Regenerated' },
      { value: 'identity.invite_token.revoked', label: 'Invite Revoked' },
      { value: 'identity.user.roles_changed', label: 'Roles Changed' },
      { value: 'identity.user.activated', label: 'User Activated' },
      { value: 'identity.user.deactivated', label: 'User Deactivated' },
      { value: 'identity.user.deleted', label: 'User Deleted' },
      { value: 'identity.authorization.denied', label: 'Authorization Denied' },
    ],
  },
];

export class AuditError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'AuditError';
  }
}

function authHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (response.status === 401) {
    handleUnauthorized();
  }
  if (!response.ok) {
    const body = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new AuditError(body.error ?? `HTTP ${response.status}`, response.status);
  }
  return response.json() as Promise<T>;
}

export async function getAuditEvents(filters: AuditEventFilters = {}): Promise<AuditEventPage> {
  const params = new URLSearchParams();
  if (filters.actor) params.set('actor', filters.actor);
  if (filters.eventType) params.set('eventType', filters.eventType);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  params.set('page', String(filters.page ?? 1));
  params.set('pageSize', String(filters.pageSize ?? 25));

  const response = await fetch(`${API_BASE}?${params.toString()}`, {
    headers: authHeaders(),
  });
  return handleResponse<AuditEventPage>(response);
}
