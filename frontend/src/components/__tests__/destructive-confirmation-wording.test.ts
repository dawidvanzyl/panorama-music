import { afterEach, describe, expect, it } from 'vitest';
import '../../features/teachers/components/pm-teacher-delete-modal';
import '../../features/teachers/components/pm-banking-delete-modal';
import '../../features/students/components/pm-delete-student-modal';
import '../../features/students/components/pm-delete-relationship-modal';
import '../../features/students/components/pm-delete-guardian-modal';
import '../../features/students/components/pm-delete-waiting-list-entry-modal';
import '../../features/students/components/pm-withdraw-enrollment-modal';
import '../../features/courses/components/pm-delete-course-modal';
import '../../features/admin/components/pm-delete-user-modal';
import '../../features/extra-curriculars/components/pm-delete-extra-curricular-modal';
import '../../features/reports/components/pm-delete-report-modal';

type Show = (modal: HTMLElement) => void;

function call(modal: HTMLElement, ...args: unknown[]): void {
  (modal as unknown as { show: (...a: unknown[]) => void }).show(...args);
}

function mount(tag: string, show: Show): HTMLElement {
  const modal = document.createElement(tag);
  document.body.appendChild(modal);
  show(modal);
  return modal;
}

function root(modal: HTMLElement): ShadowRoot {
  return modal.shadowRoot!;
}

function collapse(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

function visibleBody(modal: HTMLElement): HTMLElement {
  const bodies = Array.from(root(modal).querySelectorAll<HTMLElement>('.modal__body'));
  return bodies.find((body) => !body.hidden && !body.closest('[hidden]')) ?? bodies[0];
}

function bodyText(modal: HTMLElement): string {
  return collapse(visibleBody(modal).textContent);
}

function title(modal: HTMLElement): string {
  return collapse(root(modal).getElementById('modalTitle')!.textContent);
}

function icon(modal: HTMLElement): HTMLElement {
  return root(modal).querySelector<HTMLElement>('.modal__header .modal__icon')!;
}

function confirmButton(modal: HTMLElement, id = 'deleteBtn'): HTMLButtonElement {
  return root(modal).getElementById(id) as HTMLButtonElement;
}

function strongTexts(modal: HTMLElement): string[] {
  return Array.from(visibleBody(modal).querySelectorAll('strong')).map((s) => collapse(s.textContent));
}

interface Case {
  tag: string;
  show: Show;
  name: string;
  confirmId?: string;
}

const cases: Case[] = [
  { tag: 'pm-teacher-delete-modal', show: (m) => call(m, 'Ann Lee'), name: 'Ann Lee' },
  { tag: 'pm-banking-delete-modal', show: (m) => call(m, '1234'), name: 'ending 1234' },
  { tag: 'pm-delete-student-modal', show: (m) => call(m, 's1', 'Sam Ng'), name: 'Sam Ng' },
  { tag: 'pm-delete-relationship-modal', show: (m) => call(m, 'r1', 'Mother'), name: 'Mother' },
  {
    tag: 'pm-delete-guardian-modal',
    show: (m) => call(m, 's1', 'g1', 'Sipho Dlamini', false, false),
    name: 'Sipho Dlamini',
  },
  { tag: 'pm-delete-course-modal', show: (m) => call(m, 'c1', 'Piano Grade 1'), name: 'Piano Grade 1' },
  { tag: 'pm-delete-user-modal', show: (m) => call(m, 'u1', 'a@b.com'), name: 'a@b.com' },
  { tag: 'pm-delete-extra-curricular-modal', show: (m) => call(m, 'e1', 'Choir', 2), name: 'Choir' },
  { tag: 'pm-delete-waiting-list-entry-modal', show: (m) => call(m, 's1', 'Sam Ng'), name: 'Sam Ng' },
  {
    tag: 'pm-withdraw-enrollment-modal',
    show: (m) => call(m, 's1', 'sc1', 'Sam Ng', 'Piano'),
    name: 'Sam Ng',
    confirmId: 'withdrawBtn',
  },
  { tag: 'pm-delete-report-modal', show: (m) => call(m, 'rep1', 'Grade 4'), name: 'Grade 4' },
];

afterEach(() => {
  document.body.innerHTML = '';
});

describe('destructive modals — shared wording', { tags: ['391UC1'] }, () => {
  it.each(cases)('$tag shows the destructive wording', ({ tag, show, name, confirmId }) => {
    const modal = mount(tag, show);

    expect(icon(modal).textContent).toBe('delete_forever');
    expect(icon(modal).getAttribute('aria-hidden')).toBe('true');
    expect(bodyText(modal).startsWith('This action cannot be undone.')).toBe(true);
    expect(strongTexts(modal)[0]).toBe('cannot be undone');
    expect(strongTexts(modal)).toContain(name);
    expect(confirmButton(modal, confirmId).classList.contains('modal__btn--destructive')).toBe(true);
  });
});

describe('pm-teacher-delete-modal — wording', { tags: ['391UC2'] }, () => {
  it('names the teacher and confirms with Delete', () => {
    const modal = mount('pm-teacher-delete-modal', (m) => call(m, 'Ann Lee'));

    expect(title(modal)).toBe('Delete Teacher');
    expect(bodyText(modal)).toBe('This action cannot be undone. The teacher Ann Lee will be permanently removed.');
    expect(confirmButton(modal).textContent).toBe('Delete');
  });
});

describe('pm-banking-delete-modal — wording', { tags: ['391UC3'] }, () => {
  it('names the details by their last four digits and confirms with Delete', () => {
    const modal = mount('pm-banking-delete-modal', (m) => call(m, '1234'));

    expect(title(modal)).toBe('Delete Banking Details');
    expect(bodyText(modal)).toBe(
      'This action cannot be undone. The banking details ending 1234 will be permanently removed.',
    );
    expect(strongTexts(modal)).toContain('ending 1234');
    expect(confirmButton(modal).textContent).toBe('Delete');
  });
});

describe('student, relationship and course delete modals — wording', { tags: ['391UC4'] }, () => {
  it.each([
    ['pm-delete-student-modal', 'Delete Student', 'student', 'Sam Ng'],
    ['pm-delete-relationship-modal', 'Delete Relationship', 'relationship', 'Mother'],
    ['pm-delete-course-modal', 'Delete Course', 'course', 'Piano Grade 1'],
  ])('%s follows the delete template', (tag, expectedTitle, noun, name) => {
    const modal = mount(tag, (m) => call(m, 'id1', name));

    expect(title(modal)).toBe(expectedTitle);
    expect(bodyText(modal)).toBe(`This action cannot be undone. The ${noun} ${name} will be permanently removed.`);
    expect(confirmButton(modal).textContent).toBe('Delete');
  });
});

describe('pm-delete-guardian-modal — one student', { tags: ['391UC5'] }, () => {
  it('follows the delete template and shows no scope choice', () => {
    const modal = mount('pm-delete-guardian-modal', (m) => call(m, 's1', 'g1', 'Sipho Dlamini', false, false));
    const r = root(modal);

    expect(title(modal)).toBe('Delete Guardian');
    expect(collapse(r.getElementById('plainBody')!.textContent)).toBe(
      'This action cannot be undone. The guardian Sipho Dlamini will be permanently removed.',
    );
    expect((r.getElementById('plainBody') as HTMLElement).hidden).toBe(false);
    expect((r.getElementById('scopeChoice') as HTMLElement).hidden).toBe(true);
    expect((r.getElementById('restrictedBody') as HTMLElement).hidden).toBe(true);
    expect(confirmButton(modal).textContent).toBe('Delete');
  });
});

describe('pm-delete-guardian-modal — shared with siblings', { tags: ['391UC6'] }, () => {
  it('shows two scope options and sends the selected scope', () => {
    const modal = mount('pm-delete-guardian-modal', (m) => call(m, 's1', 'g1', 'Sipho Dlamini', true, false));
    const r = root(modal);
    const events: { scope: string; studentId: string; guardianId: string }[] = [];
    modal.addEventListener('guardian-delete-confirmed', (e) =>
      events.push((e as CustomEvent<{ scope: string; studentId: string; guardianId: string }>).detail),
    );

    expect(title(modal)).toBe('Delete Guardian');
    expect(collapse(r.querySelector('#scopeChoice .modal__body')!.textContent)).toBe(
      'This action cannot be undone. The guardian Sipho Dlamini is shared with siblings. Choose one option.',
    );
    const labels = Array.from(r.querySelectorAll('.modal__scope-option')).map((l) => collapse(l.textContent));
    expect(labels).toEqual([
      'Unlink from this student only — the guardian record and the other sibling links stay.',
      "Delete the guardian and all links — the guardian record and every sibling's link are permanently removed.",
    ]);
    expect((r.getElementById('scopeOne') as HTMLInputElement).checked).toBe(true);
    expect(confirmButton(modal).textContent).toBe('Delete');
    expect(confirmButton(modal).classList.contains('modal__btn--destructive')).toBe(true);

    confirmButton(modal).click();
    expect(events[0]).toEqual({ studentId: 's1', guardianId: 'g1', scope: 'one' });

    (modal as unknown as { setBusy(b: boolean): void }).setBusy(false);
    (r.getElementById('scopeAll') as HTMLInputElement).checked = true;
    confirmButton(modal).click();
    expect(events[1].scope).toBe('all');
  });
});

describe('pm-delete-guardian-modal — shared with an enrolled student', { tags: ['391UC7'] }, () => {
  it('uses the reversible family and says the guardian can be linked again', () => {
    const modal = mount('pm-delete-guardian-modal', (m) => call(m, 's1', 'g1', 'Sipho Dlamini', true, true));
    const r = root(modal);
    const events: { scope: string; studentId: string; guardianId: string }[] = [];
    modal.addEventListener('guardian-delete-confirmed', (e) =>
      events.push((e as CustomEvent<{ scope: string; studentId: string; guardianId: string }>).detail),
    );

    expect(icon(modal).textContent).toBe('info');
    expect(icon(modal).classList.contains('modal__icon--reversible')).toBe(true);
    expect(icon(modal).getAttribute('aria-hidden')).toBe('true');
    expect(title(modal)).toBe('Unlink Guardian');
    expect((r.getElementById('restrictedBody') as HTMLElement).hidden).toBe(false);
    expect(collapse(r.getElementById('restrictedBody')!.textContent)).toBe(
      'The guardian Sipho Dlamini will be unlinked from this student only. The guardian record stays because it is shared with an enrolled student. You can link the guardian again later.',
    );
    expect(visibleBody(modal)).toBe(r.getElementById('restrictedBody'));
    expect(bodyText(modal)).not.toContain('cannot be undone');
    expect((r.getElementById('scopeChoice') as HTMLElement).hidden).toBe(true);
    expect(confirmButton(modal).textContent).toBe('Unlink');
    expect(confirmButton(modal).classList.contains('modal__btn--primary')).toBe(true);
    expect(confirmButton(modal).classList.contains('modal__btn--destructive')).toBe(false);

    confirmButton(modal).click();
    expect(events[0]).toEqual({ studentId: 's1', guardianId: 'g1', scope: 'one' });
  });

  it('resets to the destructive family when shown again unrestricted', () => {
    const modal = mount('pm-delete-guardian-modal', (m) => call(m, 's1', 'g1', 'Sipho Dlamini', true, true));

    call(modal, 's1', 'g1', 'Sipho Dlamini', false, false);

    expect(icon(modal).textContent).toBe('delete_forever');
    expect(icon(modal).classList.contains('modal__icon--reversible')).toBe(false);
    expect(title(modal)).toBe('Delete Guardian');
    expect(confirmButton(modal).textContent).toBe('Delete');
    expect(confirmButton(modal).classList.contains('modal__btn--destructive')).toBe(true);
    expect(confirmButton(modal).classList.contains('modal__btn--primary')).toBe(false);
  });

  it('keeps the Unlink label and no loading icon after a busy cycle', () => {
    const modal = mount('pm-delete-guardian-modal', (m) => call(m, 's1', 'g1', 'Sipho Dlamini', true, true));

    (modal as unknown as { setBusy(b: boolean): void }).setBusy(true);
    (modal as unknown as { setBusy(b: boolean): void }).setBusy(false);

    expect(confirmButton(modal).textContent).toBe('Unlink');
    expect(confirmButton(modal).querySelector('.btn-loading-icon')).toBeNull();
  });
});

describe('pm-delete-user-modal — typed field label', { tags: ['391UC8'] }, () => {
  it('labels the field with the email and keeps the instruction out of the body', () => {
    const modal = mount('pm-delete-user-modal', (m) => call(m, 'u1', 'a@b.com'));
    const r = root(modal);

    expect(title(modal)).toBe('Delete User');
    expect(collapse(r.getElementById('confirmLabel')!.textContent)).toBe('Type "a@b.com" to confirm');
    expect((r.getElementById('confirmLabel') as HTMLLabelElement).htmlFor).toBe('confirmInput');
    expect(bodyText(modal)).toBe('This action cannot be undone. The user a@b.com will be permanently removed.');
    expect(bodyText(modal)).not.toContain('Type');
    expect(bodyText(modal)).not.toContain('to confirm');
  });
});

describe('pm-delete-user-modal — typed gate', { tags: ['391UC9'] }, () => {
  it('enables Delete only when the typed text equals the email exactly', () => {
    const modal = mount('pm-delete-user-modal', (m) => call(m, 'u1', 'a@b.com'));
    const input = root(modal).getElementById('confirmInput') as HTMLInputElement;
    const type = (value: string): boolean => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      return confirmButton(modal).disabled;
    };

    expect(confirmButton(modal).disabled).toBe(true);
    for (const wrong of ['', 'a@b.co', 'A@B.COM', ' a@b.com', 'a@b.com ']) {
      expect(type(wrong)).toBe(true);
    }
    expect(type('a@b.com')).toBe(false);
  });
});

describe('pm-delete-extra-curricular-modal — wording', { tags: ['391UC10'] }, () => {
  it('names the activity and the practice times removed with it', () => {
    const modal = mount('pm-delete-extra-curricular-modal', (m) => call(m, 'e1', 'Choir', 3));

    expect(title(modal)).toBe('Delete Activity');
    expect(bodyText(modal)).toBe(
      'This action cannot be undone. The activity Choir will be permanently removed. Its 3 practice times will also be permanently removed.',
    );
    expect(confirmButton(modal).textContent).toBe('Delete');
  });

  it('uses the singular for one practice time', () => {
    const modal = mount('pm-delete-extra-curricular-modal', (m) => call(m, 'e1', 'Choir', 1));

    expect(bodyText(modal)).toContain('Its 1 practice time will also be permanently removed.');
  });
});

describe('pm-delete-waiting-list-entry-modal — wording', { tags: ['391UC11'] }, () => {
  it('follows the remove template and names the student record', () => {
    const modal = mount('pm-delete-waiting-list-entry-modal', (m) => call(m, 's1', 'Sam Ng'));

    expect(title(modal)).toBe('Remove Student from Waiting List');
    expect(bodyText(modal)).toBe(
      'This action cannot be undone. The student Sam Ng will be removed from the waiting list. The student record will also be permanently removed.',
    );
    expect(confirmButton(modal).textContent).toBe('Remove');
  });
});

describe('pm-withdraw-enrollment-modal — wording', { tags: ['391UC12'] }, () => {
  it('follows the withdraw template with both names in strong', () => {
    const modal = mount('pm-withdraw-enrollment-modal', (m) => call(m, 's1', 'sc1', 'Sam Ng', 'Piano'));

    expect(bodyText(modal)).toBe('This action cannot be undone. Sam Ng will be permanently withdrawn from Piano.');
    expect(strongTexts(modal)).toEqual(expect.arrayContaining(['Sam Ng', 'Piano']));
    expect(confirmButton(modal, 'withdrawBtn').textContent).toBe('Withdraw');
  });
});

describe('pm-delete-report-modal — wording', { tags: ['391UC13'] }, () => {
  it('follows the delete template without an icon circle', () => {
    const modal = mount('pm-delete-report-modal', (m) => call(m, 'rep1', 'Grade 4'));

    expect(title(modal)).toBe('Delete Report');
    expect(bodyText(modal)).toBe('This action cannot be undone. The report Grade 4 will be permanently removed.');
    expect(strongTexts(modal)).toContain('Grade 4');
    expect(root(modal).querySelector('.modal__icon-circle')).toBeNull();
    expect(confirmButton(modal).textContent).toBe('Delete');
  });
});
