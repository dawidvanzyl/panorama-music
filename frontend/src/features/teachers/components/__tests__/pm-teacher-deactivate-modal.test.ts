import { describe, it, expect, afterEach, vi } from 'vitest';
import '../pm-teacher-deactivate-modal';
import type { PmTeacherDeactivateModal } from '../pm-teacher-deactivate-modal';

function mount(): PmTeacherDeactivateModal {
  const el = document.createElement('pm-teacher-deactivate-modal') as PmTeacherDeactivateModal;
  document.body.appendChild(el);
  return el;
}

let element: PmTeacherDeactivateModal | null = null;

afterEach(() => {
  if (element) document.body.removeChild(element);
  element = null;
});

describe('pm-teacher-deactivate-modal — the confirmation warns about the banking details', { tags: ['234UC9'] }, () => {
  it('names the teacher and states that their banking details will be deleted', () => {
    element = mount();
    element.show('Thandi Mokoena');

    // Collapsed, because the template wraps the sentences across source lines.
    const text = (element.shadowRoot!.textContent ?? '').replace(/\s+/g, ' ');

    expect(element.hasAttribute('open')).toBe(true);
    expect(text).toContain('Thandi Mokoena');
    // The warning is the point of the step — the deletion is permanent and
    // happens with the same click.
    expect(text).toContain('Their banking details will be permanently removed.');
    expect(text).toContain('The teacher record and its history are kept.');
  });

  it('dispatches the confirmation rather than calling the API itself, and cancels without it', () => {
    element = mount();
    element.show('Thandi Mokoena');

    const confirmed = vi.fn();
    element.addEventListener('teacher-deactivate-confirmed', confirmed);

    (element.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement).click();
    expect(confirmed).not.toHaveBeenCalled();
    expect(element.hasAttribute('open')).toBe(false);

    element.show('Thandi Mokoena');
    (element.shadowRoot!.getElementById('deactivateBtn') as HTMLButtonElement).click();

    expect(confirmed).toHaveBeenCalledTimes(1);
    expect(element.hasAttribute('open')).toBe(true);
  });
});

describe('pm-teacher-deactivate-modal — destructive template', { tags: ['392UC1'] }, () => {
  it('shows the delete icon, the cannot-be-undone body and the teacher name in strong', () => {
    element = mount();
    element.show('Ann Lee');
    const root = element.shadowRoot!;

    const icon = root.querySelector('.modal__header .modal__icon')!;
    expect(icon.textContent).toBe('delete_forever');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(root.getElementById('modalTitle')!.textContent).toBe('Deactivate Teacher');

    const body = root.querySelector('.modal__body')!;
    expect((body.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe(
      'This action cannot be undone. The teacher Ann Lee will be deactivated and removed from active selection lists. ' +
        'Their banking details will be permanently removed. The teacher record and its history are kept.',
    );
    const strongs = Array.from(body.querySelectorAll('strong')).map((s) => s.textContent);
    expect(strongs[0]).toBe('cannot be undone');
    expect(strongs).toContain('Ann Lee');
    expect(body.querySelector('br')).toBeNull();
    expect(body.textContent).not.toContain('Are you sure');
  });
});

describe('pm-teacher-deactivate-modal — confirm button', { tags: ['392UC2'] }, () => {
  it('is the destructive Deactivate button', () => {
    element = mount();
    const button = element.shadowRoot!.getElementById('deactivateBtn')!;
    expect(button.textContent).toBe('Deactivate');
    expect(button.classList.contains('modal__btn--destructive')).toBe(true);
  });
});
