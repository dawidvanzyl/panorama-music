import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { hasRole } from '../../services/token-storage';
import { pageButtonStyles } from '../page-button-styles';
import type { TeacherResult } from '../../features/teachers/services/teachers';
import '../../features/students/pages/pm-students-page';
import '../../features/students/pages/pm-waiting-list-page';
import '../../features/reports/pages/pm-reports-page';
import '../../features/reports/pages/pm-report-builder-page';
import '../../features/reports/components/pm-report-filters-panel';
import '../../features/admin/components/pm-users-table';
import '../../features/admin/components/pm-audit-filter-bar';
import '../../features/admin/components/pm-audit-event-table';
import '../../features/sessions/pages/pm-admin-sessions-page';
import '../../features/teachers/components/pm-teacher-header';
import '../../features/teachers/components/pm-banking-section';
import '../../features/students/components/pm-guardians-step';
import '../../features/students/components/pm-courses-step';
import '../../features/students/components/pm-extra-curriculars-step';
import '../../features/extra-curriculars/components/pm-extra-curricular-form';

vi.mock('../../services/token-storage', async () => {
  const actual = await vi.importActual<typeof import('../../services/token-storage')>('../../services/token-storage');
  return { ...actual, hasRole: vi.fn(), hasAnyRole: vi.fn() };
});

type Variant = 'primary' | 'secondary' | 'destructive';

const mounted: HTMLElement[] = [];

function create(tag: string): HTMLElement {
  const element = document.createElement(tag);
  document.body.appendChild(element);
  mounted.push(element);
  return element;
}

function byId<T extends HTMLElement>(root: ShadowRoot, id: string): T {
  return root.getElementById(id) as T;
}

function call(target: HTMLElement, method: string, ...args: unknown[]): unknown {
  return (target as unknown as Record<string, (...a: unknown[]) => unknown>)[method](...args);
}

function variantsOf(button: HTMLElement): string[] {
  return Array.from(button.classList).filter((name) => /^page-btn--/.test(name));
}

function label(button: HTMLElement): string {
  return (button.textContent ?? '').replace(/\s+/g, ' ').trim();
}

beforeEach(() => {
  vi.mocked(hasRole).mockReset().mockReturnValue(true);
});

afterEach(() => {
  while (mounted.length > 0) mounted.pop()!.remove();
});

const activeTeacher: TeacherResult = {
  teacherId: 't1',
  firstName: 'Thandi',
  surname: 'Mokoena',
  isPrivate: false,
  isActive: true,
  linkedAccountId: null,
  linkedAccountEmail: null,
  banking: null,
};

describe('the banking section entry point', { tags: ['381UC7'] }, () => {
  it('reads Create Banking Details as a primary page button for a teacher with no banking details', () => {
    const host = create('pm-banking-section');
    (host as unknown as { teacher: TeacherResult }).teacher = activeTeacher;
    const button = byId<HTMLButtonElement>(host.shadowRoot!, 'addBtn');

    expect(label(button)).toBe('Create Banking Details');
    expect(button.hidden).toBe(false);
    expect(button.classList.contains('page-btn')).toBe(true);
    expect(variantsOf(button)).toEqual(['page-btn--primary']);
  });
});

describe('the student wizard entry points', { tags: ['381UC8'] }, () => {
  it('the Guardians step reads Create Guardian and Sync Guardians as page buttons, and hides the entry point on click', () => {
    const host = create('pm-guardians-step');
    (host as unknown as { relationships: unknown }).relationships = [{ guardianRelationshipId: 'r1', name: 'Mother' }];
    call(host, 'activateForCreate');
    const root = host.shadowRoot!;
    const add = byId<HTMLButtonElement>(root, 'addBtn');

    expect(label(add)).toBe('Create Guardian');
    expect(variantsOf(add)).toEqual(['page-btn--primary']);
    expect(variantsOf(byId(root, 'syncBtn'))).toEqual(['page-btn--secondary']);

    add.click();

    expect(add.hidden).toBe(true);
  });

  it('the Courses step reads Enrol Student as a primary page button and hides it on click', () => {
    const host = create('pm-courses-step');
    (host as unknown as { courses: unknown }).courses = [];
    call(host, 'activateForCreate');
    const enrol = byId<HTMLButtonElement>(host.shadowRoot!, 'enrollBtn');

    expect(label(enrol)).toBe('Enrol Student');
    expect(variantsOf(enrol)).toEqual(['page-btn--primary']);

    enrol.click();

    expect(enrol.hidden).toBe(true);
  });

  it('the Extra-Curriculars step reads Assign Activity as a primary page button and hides it on click', () => {
    const host = create('pm-extra-curriculars-step');
    call(host, 'activateForCreate', 'Junior');
    const assign = byId<HTMLButtonElement>(host.shadowRoot!, 'addBtn');

    expect(label(assign)).toBe('Assign Activity');
    expect(variantsOf(assign)).toEqual(['page-btn--primary']);

    assign.click();

    expect(assign.hidden).toBe(true);
  });
});

describe('the extra-curricular form practice-time entry point', { tags: ['381UC9'] }, () => {
  it('reads Create Practice Time as a secondary page button that stages a slot and sends nothing', () => {
    const host = create('pm-extra-curricular-form');
    const root = host.shadowRoot!;
    const events: Event[] = [];
    host.addEventListener('extra-curricular-form-submitted', (event) => events.push(event));
    const button = byId<HTMLButtonElement>(root, 'addBtn');

    expect(label(button)).toBe('Create Practice Time');
    expect(variantsOf(button)).toEqual(['page-btn--secondary']);

    byId<HTMLInputElement>(root, 'startTime').value = '07:15';
    button.click();

    expect(root.querySelectorAll('#chips > *').length).toBe(1);
    expect(events).toHaveLength(0);
  });
});

describe('the report filters panel entry point', { tags: ['381UC11'] }, () => {
  it('reads Add Filter with no plus sign, is a secondary page button and requests a filter row on click', () => {
    const host = create('pm-report-filters-panel');
    const events: Event[] = [];
    host.addEventListener('filter-add-requested', (event) => events.push(event));
    const button = byId<HTMLButtonElement>(host.shadowRoot!, 'add');

    expect(label(button)).toBe('Add Filter');
    expect(variantsOf(button)).toEqual(['page-btn--secondary']);

    button.click();

    expect(events).toHaveLength(1);
  });
});

interface HostCase {
  tag: string;
  buttons: Array<[selector: string, variant: Variant]>;
  deletedClasses: string[];
}

const hosts: HostCase[] = [
  {
    tag: 'pm-students-page',
    buttons: [['#createBtn', 'primary']],
    deletedClasses: ['students-page__create-btn'],
  },
  {
    tag: 'pm-waiting-list-page',
    buttons: [['#captureBtn', 'primary']],
    deletedClasses: ['waiting-list-page__capture-btn'],
  },
  {
    tag: 'pm-reports-page',
    buttons: [['#create', 'primary']],
    deletedClasses: ['reports-page__create', 'material-symbols-outlined'],
  },
  {
    tag: 'pm-report-builder-page',
    buttons: [
      ['#clear', 'secondary'],
      ['#save', 'secondary'],
      ['#run', 'primary'],
    ],
    deletedClasses: ['builder-page__clear', 'builder-page__save', 'builder-page__run', 'material-symbols-outlined'],
  },
  {
    tag: 'pm-report-filters-panel',
    buttons: [['#add', 'secondary']],
    deletedClasses: ['filters-panel__add:hover'],
  },
  {
    tag: 'pm-users-table',
    buttons: [['#filterBtn', 'secondary']],
    deletedClasses: ['users-table__filter-icon', 'users-table__filter-btn:hover'],
  },
  {
    tag: 'pm-audit-filter-bar',
    buttons: [
      ['#clearBtn', 'secondary'],
      ['#applyBtn', 'primary'],
    ],
    deletedClasses: ['filter-bar__btn'],
  },
  {
    tag: 'pm-audit-event-table',
    buttons: [
      ['#prevBtn', 'secondary'],
      ['#nextBtn', 'secondary'],
    ],
    deletedClasses: ['audit-table__page-btn', 'audit-table__footer-nav'],
  },
  {
    tag: 'pm-admin-sessions-page',
    buttons: [['#revokeAllBtn', 'destructive']],
    deletedClasses: ['admin-sessions-page__revoke-all'],
  },
  {
    tag: 'pm-teacher-header',
    buttons: [
      ['#bankingActivityBtn', 'secondary'],
      ['#linkBtn', 'secondary'],
      ['#unlinkBtn', 'secondary'],
      ['#deactivateBtn', 'destructive'],
      ['#reactivateBtn', 'secondary'],
      ['#deleteBtn', 'destructive'],
    ],
    deletedClasses: ['header__btn', 'header__actions'],
  },
  {
    tag: 'pm-banking-section',
    buttons: [['#addBtn', 'primary']],
    deletedClasses: ['banking__btn'],
  },
  {
    tag: 'pm-guardians-step',
    buttons: [
      ['#syncBtn', 'secondary'],
      ['#addBtn', 'primary'],
    ],
    deletedClasses: ['guardians-step__btn'],
  },
  {
    tag: 'pm-courses-step',
    buttons: [['#enrollBtn', 'primary']],
    deletedClasses: ['courses-step__btn'],
  },
  {
    tag: 'pm-extra-curriculars-step',
    buttons: [['#addBtn', 'primary']],
    deletedClasses: ['ec-step__btn'],
  },
  {
    tag: 'pm-extra-curricular-form',
    buttons: [['#addBtn', 'secondary']],
    deletedClasses: ['ec-form__add'],
  },
];

describe('every page with page buttons adopts the shared page button stylesheet', { tags: ['381UC13'] }, () => {
  function localSheetText(root: ShadowRoot): string {
    const sheets = root.adoptedStyleSheets;
    return Array.from(sheets[sheets.length - 1].cssRules)
      .map((rule) => rule.cssText)
      .join('\n');
  }

  it.each(hosts)('$tag adopts pageButtonStyles and classes each page button once', ({ tag, buttons }) => {
    const host = document.createElement(tag);
    const root = host.shadowRoot!;

    expect(root.adoptedStyleSheets).toContain(pageButtonStyles);
    for (const [selector, variant] of buttons) {
      const button = root.querySelector<HTMLElement>(selector)!;
      expect(button.classList.contains('page-btn')).toBe(true);
      expect(variantsOf(button)).toEqual([`page-btn--${variant}`]);

      const icons = Array.from(button.children).filter((child) => child.id !== 'filterLabel');
      expect(icons.length).toBeLessThanOrEqual(1);
      if (icons.length === 1) {
        expect(icons[0].classList.contains('page-btn__icon')).toBe(true);
        expect(icons[0].getAttribute('aria-hidden')).toBe('true');
        expect(button.firstElementChild).toBe(icons[0]);
      }
    }
  });

  it.each(hosts)('$tag keeps no local rule for a deleted button class', ({ tag, deletedClasses }) => {
    const host = document.createElement(tag);
    const text = localSheetText(host.shadowRoot!);

    for (const name of deletedClasses) expect(text).not.toContain(name);
  });

  it('the users table filter button has no trailing icon and keeps its dynamic label', () => {
    const host = document.createElement('pm-users-table');
    const button = byId(host.shadowRoot!, 'filterBtn');

    expect(button.children).toHaveLength(1);
    expect(button.firstElementChild!.id).toBe('filterLabel');
  });

  it('the teacher header shows secondary buttons before destructive ones and never a primary', () => {
    const states = [
      { linkedAccountId: null, isActive: true },
      { linkedAccountId: 'a1', isActive: true },
      { linkedAccountId: null, isActive: false },
      { linkedAccountId: 'a1', isActive: false },
    ];
    const rank: Record<string, number> = { 'page-btn--secondary': 0, 'page-btn--destructive': 1 };

    for (const state of states) {
      const host = create('pm-teacher-header');
      (host as unknown as { teacher: TeacherResult }).teacher = {
        ...activeTeacher,
        ...state,
        linkedAccountEmail: state.linkedAccountId ? 'a@x.test' : null,
        banking: { bank: 'StandardBank', accountType: 'Savings', branchCode: '1', accountNumberLast4: '1234' },
      };
      const visible = Array.from(host.shadowRoot!.querySelectorAll<HTMLButtonElement>('.page-btn')).filter(
        (button) => !button.hidden,
      );
      const ranks = visible.map((button) => rank[variantsOf(button)[0]]);

      expect(ranks.length).toBeGreaterThan(0);
      expect(ranks.every((value) => value !== undefined)).toBe(true);
      expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    }
  });
});
