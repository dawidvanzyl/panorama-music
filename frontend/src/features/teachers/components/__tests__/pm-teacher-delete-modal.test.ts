import { describe, it, expect, afterEach, vi } from 'vitest';
import '../pm-teacher-delete-modal';
import type { PmTeacherDeleteModal } from '../pm-teacher-delete-modal';

function mount(): PmTeacherDeleteModal {
  const el = document.createElement('pm-teacher-delete-modal') as PmTeacherDeleteModal;
  document.body.appendChild(el);
  return el;
}

let element: PmTeacherDeleteModal | null = null;

afterEach(() => {
  if (element) document.body.removeChild(element);
  element = null;
});

describe('pm-teacher-delete-modal — the confirmation states the removal is permanent', { tags: ['234UC11'] }, () => {
  it('names the teacher and warns that the deletion cannot be undone', () => {
    element = mount();
    element.show('Thandi Mokoena');

    // Collapsed, because the template wraps the sentence across source lines.
    const text = (element.shadowRoot!.textContent ?? '').replace(/\s+/g, ' ');

    expect(element.hasAttribute('open')).toBe(true);
    expect(text).toContain('Thandi Mokoena');
    expect(text).toContain('cannot be undone');
    expect(text).toContain('permanently removed');
  });

  it('dispatches the confirmation rather than calling the API itself, and cancels without it', () => {
    element = mount();
    element.show('Thandi Mokoena');

    const confirmed = vi.fn();
    element.addEventListener('teacher-delete-confirmed', confirmed);

    (element.shadowRoot!.getElementById('cancelBtn') as HTMLButtonElement).click();
    expect(confirmed).not.toHaveBeenCalled();
    expect(element.hasAttribute('open')).toBe(false);

    element.show('Thandi Mokoena');
    (element.shadowRoot!.getElementById('deleteBtn') as HTMLButtonElement).click();

    expect(confirmed).toHaveBeenCalledTimes(1);
    expect(element.hasAttribute('open')).toBe(false);
  });
});
