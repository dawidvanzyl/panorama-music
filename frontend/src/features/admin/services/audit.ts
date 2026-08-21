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
  {
    context: 'Students',
    options: [
      { value: 'students.student.created', label: 'Student Created' },
      { value: 'students.student.updated', label: 'Student Updated' },
      { value: 'students.student.deleted', label: 'Student Deleted' },
      { value: 'students.sibling.added', label: 'Sibling Added' },
      { value: 'students.sibling.removed', label: 'Sibling Removed' },
      { value: 'students.guardian.created', label: 'Guardian Created' },
      { value: 'students.guardian.updated', label: 'Guardian Updated' },
      { value: 'students.guardian.deleted', label: 'Guardian Deleted' },
      { value: 'students.guardian.linked', label: 'Guardian Linked' },
      { value: 'students.guardian.unlinked', label: 'Guardian Unlinked' },
      { value: 'students.guardian_relationship.created', label: 'Guardian Relationship Created' },
      { value: 'students.guardian_relationship.renamed', label: 'Guardian Relationship Renamed' },
      { value: 'students.guardian_relationship.deleted', label: 'Guardian Relationship Deleted' },
      { value: 'students.course.created', label: 'Course Created' },
      { value: 'students.course.cost_updated', label: 'Course Cost Updated' },
      { value: 'students.course.deleted', label: 'Course Deleted' },
      { value: 'students.student_course.enrolled', label: 'Student Enrolled' },
      { value: 'students.student_course.updated', label: 'Student Enrollment Updated' },
      { value: 'students.student_course.withdrawn', label: 'Student Withdrawn' },
    ],
  },
  {
    context: 'Teachers',
    options: [
      { value: 'teachers.teacher.created', label: 'Teacher Created' },
      { value: 'teachers.teacher.profile_updated', label: 'Teacher Profile Updated' },
      { value: 'teachers.teacher.classification_changed', label: 'Teacher Classification Changed' },
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
