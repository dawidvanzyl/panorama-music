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
});
