import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

const mockIsAuthenticated = vi.fn();
vi.mock('../../services/auth', () => ({
  isAuthenticated: () => mockIsAuthenticated(),
}));

// Both stubs receive the roles they were asked about, so a test can grant a
// specific role set (e.g. Coordinator but not Teacher) rather than a single
// blanket boolean.
const mockHasRole = vi.fn();
const mockHasAnyRole = vi.fn();
vi.mock('../../services/token-storage', () => ({
  hasRole: (role: string) => mockHasRole(role),
  hasAnyRole: (roles: string[]) => mockHasAnyRole(roles),
}));

/** Grants exactly the given roles to both role checks. */
function grantRoles(...roles: string[]): void {
  mockHasRole.mockImplementation((role: string) => roles.includes(role));
  mockHasAnyRole.mockImplementation((asked: string[]) => asked.some((role) => roles.includes(role)));
}

import '../pm-sidebar';

const ALL_LINK_IDS = [
  'userManagementLink',
  'adminSessionsLink',
  'activityLogLink',
  'studentManagementLink',
  'teachersLink',
  'courseManagementLink',
  'extraCurricularsLink',
  'guardianRelationshipsLink',
];

/**
 * Everything an Admin is offered — which is no longer everything there is.
 * Extra-Curriculars is the one entry the Admin role does not reach.
 */
const ADMIN_LINK_IDS = ALL_LINK_IDS.filter((id) => id !== 'extraCurricularsLink');

/** The ids of the entries currently offered, in markup order. */
function visibleLinkIds(el: HTMLElement): string[] {
  return ALL_LINK_IDS.filter((id) => !(el.shadowRoot!.getElementById(id) as HTMLAnchorElement).hidden);
}

function renderOn(hash: string): void {
  window.location.hash = hash;
  window.dispatchEvent(new Event('hashchange'));
}

describe('pm-sidebar — entries gated by role alone', { tags: ['239UC1'] }, () => {
  let el: HTMLElement;

  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
    el = document.createElement('pm-sidebar');
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it.each([
    {
      roles: ['Admin'],
      expected: [
        'userManagementLink',
        'adminSessionsLink',
        'activityLogLink',
        'studentManagementLink',
        'teachersLink',
        'courseManagementLink',
        'guardianRelationshipsLink',
      ],
    },
    { roles: ['Teacher'], expected: ['studentManagementLink', 'courseManagementLink', 'extraCurricularsLink'] },
    {
      roles: ['Coordinator'],
      expected: ['teachersLink', 'courseManagementLink', 'extraCurricularsLink', 'guardianRelationshipsLink'],
    },
    {
      roles: ['Teacher', 'Coordinator'],
      expected: [
        'studentManagementLink',
        'teachersLink',
        'courseManagementLink',
        'extraCurricularsLink',
        'guardianRelationshipsLink',
      ],
    },
  ])('offers exactly the entries $roles permits', ({ roles, expected }) => {
    grantRoles(...roles);
    document.body.appendChild(el);

    renderOn('#/students');

    expect(visibleLinkIds(el)).toEqual(expected);
  });

  it('offers nothing at all to a user who is not signed in', () => {
    mockIsAuthenticated.mockReturnValue(false);
    grantRoles('Admin');
    document.body.appendChild(el);

    renderOn('#/students');

    expect(visibleLinkIds(el)).toEqual([]);
  });
});

describe('pm-sidebar — the visible set does not depend on the route', { tags: ['239UC2'] }, () => {
  let el: HTMLElement;

  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
    el = document.createElement('pm-sidebar');
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  // An unrelated area, a nested route, an unrecognised path and the bare root
  // all have to agree: the old model hid entries outside their section and
  // left a stale section active for a path it did not recognise.
  it.each(['#/students', '#/teachers', '#/teachers/abc', '#/admin/users', '#/nowhere-at-all', '#/'])(
    'offers an Admin the same entries on %s as everywhere else',
    (hash) => {
      grantRoles('Admin');

      renderOn(hash);

      expect(visibleLinkIds(el)).toEqual(ADMIN_LINK_IDS);
    },
  );

  it('offers a Coordinator the same entries on an admin route as on their own', () => {
    grantRoles('Coordinator');

    renderOn('#/students/guardian-relationships');
    const onOwnRoute = visibleLinkIds(el);

    renderOn('#/admin/users');

    expect(visibleLinkIds(el)).toEqual(onOwnRoute);
  });

  it('offers the same entries when a route is reached by direct URL entry rather than navigation', () => {
    grantRoles('Admin');
    // A fresh element connecting on an already-set hash is what a direct URL
    // entry looks like — no hashchange ever fires.
    window.location.hash = '#/admin/activity-log';
    const direct = document.createElement('pm-sidebar');
    document.body.appendChild(direct);

    expect(visibleLinkIds(direct)).toEqual(ADMIN_LINK_IDS);

    document.body.removeChild(direct);
  });
});

describe('pm-sidebar — active entry marking', { tags: ['239UC4'] }, () => {
  let el: HTMLElement;

  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
    grantRoles('Admin');
    el = document.createElement('pm-sidebar');
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  function activeLinkIds(): string[] {
    return ALL_LINK_IDS.filter((id) =>
      (el.shadowRoot!.getElementById(id) as HTMLAnchorElement).classList.contains('sidebar__link--active'),
    );
  }

  it.each([
    { hash: '#/students', active: 'studentManagementLink' },
    { hash: '#/students/guardian-relationships', active: 'guardianRelationshipsLink' },
    { hash: '#/teachers', active: 'teachersLink' },
    { hash: '#/admin/users', active: 'userManagementLink' },
    { hash: '#/admin/sessions', active: 'adminSessionsLink' },
    { hash: '#/admin/activity-log', active: 'activityLogLink' },
  ])('marks only $active on $hash', ({ hash, active }) => {
    renderOn(hash);

    expect(activeLinkIds()).toEqual([active]);
  });

  it('keeps the owning entry active on a route nested beneath it', () => {
    renderOn('#/teachers/some-teacher-id');

    expect(activeLinkIds()).toEqual(['teachersLink']);
  });
});

describe('pm-sidebar — the admin group is separated from the rest', () => {
  let el: HTMLElement;

  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
    el = document.createElement('pm-sidebar');
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  function divider(): HTMLElement {
    return el.shadowRoot!.getElementById('studentManagementLinkDivider') as HTMLElement;
  }

  it('draws the rule between the admin entries and the rest for an Admin', () => {
    grantRoles('Admin');

    renderOn('#/admin/users');

    expect(divider().hidden).toBe(false);
    // The rule sits directly above the first entry of the second group.
    expect(divider().nextElementSibling!.id).toBe('studentManagementLink');
  });

  it.each([['Teacher'], ['Coordinator']])('draws no rule for a %s, who sees only one group', (role) => {
    grantRoles(role);

    renderOn('#/students');

    expect(divider().hidden).toBe(true);
  });
});

describe('pm-sidebar — Teacher Management is offered to Admins and Coordinators only', { tags: ['239UC5'] }, () => {
  let el: HTMLElement;

  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
    el = document.createElement('pm-sidebar');
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it.each(['#/students', '#/teachers', '#/admin/users', '#/'])(
    'offers no Teacher Management entry to a plain Teacher on %s',
    (hash) => {
      grantRoles('Teacher');

      renderOn(hash);

      expect((el.shadowRoot!.getElementById('teachersLink') as HTMLAnchorElement).hidden).toBe(true);
    },
  );

  it.each([['Coordinator'], ['Admin']])('offers the Teacher Management entry to a %s', (role) => {
    grantRoles(role);

    renderOn('#/');

    expect((el.shadowRoot!.getElementById('teachersLink') as HTMLAnchorElement).hidden).toBe(false);
  });
});

describe('pm-sidebar — account actions are not the sidebar’s to offer', { tags: ['247UC3'] }, () => {
  let el: HTMLElement;

  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
    grantRoles('Teacher', 'Coordinator', 'Admin');
    el = document.createElement('pm-sidebar');
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it.each(['#/', '#/students', '#/admin/users'])(
    'offers neither Active Sessions nor Logout on %s, for a user holding every role',
    (hash) => {
      window.location.hash = hash;
      window.dispatchEvent(new Event('hashchange'));

      expect(el.shadowRoot!.getElementById('sessionsLink')).toBeNull();
      expect(el.shadowRoot!.getElementById('logoutBtn')).toBeNull();
      expect(el.shadowRoot!.textContent).not.toContain('Logout');
      expect(el.shadowRoot!.textContent).not.toContain('Active Sessions');
    },
  );

  it('keeps no account group in its markup', () => {
    expect(el.shadowRoot!.querySelector('.sidebar__bottom')).toBeNull();
  });

  it('links nowhere near the removed /sessions route', () => {
    const hrefs = Array.from(el.shadowRoot!.querySelectorAll('a')).map((a) => a.getAttribute('href'));

    expect(hrefs).not.toContain('#/sessions');
  });
});

describe('pm-sidebar — Course Management is offered only to roles permitted to open it', { tags: ['257UC19'] }, () => {
  let el: HTMLElement;

  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
    el = document.createElement('pm-sidebar');
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  function courseLink(): HTMLAnchorElement {
    return el.shadowRoot!.getElementById('courseManagementLink') as HTMLAnchorElement;
  }

  it.each([['Teacher'], ['Coordinator'], ['Admin']])('offers the entry to a %s', (role) => {
    grantRoles(role);

    renderOn('#/');

    expect(courseLink().hidden).toBe(false);
  });

  it('offers no entry to a signed-in user holding none of the permitted roles', () => {
    grantRoles();

    renderOn('#/');

    expect(courseLink().hidden).toBe(true);
  });

  it('offers no entry to a user who is not signed in', () => {
    mockIsAuthenticated.mockReturnValue(false);
    grantRoles('Admin');

    renderOn('#/');

    expect(courseLink().hidden).toBe(true);
  });
});

describe('pm-sidebar — Course Management sits directly after Teacher Management', { tags: ['257UC20'] }, () => {
  let el: HTMLElement;

  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
    grantRoles('Admin');
    el = document.createElement('pm-sidebar');
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('renders the entry directly after Teacher Management and still above Guardian Relationships', () => {
    renderOn('#/');

    const link = el.shadowRoot!.getElementById('courseManagementLink') as HTMLAnchorElement;
    expect(link.previousElementSibling!.id).toBe('teachersLink');
    // Extra-Curriculars (#275) was inserted between this entry and Guardian
    // Relationships, so the two are no longer adjacent — the ordering this
    // criterion is about is that Course Management stays between them.
    expect(link.nextElementSibling!.id).toBe('extraCurricularsLink');
    expect(visibleLinkIds(el).indexOf('courseManagementLink')).toBe(visibleLinkIds(el).indexOf('teachersLink') + 1);
    expect(visibleLinkIds(el).indexOf('courseManagementLink')).toBeLessThan(
      visibleLinkIds(el).indexOf('guardianRelationshipsLink'),
    );
  });
});

describe(
  'pm-sidebar — Extra-Curriculars is offered to Teachers and Coordinators, in its stated position',
  { tags: ['275UC22'] },
  () => {
    let el: HTMLElement;

    beforeEach(() => {
      mockIsAuthenticated.mockReturnValue(true);
      el = document.createElement('pm-sidebar');
      document.body.appendChild(el);
    });

    afterEach(() => {
      document.body.removeChild(el);
    });

    function extraCurricularsLink(): HTMLAnchorElement {
      return el.shadowRoot!.getElementById('extraCurricularsLink') as HTMLAnchorElement;
    }

    it.each([['Teacher'], ['Coordinator']])('offers the entry to a %s', (role) => {
      grantRoles(role);

      renderOn('#/');

      expect(extraCurricularsLink().hidden).toBe(false);
    });

    it('renders the entry directly after Course Management and directly before Guardian Relationships', () => {
      grantRoles('Teacher', 'Coordinator');

      renderOn('#/');

      const link = extraCurricularsLink();
      expect(link.previousElementSibling!.id).toBe('courseManagementLink');
      expect(link.nextElementSibling!.id).toBe('guardianRelationshipsLink');
      const visible = visibleLinkIds(el);
      expect(visible.indexOf('extraCurricularsLink')).toBe(visible.indexOf('courseManagementLink') + 1);
      expect(visible.indexOf('extraCurricularsLink')).toBe(visible.indexOf('guardianRelationshipsLink') - 1);
    });

    it('offers no entry to a user who is not signed in', () => {
      mockIsAuthenticated.mockReturnValue(false);
      grantRoles('Teacher');

      renderOn('#/');

      expect(extraCurricularsLink().hidden).toBe(true);
    });
  },
);

describe('pm-sidebar — Extra-Curriculars is not offered to an Admin', { tags: ['275UC23'] }, () => {
  let el: HTMLElement;

  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
    el = document.createElement('pm-sidebar');
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  // The one entry the Admin role does not reach, on any route — every other
  // entry in the sidebar is offered to it.
  it.each(['#/', '#/admin/users', '#/students', '#/courses'])('offers no entry on %s', (hash) => {
    grantRoles('Admin');

    renderOn(hash);

    expect((el.shadowRoot!.getElementById('extraCurricularsLink') as HTMLAnchorElement).hidden).toBe(true);
  });

  it('still offers an Admin every other entry, so nothing else was narrowed by mistake', () => {
    grantRoles('Admin');

    renderOn('#/');

    expect(visibleLinkIds(el)).toEqual(ADMIN_LINK_IDS);
  });
});

describe('pm-sidebar — Guardian Relationships link gated by role', { tags: ['239UC1', '239UC2'] }, () => {
  let el: HTMLElement;

  beforeEach(() => {
    mockIsAuthenticated.mockReturnValue(true);
    el = document.createElement('pm-sidebar');
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  function relationshipsLinkOn(hash: string): HTMLAnchorElement {
    document.body.appendChild(el);
    window.location.hash = hash;
    window.dispatchEvent(new Event('hashchange'));
    return el.shadowRoot!.getElementById('guardianRelationshipsLink') as HTMLAnchorElement;
  }

  it('shows the link to a Coordinator who is not a Teacher', () => {
    grantRoles('Coordinator');

    expect(relationshipsLinkOn('#/students/guardian-relationships').hidden).toBe(false);
  });

  it('marks the link active on its own route', () => {
    grantRoles('Coordinator');

    const link = relationshipsLinkOn('#/students/guardian-relationships');
    expect(link.classList.contains('sidebar__link--active')).toBe(true);
  });

  it('hides the link from a Teacher who is neither Coordinator nor Admin', () => {
    grantRoles('Teacher');

    expect(relationshipsLinkOn('#/students').hidden).toBe(true);
  });

  it('shows the link to an Admin outside the Students area', () => {
    grantRoles('Admin');

    expect(relationshipsLinkOn('#/admin/users').hidden).toBe(false);
  });
});
