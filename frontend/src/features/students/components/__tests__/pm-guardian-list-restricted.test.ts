import { describe, it, expect } from 'vitest';
import { PmGuardianList, RESTRICTED_GUARDIAN_MESSAGE } from '../pm-guardian-list';
import type { GuardianListItem } from '../pm-guardian-list';

const relationships = [{ guardianRelationshipId: 'gr1', name: 'Mother' }];

function guardian(overrides: Partial<GuardianListItem> = {}): GuardianListItem {
  return {
    guardianId: 'g1',
    guardianRelationshipId: 'gr1',
    firstName: 'Nomvula',
    surname: 'Dube',
    cell: '0821234567',
    email: 'nomvula@example.com',
    receivesCorrespondence: true,
    responsibleForPayment: true,
    married: false,
    restricted: false,
    ...overrides,
  };
}

function mount(guardians: GuardianListItem[]): PmGuardianList {
  const list = new PmGuardianList();
  document.body.appendChild(list);
  list.relationships = relationships;
  list.isPersisted = true;
  list.guardians = guardians;
  return list;
}

function rowButtons(list: PmGuardianList): HTMLButtonElement[] {
  return Array.from(list.shadowRoot!.querySelectorAll('#rows button'));
}

function infoIcon(list: PmGuardianList): HTMLButtonElement | null {
  return list.shadowRoot!.querySelector('#rows .guardian-list__info');
}

describe('pm-guardian-list restricted guardians', { tags: ['300UC8', '300UC9', '300UC10', '300UC11'] }, () => {
  it('offers no edit affordance and shows an information affordance in its place', { tags: ['300UC8'] }, () => {
    const list = mount([guardian({ restricted: true })]);

    const labels = rowButtons(list).map((button) => button.textContent);
    expect(labels).not.toContain('Edit');
    expect(labels).not.toContain('Change');
    expect(infoIcon(list)).not.toBeNull();
    // The row itself stays uncluttered; the icon carries the wording.
    expect(list.shadowRoot!.getElementById('rows')!.textContent).not.toContain(RESTRICTED_GUARDIAN_MESSAGE);
  });

  it('states why the guardian is not maintainable when the affordance is activated', { tags: ['300UC9'] }, () => {
    const list = mount([guardian({ restricted: true })]);

    const icon = infoIcon(list)!;
    // Resting on the icon is the activation: the reason rides on the icon
    // itself rather than expanding into the row.
    expect(icon.title).toBe(RESTRICTED_GUARDIAN_MESSAGE);
    expect(icon.getAttribute('aria-label')).toBe(RESTRICTED_GUARDIAN_MESSAGE);
    expect(icon.title).toContain('shared with an enrolled student');
    expect(icon.title).toContain('not maintainable here');
  });

  it('still offers the unlink action', { tags: ['300UC10'] }, () => {
    const list = mount([guardian({ restricted: true })]);

    const deleteButton = rowButtons(list).find((button) => button.textContent === 'Delete');
    expect(deleteButton).toBeDefined();
    expect(deleteButton!.disabled).toBe(false);

    let requested: GuardianListItem | null = null;
    list.addEventListener('guardian-delete-clicked', (event) => {
      requested = (event as CustomEvent<{ guardian: GuardianListItem }>).detail.guardian;
    });
    deleteButton!.click();

    expect(requested).not.toBeNull();
    expect(requested!.guardianId).toBe('g1');
  });

  it('leaves an unrestricted guardian fully maintainable with no information affordance', { tags: ['300UC11'] }, () => {
    const list = mount([guardian({ restricted: false })]);

    const labels = rowButtons(list).map((button) => button.textContent);
    expect(labels).toContain('Edit');
    expect(labels).toContain('Delete');
    expect(infoIcon(list)).toBeNull();
    expect(list.shadowRoot!.textContent).not.toContain(RESTRICTED_GUARDIAN_MESSAGE);
  });

  it('restricts per guardian, not per student', { tags: ['300UC8', '300UC11'] }, () => {
    const list = mount([
      guardian({ guardianId: 'shared', restricted: true }),
      guardian({ guardianId: 'private', restricted: false }),
    ]);

    const rows = Array.from(list.shadowRoot!.querySelectorAll('#rows tr'));
    expect(rows).toHaveLength(2);

    const [restrictedRow, unrestrictedRow] = rows;
    expect(restrictedRow.querySelector('.guardian-list__info')).not.toBeNull();
    expect(unrestrictedRow.querySelector('.guardian-list__info')).toBeNull();
    expect(Array.from(unrestrictedRow.querySelectorAll('button')).map((button) => button.textContent)).toContain(
      'Edit',
    );
  });
});
