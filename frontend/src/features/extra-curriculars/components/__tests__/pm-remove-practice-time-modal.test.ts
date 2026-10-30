import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../pm-remove-practice-time-modal';
import type { PmRemovePracticeTimeModal } from '../pm-remove-practice-time-modal';

function query<T extends Element>(el: PmRemovePracticeTimeModal, selector: string): T {
  return el.shadowRoot!.querySelector(selector) as T;
}

describe('pm-remove-practice-time-modal — wording and layout', { tags: ['396UC2'] }, () => {
  let el: PmRemovePracticeTimeModal;

  beforeEach(() => {
    el = document.createElement('pm-remove-practice-time-modal') as PmRemovePracticeTimeModal;
    document.body.appendChild(el);
    el.show('ec1', 'pt1', 'Monday 08:00', 'Choir');
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('shows the destructive icon hidden from assistive technology and the title', () => {
    const icon = query<HTMLElement>(el, '.modal__header .modal__icon');
    expect(icon.textContent).toBe('delete_forever');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(query(el, '#modalTitle').textContent).toBe('Remove Practice Time from Activity');
  });

  it('opens the body with the irreversibility warning and names the slot and activity in bold', () => {
    const body = query<HTMLElement>(el, '.modal__body');
    expect(body.textContent!.replace(/\s+/g, ' ').trim().startsWith('This action cannot be undone.')).toBe(true);
    expect(query(el, '.modal__body strong').textContent).toBe('cannot be undone');
    expect(query(el, '#practiceTime').tagName).toBe('STRONG');
    expect(query(el, '#practiceTime').textContent).toBe('Monday 08:00');
    expect(query(el, '#activityName').tagName).toBe('STRONG');
    expect(query(el, '#activityName').textContent).toBe('Choir');
  });

  it('puts Cancel before a destructive Remove button', () => {
    const buttons = [...el.shadowRoot!.querySelectorAll('.modal__actions button')];
    expect(buttons.map((b) => b.textContent!.trim())).toEqual(['Cancel', 'Remove']);
    expect(buttons[1].classList.contains('modal__btn--destructive')).toBe(true);
  });

  it('renders an activity name holding markup as plain text', () => {
    el.show('ec1', 'pt1', 'Monday 08:00', '<b>x</b>');

    expect(query(el, '#activityName').textContent).toBe('<b>x</b>');
    expect(query(el, '#activityName').querySelector('b')).toBeNull();
  });
});

describe('pm-remove-practice-time-modal — confirming and dismissing', { tags: ['396UC3', '396UC7'] }, () => {
  let el: PmRemovePracticeTimeModal;
  let events: CustomEvent[];

  beforeEach(() => {
    el = document.createElement('pm-remove-practice-time-modal') as PmRemovePracticeTimeModal;
    document.body.appendChild(el);
    events = [];
    el.addEventListener('extra-curricular-practice-time-remove-requested', (e) => events.push(e as CustomEvent));
    el.show('ec1', 'pt1', 'Monday 08:00', 'Choir');
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('dispatches the remove request once with the ids of the shown slot and goes busy', () => {
    query<HTMLButtonElement>(el, '#removeBtn').click();

    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ extraCurricularId: 'ec1', practiceTimeId: 'pt1' });
    expect(el.hasAttribute('open')).toBe(true);
    expect(query<HTMLButtonElement>(el, '#removeBtn').disabled).toBe(true);
  });

  it.each(['#cancelBtn', '#closeBtn'])('closes on %s and dispatches nothing', (selector) => {
    query<HTMLButtonElement>(el, selector).click();

    expect(el.hasAttribute('open')).toBe(false);
    expect(events).toHaveLength(0);
  });

  it('shows an error and enables the buttons again once the opener reports a failure', () => {
    query<HTMLButtonElement>(el, '#removeBtn').click();
    el.setBusy(false);
    el.showError('Removal refused');

    expect(query(el, '#error').textContent).toBe('Removal refused');
    expect(query<HTMLButtonElement>(el, '#removeBtn').disabled).toBe(false);
    expect(query<HTMLButtonElement>(el, '#cancelBtn').disabled).toBe(false);
  });
});
