import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../pm-unlink-activity-modal';
import type { PmUnlinkActivityModal } from '../pm-unlink-activity-modal';

function query<T extends Element>(el: PmUnlinkActivityModal, selector: string): T {
  return el.shadowRoot!.querySelector(selector) as T;
}

describe('pm-unlink-activity-modal — wording and layout', { tags: ['396UC5'] }, () => {
  let el: PmUnlinkActivityModal;

  beforeEach(() => {
    el = document.createElement('pm-unlink-activity-modal') as PmUnlinkActivityModal;
    document.body.appendChild(el);
    el.show('s1', 'ec1', 'Choir', 'Ayesha Khan');
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('shows the reversible icon hidden from assistive technology and the title', () => {
    const icon = query<HTMLElement>(el, '.modal__header .modal__icon');
    expect(icon.textContent).toBe('info');
    expect(icon.classList.contains('modal__icon--reversible')).toBe(true);
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(query(el, '#modalTitle').textContent).toBe('Unlink Activity');
  });

  it('names the activity and student in bold, states how to undo and never says cannot be undone', () => {
    const body = query<HTMLElement>(el, '.modal__body');
    expect(query(el, '#activityName').tagName).toBe('STRONG');
    expect(query(el, '#activityName').textContent).toBe('Choir');
    expect(query(el, '#studentName').tagName).toBe('STRONG');
    expect(query(el, '#studentName').textContent).toBe('Ayesha Khan');
    expect(body.textContent).toContain('You can link the activity again later.');
    expect(body.textContent).not.toContain('cannot be undone');
  });

  it('puts Cancel before a primary Unlink button with no destructive class', () => {
    const buttons = [...el.shadowRoot!.querySelectorAll('.modal__actions button')];
    expect(buttons.map((b) => b.textContent!.trim())).toEqual(['Cancel', 'Unlink']);
    expect(buttons[1].classList.contains('modal__btn--primary')).toBe(true);
    expect(buttons[1].classList.contains('modal__btn--destructive')).toBe(false);
  });

  it('renders names holding markup as plain text', () => {
    el.show('s1', 'ec1', '<b>x</b>', '<i>y</i>');

    expect(query(el, '#activityName').textContent).toBe('<b>x</b>');
    expect(query(el, '#studentName').textContent).toBe('<i>y</i>');
    expect(query(el, '.modal__body b')).toBeNull();
    expect(query(el, '.modal__body i')).toBeNull();
  });
});

describe('pm-unlink-activity-modal — confirming and dismissing', { tags: ['396UC6', '396UC7'] }, () => {
  let el: PmUnlinkActivityModal;
  let events: CustomEvent[];

  beforeEach(() => {
    el = document.createElement('pm-unlink-activity-modal') as PmUnlinkActivityModal;
    document.body.appendChild(el);
    events = [];
    el.addEventListener('extra-curricular-remove-requested', (e) => events.push(e as CustomEvent));
    el.show('s1', 'ec1', 'Choir', 'Ayesha Khan');
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('dispatches the remove request once with the ids of the shown link and goes busy', () => {
    query<HTMLButtonElement>(el, '#unlinkBtn').click();

    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ studentId: 's1', extraCurricularId: 'ec1' });
    expect(el.hasAttribute('open')).toBe(true);
    expect(query<HTMLButtonElement>(el, '#unlinkBtn').disabled).toBe(true);
  });

  it.each(['#cancelBtn', '#closeBtn'])('closes on %s and dispatches nothing', (selector) => {
    query<HTMLButtonElement>(el, selector).click();

    expect(el.hasAttribute('open')).toBe(false);
    expect(events).toHaveLength(0);
  });

  it('shows an error and enables the buttons again once the opener reports a failure', () => {
    query<HTMLButtonElement>(el, '#unlinkBtn').click();
    el.setBusy(false);
    el.showError('Unlink refused');

    expect(query(el, '#error').textContent).toBe('Unlink refused');
    expect(query<HTMLButtonElement>(el, '#unlinkBtn').disabled).toBe(false);
    expect(query<HTMLButtonElement>(el, '#cancelBtn').disabled).toBe(false);
  });
});
