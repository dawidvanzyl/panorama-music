import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PmAccountLinkPicker } from '../pm-account-link-picker';
import type { LinkableAccount } from '../../services/teachers';

const eligibleAccounts: LinkableAccount[] = [
  { accountId: 'acc-1', email: 'ada@test.com' },
  { accountId: 'acc-2', email: 'bela@test.com' },
];

describe('pm-account-link-picker — offered accounts', { tags: ['232UC9'] }, () => {
  let el: PmAccountLinkPicker;

  beforeEach(() => {
    el = new PmAccountLinkPicker();
    document.body.appendChild(el);
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('offers exactly the accounts the server ruled eligible, behind a placeholder', () => {
    el.accounts = eligibleAccounts;

    const options = [...el.shadowRoot!.querySelectorAll('option')];

    expect(options.map((o) => o.value)).toEqual(['', 'acc-1', 'acc-2']);
    expect(options.map((o) => o.textContent)).toEqual(['Select an account…', 'ada@test.com', 'bela@test.com']);
    expect(el.selectedAccountId).toBeNull();
  });

  it('reports the chosen account id, and nothing while the placeholder stands', () => {
    el.accounts = eligibleAccounts;
    const select = el.shadowRoot!.querySelector('select')!;

    select.value = 'acc-2';
    expect(el.selectedAccountId).toBe('acc-2');

    el.reset();
    expect(el.selectedAccountId).toBeNull();
  });
});
