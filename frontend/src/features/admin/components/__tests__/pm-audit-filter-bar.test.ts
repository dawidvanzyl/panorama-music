import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PmAuditFilterBar, type AuditFilterValues } from '../pm-audit-filter-bar';

describe('pm-audit-filter-bar — date range conversion', { tags: ['M1.5UC16'] }, () => {
  let bar: PmAuditFilterBar;

  beforeEach(() => {
    bar = new PmAuditFilterBar();
    document.body.appendChild(bar);
  });

  afterEach(() => {
    document.body.removeChild(bar);
  });

  it('converts the picked from/to dates to local start-of-day/end-of-day UTC instants on Apply', () => {
    const events: CustomEvent<AuditFilterValues>[] = [];
    bar.addEventListener('audit-filter-changed', (e) => events.push(e as CustomEvent<AuditFilterValues>));

    const fromInput = bar.shadowRoot!.getElementById('from') as HTMLInputElement;
    const toInput = bar.shadowRoot!.getElementById('to') as HTMLInputElement;
    fromInput.value = '2026-03-05';
    toInput.value = '2026-03-07';
    bar.shadowRoot!.getElementById('applyBtn')!.dispatchEvent(new Event('click'));

    expect(events).toHaveLength(1);
    // Computed the same way the component computes it (local Date getters),
    // rather than a hardcoded UTC offset, so this passes regardless of the
    // timezone the test runner happens to be in.
    const expectedFrom = new Date(2026, 2, 5, 0, 0, 0, 0).toISOString();
    const expectedTo = new Date(2026, 2, 7, 23, 59, 59, 999).toISOString();
    expect(events[0].detail.from).toBe(expectedFrom);
    expect(events[0].detail.to).toBe(expectedTo);
  });

  it('emits empty from/to (not an invalid date conversion) when the date fields are blank', () => {
    const events: CustomEvent<AuditFilterValues>[] = [];
    bar.addEventListener('audit-filter-changed', (e) => events.push(e as CustomEvent<AuditFilterValues>));

    bar.shadowRoot!.getElementById('applyBtn')!.dispatchEvent(new Event('click'));

    expect(events).toHaveLength(1);
    expect(events[0].detail.from).toBe('');
    expect(events[0].detail.to).toBe('');
  });

  it('Clear resets the date fields and emits empty from/to', () => {
    const events: CustomEvent<AuditFilterValues>[] = [];
    bar.addEventListener('audit-filter-changed', (e) => events.push(e as CustomEvent<AuditFilterValues>));

    const fromInput = bar.shadowRoot!.getElementById('from') as HTMLInputElement;
    fromInput.value = '2026-03-05';
    bar.shadowRoot!.getElementById('clearBtn')!.dispatchEvent(new Event('click'));

    expect(events).toHaveLength(1);
    expect(events[0].detail.from).toBe('');
    expect(events[0].detail.to).toBe('');
  });
});
