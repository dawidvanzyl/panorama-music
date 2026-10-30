import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PmRevokeAllSessionsModal } from '../pm-revoke-all-sessions-modal';

describe('pm-revoke-all-sessions-modal — confirmation dialog', { tags: ['M1.4UC9'] }, () => {
  let modal: PmRevokeAllSessionsModal;

  beforeEach(() => {
    modal = new PmRevokeAllSessionsModal();
    document.body.appendChild(modal);
  });

  afterEach(() => {
    document.body.removeChild(modal);
  });

  it('is hidden by default', () => {
    expect(modal.hasAttribute('open')).toBe(false);
  });

  it('show() makes the modal visible', () => {
    modal.show();
    expect(modal.hasAttribute('open')).toBe(true);
  });

  it('Revoke All button is disabled when modal opens', () => {
    modal.show();
    const revokeAllBtn = modal.shadowRoot!.getElementById('revokeAllBtn') as HTMLButtonElement;
    expect(revokeAllBtn.disabled).toBe(true);
  });

  it('Revoke All button remains disabled when the wrong phrase is typed', () => {
    modal.show();
    const input = modal.shadowRoot!.getElementById('confirmInput') as HTMLInputElement;
    input.value = 'revoke all';
    input.dispatchEvent(new Event('input'));
    const revokeAllBtn = modal.shadowRoot!.getElementById('revokeAllBtn') as HTMLButtonElement;
    expect(revokeAllBtn.disabled).toBe(true);
  });

  it('Revoke All button becomes enabled when "REVOKE ALL" is typed exactly', () => {
    modal.show();
    const input = modal.shadowRoot!.getElementById('confirmInput') as HTMLInputElement;
    input.value = 'REVOKE ALL';
    input.dispatchEvent(new Event('input'));
    const revokeAllBtn = modal.shadowRoot!.getElementById('revokeAllBtn') as HTMLButtonElement;
    expect(revokeAllBtn.disabled).toBe(false);
  });

  it('clicking Revoke All dispatches revoke-all-sessions-confirmed and keeps the modal open for the page to close', () => {
    const events: CustomEvent[] = [];
    modal.addEventListener('revoke-all-sessions-confirmed', (e) => events.push(e as CustomEvent));

    modal.show();
    const input = modal.shadowRoot!.getElementById('confirmInput') as HTMLInputElement;
    input.value = 'REVOKE ALL';
    input.dispatchEvent(new Event('input'));
    modal.shadowRoot!.getElementById('revokeAllBtn')!.click();

    expect(events).toHaveLength(1);
    expect(modal.hasAttribute('open')).toBe(true);
  });

  it('Cancel button closes the modal without dispatching anything', () => {
    const events: CustomEvent[] = [];
    modal.addEventListener('revoke-all-sessions-confirmed', (e) => events.push(e as CustomEvent));

    modal.show();
    modal.shadowRoot!.getElementById('cancelBtn')!.dispatchEvent(new Event('click'));

    expect(modal.hasAttribute('open')).toBe(false);
    expect(events).toHaveLength(0);
  });

  it('clicking inside the modal card does not close the modal', () => {
    modal.show();
    const card = modal.shadowRoot!.querySelector('.modal__card') as HTMLElement;
    card.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(modal.hasAttribute('open')).toBe(true);
  });

  it('show() moves focus to the confirmation input', () => {
    modal.show();
    const input = modal.shadowRoot!.getElementById('confirmInput') as HTMLInputElement;
    expect(modal.shadowRoot!.activeElement).toBe(input);
  });

  it('closing the modal restores focus to the previously focused element', () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();

    modal.show();
    modal.shadowRoot!.getElementById('cancelBtn')!.dispatchEvent(new Event('click'));

    expect(document.activeElement).toBe(trigger);
    document.body.removeChild(trigger);
  });
});

describe('pm-revoke-all-sessions-modal — dismissal', { tags: ['390UC5'] }, () => {
  it('ignores Escape on the host and on the confirmation input', () => {
    const modal = document.createElement('pm-revoke-all-sessions-modal') as PmRevokeAllSessionsModal;
    document.body.appendChild(modal);
    const dispatched: Event[] = [];
    const original = modal.dispatchEvent.bind(modal);
    modal.dispatchEvent = (event: Event) => {
      dispatched.push(event);
      return original(event);
    };
    modal.show();
    const input = modal.shadowRoot!.getElementById('confirmInput') as HTMLInputElement;
    input.value = 'REVOKE';

    modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, composed: true }));

    expect(modal.hasAttribute('open')).toBe(true);
    expect(input.value).toBe('REVOKE');
    expect(dispatched.filter((event) => event.type !== 'keydown')).toEqual([]);
    document.body.removeChild(modal);
  });
});

describe('pm-revoke-all-sessions-modal — destructive template', { tags: ['392UC3'] }, () => {
  it('shows the delete icon and the cannot-be-undone body, with the phrase only in the field label', () => {
    const modal = new PmRevokeAllSessionsModal();
    document.body.appendChild(modal);
    modal.show();
    const root = modal.shadowRoot!;

    const icon = root.querySelector('.modal__header .modal__icon')!;
    expect(icon.textContent).toBe('delete_forever');
    expect(icon.getAttribute('aria-hidden')).toBe('true');
    expect(root.getElementById('modalTitle')!.textContent).toBe('Revoke All Sessions');

    const body = root.querySelector('.modal__body')!;
    expect((body.textContent ?? '').replace(/\s+/g, ' ').trim()).toBe(
      'This action cannot be undone. Every other session of every user will be ended. Those users must sign in again.',
    );
    expect(body.textContent).not.toContain('Type');
    expect(body.textContent).not.toContain('to confirm');
    expect(body.textContent).not.toContain('REVOKE ALL');

    const label = root.getElementById('confirmLabel') as HTMLLabelElement;
    expect(label.textContent).toBe('Type "REVOKE ALL" to confirm');
    expect(label.htmlFor).toBe('confirmInput');

    const button = root.getElementById('revokeAllBtn')!;
    expect(button.textContent).toBe('Revoke All');
    expect(button.classList.contains('modal__btn--destructive')).toBe(true);
    document.body.removeChild(modal);
  });
});

describe('pm-revoke-all-sessions-modal — typed gate', { tags: ['392UC4'] }, () => {
  it('stays disabled until the exact phrase is typed, then dispatches once', () => {
    const modal = new PmRevokeAllSessionsModal();
    document.body.appendChild(modal);
    const events: Event[] = [];
    modal.addEventListener('revoke-all-sessions-confirmed', (e) => events.push(e));
    modal.show();
    const input = modal.shadowRoot!.getElementById('confirmInput') as HTMLInputElement;
    const button = modal.shadowRoot!.getElementById('revokeAllBtn') as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    for (const value of ['', 'REVOKE', 'revoke all', 'Revoke All', ' REVOKE ALL', 'REVOKE ALL ']) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      expect(button.disabled).toBe(true);
    }

    input.value = 'REVOKE ALL';
    input.dispatchEvent(new Event('input'));
    expect(button.disabled).toBe(false);
    button.click();
    expect(events).toHaveLength(1);
    document.body.removeChild(modal);
  });
});
