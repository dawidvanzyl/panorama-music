import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../pm-revoke-session-modal';
import type { PmRevokeSessionModal } from '../pm-revoke-session-modal';

function query<T extends Element>(el: PmRevokeSessionModal, selector: string): T {
  return el.shadowRoot!.querySelector(selector) as T;
}

describe('pm-revoke-session-modal — wording and layout', { tags: ['395UC7'] }, () => {
  let el: PmRevokeSessionModal;

  beforeEach(() => {
    el = document.createElement('pm-revoke-session-modal') as PmRevokeSessionModal;
    document.body.appendChild(el);
    el.show('t1', 'Chrome on Windows');
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('shows the destructive icon hidden from assistive technology and the title', () => {
    const icon = query<HTMLElement>(el, '.modal__header .modal__icon');
    expect(icon.textContent).toBe('delete_forever');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(query(el, '#modalTitle').textContent).toBe('Revoke Session');
  });

  it('opens the body with the irreversibility warning and names the device in bold', () => {
    const body = query<HTMLElement>(el, '.modal__body');
    expect(body.textContent!.replace(/\s+/g, ' ').trim().startsWith('This action cannot be undone.')).toBe(true);
    expect(query(el, '.modal__body strong').textContent).toBe('cannot be undone');
    const device = query<HTMLElement>(el, '#modalDevice');
    expect(device.tagName).toBe('STRONG');
    expect(device.textContent).toBe('Chrome on Windows');
    expect(body.textContent).toContain('That device must sign in again.');
  });

  it('puts Cancel before a destructive Revoke button', () => {
    const buttons = [...el.shadowRoot!.querySelectorAll('.modal__actions button')];
    expect(buttons.map((b) => b.textContent!.trim())).toEqual(['Cancel', 'Revoke']);
    expect(buttons[1].classList.contains('modal__btn--destructive')).toBe(true);
  });

  it('renders a device label holding markup as plain text', () => {
    el.show('t2', '<b>x</b>');

    const device = query<HTMLElement>(el, '#modalDevice');
    expect(device.textContent).toBe('<b>x</b>');
    expect(device.querySelector('b')).toBeNull();
  });
});

describe('pm-revoke-session-modal — confirming and dismissing', { tags: ['395UC5', '395UC8'] }, () => {
  let el: PmRevokeSessionModal;
  let events: CustomEvent[];

  beforeEach(() => {
    el = document.createElement('pm-revoke-session-modal') as PmRevokeSessionModal;
    document.body.appendChild(el);
    events = [];
    el.addEventListener('session-revoke-requested', (e) => events.push(e as CustomEvent));
    el.show('t1', 'Chrome on Windows');
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('dispatches the revoke request once with the token of the shown session', () => {
    query<HTMLButtonElement>(el, '#revokeBtn').click();

    expect(events).toHaveLength(1);
    expect(events[0].detail).toEqual({ tokenId: 't1' });
    expect(el.hasAttribute('open')).toBe(true);
    expect(query<HTMLButtonElement>(el, '#revokeBtn').disabled).toBe(true);
  });

  it('carries the token of the most recently shown session', () => {
    el.show('t2', 'Firefox');
    query<HTMLButtonElement>(el, '#revokeBtn').click();

    expect(events[0].detail).toEqual({ tokenId: 't2' });
  });

  it.each(['#cancelBtn', '#closeBtn'])('closes on %s and dispatches nothing', (selector) => {
    query<HTMLButtonElement>(el, selector).click();

    expect(el.hasAttribute('open')).toBe(false);
    expect(events).toHaveLength(0);
  });

  it('shows an error and enables the buttons again once the opener reports a failure', () => {
    query<HTMLButtonElement>(el, '#revokeBtn').click();
    el.setBusy(false);
    el.showError('Revocation refused');

    expect(query(el, '#error').textContent).toBe('Revocation refused');
    expect(query<HTMLButtonElement>(el, '#revokeBtn').disabled).toBe(false);
    expect(query<HTMLButtonElement>(el, '#cancelBtn').disabled).toBe(false);
  });
});
