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
    expect(text).toContain('banking details will be permanently deleted');
    expect(text).toContain('The teacher record and its history are preserved.');
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
    expect(element.hasAttribute('open')).toBe(false);
  });
});
