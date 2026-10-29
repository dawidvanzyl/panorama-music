import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../pm-own-sessions-modal';
import type { PmOwnSessionsModal } from '../pm-own-sessions-modal';

describe('pm-own-sessions-modal — toolbar row instead of a footer', { tags: ['395UC1', '395UC2'] }, () => {
  let el: PmOwnSessionsModal;

  beforeEach(() => {
    el = document.createElement('pm-own-sessions-modal') as PmOwnSessionsModal;
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  const root = (): ShadowRoot => el.shadowRoot!;

  it('has no footer actions and no header icon', () => {
    expect(root().querySelector('.modal__actions')).toBeNull();
    expect(root().querySelector('[data-testid="modal-actions"]')).toBeNull();
    expect(root().querySelector('.modal__icon')).toBeNull();
    expect(root().querySelector('h2')!.textContent).toBe('Active Sessions');
  });

  it('offers a compact destructive Revoke All Others button in a toolbar directly above the table', () => {
    const button = root().getElementById('revokeAllBtn') as HTMLButtonElement;
    const table = root().getElementById('sessionsTable')!;
    const toolbar = button.parentElement!;

    expect(button.textContent!.trim()).toBe('Revoke All Others');
    expect(button.classList.contains('compact-btn')).toBe(true);
    expect(button.classList.contains('compact-btn--destructive')).toBe(true);
    expect(toolbar.classList.contains('own-sessions__toolbar')).toBe(true);
    expect(toolbar.nextElementSibling).toBe(table);
    expect(table.contains(button)).toBe(false);
  });

  it('asks for confirmation on click and does not emit a revoke request', () => {
    const clicked: Event[] = [];
    const requested: Event[] = [];
    el.addEventListener('own-sessions-revoke-all-clicked', (e) => clicked.push(e));
    el.addEventListener('own-sessions-revoke-all-requested', (e) => requested.push(e));

    (root().getElementById('revokeAllBtn') as HTMLButtonElement).click();

    expect(clicked).toHaveLength(1);
    expect(requested).toHaveLength(0);
  });
});
