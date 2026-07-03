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

  it('clicking Revoke All dispatches revoke-all-sessions-confirmed and closes the modal', () => {
    const events: CustomEvent[] = [];
    modal.addEventListener('revoke-all-sessions-confirmed', (e) => events.push(e as CustomEvent));

    modal.show();
    const input = modal.shadowRoot!.getElementById('confirmInput') as HTMLInputElement;
    input.value = 'REVOKE ALL';
    input.dispatchEvent(new Event('input'));
    modal.shadowRoot!.getElementById('revokeAllBtn')!.click();

    expect(events).toHaveLength(1);
    expect(modal.hasAttribute('open')).toBe(false);
  });

  it('Cancel button closes the modal without dispatching anything', () => {
    const events: CustomEvent[] = [];
    modal.addEventListener('revoke-all-sessions-confirmed', (e) => events.push(e as CustomEvent));

    modal.show();
    modal.shadowRoot!.getElementById('cancelBtn')!.dispatchEvent(new Event('click'));

    expect(modal.hasAttribute('open')).toBe(false);
    expect(events).toHaveLength(0);
  });

  it('pressing Escape closes the modal', () => {
    modal.show();
    modal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(modal.hasAttribute('open')).toBe(false);
  });

  it('clicking the backdrop closes the modal', () => {
    modal.show();
    const backdrop = modal.shadowRoot!.getElementById('backdrop') as HTMLElement;
    backdrop.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(modal.hasAttribute('open')).toBe(false);
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
