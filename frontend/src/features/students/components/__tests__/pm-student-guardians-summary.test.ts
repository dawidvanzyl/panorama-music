import { describe, it, expect } from 'vitest';
import { PmStudentGuardiansSummary } from '../pm-student-guardians-summary';
import type { GuardianResult } from '../../services/guardians';

const motherRelationship = { guardianRelationshipId: 'gr1', name: 'Mother' };

function guardian(overrides: Partial<GuardianResult> = {}): GuardianResult {
  return {
    guardianId: 'g1',
    guardianRelationshipId: 'gr1',
    firstName: 'Sarah',
    surname: 'van Zyl',
    cell: '082 555 0101',
    email: 'sarah.vanzyl@example.com',
    receivesCorrespondence: true,
    responsibleForPayment: true,
    married: true,
    ...overrides,
  };
}

function mount(guardians: GuardianResult[]): PmStudentGuardiansSummary {
  const summary = new PmStudentGuardiansSummary();
  document.body.appendChild(summary);
  summary.relationships = [motherRelationship];
  summary.guardians = guardians;
  return summary;
}

describe('pm-student-guardians-summary guardian blocks', { tags: ['212UC20'] }, () => {
  it('renders each guardian as its own block with heading, contact, and flag lines', () => {
    const summary = mount([guardian(), guardian({ guardianId: 'g2', firstName: 'Pieter' })]);

    const items = summary.shadowRoot!.querySelectorAll('.summary__item');
    expect(items).toHaveLength(2);

    const first = items[0];
    expect(first.querySelector('.summary__item-heading')!.textContent).toBe('Sarah van Zyl · Mother');
    expect(first.querySelector('.summary__item-contact')!.textContent).toBe('082 555 0101 · sarah.vanzyl@example.com');
    expect(first.querySelector('.summary__item-flags')!.textContent).toBe('Correspondence, Payment, Married');

    document.body.removeChild(summary);
  });

  it('renders the email as a mailto link', () => {
    const summary = mount([guardian()]);

    const link = summary.shadowRoot!.querySelector('.summary__item-email') as HTMLAnchorElement;
    expect(link.tagName).toBe('A');
    expect(link.getAttribute('href')).toBe('mailto:sarah.vanzyl@example.com');
    expect(link.textContent).toBe('sarah.vanzyl@example.com');

    document.body.removeChild(summary);
  });

  it('lists only the flags that are set, and omits the flag line entirely when none are', () => {
    const summary = mount([guardian({ receivesCorrespondence: false, responsibleForPayment: true, married: false })]);
    expect(summary.shadowRoot!.querySelector('.summary__item-flags')!.textContent).toBe('Payment');

    summary.guardians = [guardian({ receivesCorrespondence: false, responsibleForPayment: false, married: false })];
    expect(summary.shadowRoot!.querySelector('.summary__item-flags')).toBeNull();

    document.body.removeChild(summary);
  });

  it('omits the contact line when the guardian has neither a cell nor an email', () => {
    const summary = mount([guardian({ cell: null, email: null })]);

    expect(summary.shadowRoot!.querySelector('.summary__item-contact')).toBeNull();
    expect(summary.shadowRoot!.querySelector('.summary__item-heading')!.textContent).toBe('Sarah van Zyl · Mother');

    document.body.removeChild(summary);
  });

  it('drops the separator when only one contact detail is present', () => {
    const cellOnly = mount([guardian({ email: null })]);
    expect(cellOnly.shadowRoot!.querySelector('.summary__item-contact')!.textContent).toBe('082 555 0101');
    document.body.removeChild(cellOnly);

    const emailOnly = mount([guardian({ cell: null })]);
    expect(emailOnly.shadowRoot!.querySelector('.summary__item-contact')!.textContent).toBe('sarah.vanzyl@example.com');
    document.body.removeChild(emailOnly);
  });
});
