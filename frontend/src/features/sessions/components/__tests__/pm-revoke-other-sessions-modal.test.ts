import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../pm-revoke-other-sessions-modal';
import type { PmRevokeOtherSessionsModal } from '../pm-revoke-other-sessions-modal';

function query<T extends Element>(el: PmRevokeOtherSessionsModal, selector: string): T {
  return el.shadowRoot!.querySelector(selector) as T;
}

describe('pm-revoke-other-sessions-modal — wording and layout', { tags: ['395UC3'] }, () => {
  let el: PmRevokeOtherSessionsModal;

  beforeEach(() => {
    el = document.createElement('pm-revoke-other-sessions-modal') as PmRevokeOtherSessionsModal;
    document.body.appendChild(el);
    el.show();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('shows the destructive icon hidden from assistive technology and the title', () => {
    const icon = query<HTMLElement>(el, '.modal__header .modal__icon');
    expect(icon.textContent).toBe('delete_forever');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(query(el, '#modalTitle').textContent).toBe('Revoke Other Sessions');
  });

  it('opens the body with the irreversibility warning and says all other sessions end', () => {
    const body = query<HTMLElement>(el, '.modal__body');
    const text = body.textContent!.replace(/\s+/g, ' ').trim();
    expect(text.startsWith('This action cannot be undone.')).toBe(true);
    expect(query(el, '.modal__body strong').textContent).toBe('cannot be undone');
    expect(text).toContain('All other sessions of this account will be ended.');
    expect(text).toContain('Those devices must sign in again.');
  });

  it('puts Cancel before a destructive Revoke All Others button', () => {
    const buttons = [...el.shadowRoot!.querySelectorAll('.modal__actions button')];
    expect(buttons.map((b) => b.textContent!.trim())).toEqual(['Cancel', 'Revoke All Others']);
    expect(buttons[1].classList.contains('modal__btn--destructive')).toBe(true);
  });
});

describe('pm-revoke-other-sessions-modal — confirming and dismissing', { tags: ['395UC4', '395UC5'] }, () => {
  let el: PmRevokeOtherSessionsModal;
  let events: Event[];

  beforeEach(() => {
    el = document.createElement('pm-revoke-other-sessions-modal') as PmRevokeOtherSessionsModal;
    document.body.appendChild(el);
    events = [];
    el.addEventListener('own-sessions-revoke-all-requested', (e) => events.push(e));
    el.show();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('dispatches the revoke request exactly once on confirm', () => {
    query<HTMLButtonElement>(el, '#revokeOthersBtn').click();

    expect(events).toHaveLength(1);
    expect(el.hasAttribute('open')).toBe(true);
  });

  it.each(['#cancelBtn', '#closeBtn'])('closes on %s and dispatches nothing', (selector) => {
    query<HTMLButtonElement>(el, selector).click();

    expect(el.hasAttribute('open')).toBe(false);
    expect(events).toHaveLength(0);
  });
});
