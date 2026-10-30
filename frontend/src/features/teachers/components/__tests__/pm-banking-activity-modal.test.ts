import { describe, it, expect, afterEach } from 'vitest';
import type { BankingActivityEntry } from '../../services/teachers';

import '../pm-banking-activity-modal';
import type { PmBankingActivityModal } from '../pm-banking-activity-modal';

const entries: BankingActivityEntry[] = [
  {
    occurredAt: '2026-08-08T09:30:00.000Z',
    eventType: 'teachers.banking_details.revealed',
    actorEmail: 'admin@panoramamusic.school',
    accountNumberLast4: '7890',
  },
  {
    occurredAt: '2026-08-07T14:05:00.000Z',
    eventType: 'teachers.banking_details.captured',
    actorEmail: 'coordinator@panoramamusic.school',
    accountNumberLast4: '7890',
  },
];

let element: PmBankingActivityModal | null = null;

afterEach(() => {
  if (element) document.body.removeChild(element);
  element = null;
});

describe('pm-banking-activity-modal — entries name the action, actor and last four', { tags: ['233UC16'] }, () => {
  it('renders one row per entry with no full account number present', () => {
    element = document.createElement('pm-banking-activity-modal') as PmBankingActivityModal;
    document.body.appendChild(element);
    element.show(entries);

    const rows = element.shadowRoot!.querySelectorAll('#rows tr');
    const firstRow = [...rows[0].querySelectorAll('td')].map((cell) => cell.textContent);

    expect(rows).toHaveLength(2);
    expect(firstRow[1]).toBe('Account number revealed');
    expect(firstRow[2]).toBe('admin@panoramamusic.school');
    expect(firstRow[3]).toBe('7890');
    expect(element.shadowRoot!.innerHTML).not.toContain('1234567890');
  });

  it('shows the empty state when nothing has been recorded', () => {
    element = document.createElement('pm-banking-activity-modal') as PmBankingActivityModal;
    document.body.appendChild(element);
    element.show([]);

    expect((element.shadowRoot!.getElementById('empty') as HTMLElement).hidden).toBe(false);
    expect(element.shadowRoot!.textContent).toContain('No banking activity recorded.');
  });
});

describe('pm-banking-activity-modal — no footer', { tags: ['390UC7'] }, () => {
  it('has no action row and its only button is the header close control', () => {
    element = document.createElement('pm-banking-activity-modal') as PmBankingActivityModal;
    document.body.appendChild(element);
    element.show(entries);
    const root = element.shadowRoot!;

    expect(root.querySelector('.form-actions')).toBeNull();
    expect(root.querySelector('.modal__actions')).toBeNull();
    const buttons = root.querySelectorAll('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0].id).toBe('closeBtn');
    expect(buttons[0].closest('.modal__header')).not.toBeNull();
  });
});
