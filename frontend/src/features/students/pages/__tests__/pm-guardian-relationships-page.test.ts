import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  createGuardianRelationship,
  renameGuardianRelationship,
  deleteGuardianRelationship,
  countGuardianRelationship,
  GuardiansError,
  type GuardianRelationship,
} from '../../services/guardians';

const mockGetGuardianRelationships = vi.fn();
vi.mock('../../services/guardians', async () => {
  const actual = await vi.importActual<typeof import('../../services/guardians')>('../../services/guardians');
  return {
    ...actual,
    getGuardianRelationships: () => mockGetGuardianRelationships(),
    createGuardianRelationship: vi.fn(),
    renameGuardianRelationship: vi.fn(),
    deleteGuardianRelationship: vi.fn(),
    countGuardianRelationship: vi.fn(),
  };
});

import '../pm-guardian-relationships-page';
import type { PmRelationshipList } from '../../components/pm-relationship-list';
import type { PmRelationshipForm } from '../../components/pm-relationship-form';
import type { PmDeleteRelationshipModal } from '../../components/pm-delete-relationship-modal';

const mother: GuardianRelationship = { guardianRelationshipId: 'r1', name: 'Mother' };
const father: GuardianRelationship = { guardianRelationshipId: 'r2', name: 'Father' };

const flush = (): Promise<void> => new Promise<void>((resolve) => setTimeout(resolve, 0));

async function mountPage(): Promise<HTMLElement> {
  const el = document.createElement('pm-guardian-relationships-page');
  document.body.appendChild(el);
  await flush();
  return el;
}

function listOf(el: HTMLElement): PmRelationshipList {
  return el.shadowRoot!.getElementById('list') as unknown as PmRelationshipList;
}

function formOf(el: HTMLElement): PmRelationshipForm {
  return el.shadowRoot!.getElementById('form') as unknown as PmRelationshipForm;
}

function nameInputOf(el: HTMLElement): HTMLInputElement {
  return formOf(el).shadowRoot!.getElementById('name') as HTMLInputElement;
}

/** Drives the real form controls so the input state after submit can be asserted. */
async function submitCreateForm(el: HTMLElement, name: string): Promise<void> {
  nameInputOf(el).value = name;
  formOf(el).shadowRoot!.getElementById('saveBtn')!.dispatchEvent(new MouseEvent('click'));
  await flush();
}

function deleteModalOf(el: HTMLElement): PmDeleteRelationshipModal {
  return el.shadowRoot!.getElementById('deleteModal') as unknown as PmDeleteRelationshipModal;
}

function clickDeleteOn(el: HTMLElement, relationship: GuardianRelationship): void {
  el.shadowRoot!.dispatchEvent(
    new CustomEvent('relationship-delete-clicked', {
      bubbles: true,
      composed: true,
      detail: { relationship },
    }),
  );
}

/** Clicks Delete on the row, waits for the in-use check, then confirms in the modal. */
async function confirmDeleteOf(el: HTMLElement, relationship: GuardianRelationship): Promise<void> {
  clickDeleteOn(el, relationship);
  await flush();
  deleteModalOf(el).shadowRoot!.getElementById('deleteBtn')!.dispatchEvent(new MouseEvent('click'));
}

function errorBannerOf(el: HTMLElement): HTMLElement {
  return el.shadowRoot!.getElementById('error') as HTMLElement;
}

function rowNamesOf(el: HTMLElement): string[] {
  const rows = listOf(el).shadowRoot!.querySelectorAll('tbody tr');
  return [...rows].map((row) => row.querySelector('td')!.textContent ?? '');
}

beforeEach(() => {
  mockGetGuardianRelationships.mockReset();
  mockGetGuardianRelationships.mockResolvedValue([mother, father]);
  vi.mocked(createGuardianRelationship).mockReset();
  vi.mocked(renameGuardianRelationship).mockReset();
  vi.mocked(deleteGuardianRelationship).mockReset();
  vi.mocked(countGuardianRelationship).mockReset();
  vi.mocked(countGuardianRelationship).mockResolvedValue({ count: 0 });
});

describe('pm-guardian-relationships-page — loads the relationship types on page load', { tags: ['214UC7'] }, () => {
  let el: HTMLElement;

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('fetches and displays the current relationship types', async () => {
    el = await mountPage();

    expect(mockGetGuardianRelationships).toHaveBeenCalledTimes(1);
    expect(rowNamesOf(el)).toEqual(['Mother', 'Father']);
  });
});

describe('pm-guardian-relationships-page — creates a relationship type', { tags: ['214UC8'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('submits the create form and shows the new type in the list', async () => {
    const created: GuardianRelationship = { guardianRelationshipId: 'r3', name: 'Foster Parent' };
    vi.mocked(createGuardianRelationship).mockResolvedValue(created);
    mockGetGuardianRelationships.mockResolvedValue([mother, father, created]);

    el.shadowRoot!.dispatchEvent(
      new CustomEvent('relationship-form-submitted', {
        bubbles: true,
        composed: true,
        detail: { name: 'Foster Parent' },
      }),
    );
    await flush();

    expect(createGuardianRelationship).toHaveBeenCalledWith('Foster Parent');
    expect(rowNamesOf(el)).toContain('Foster Parent');
    expect(formOf(el).hidden).toBe(false);
  });
});

describe('pm-guardian-relationships-page — opens with the create form ready', { tags: ['240UC1'] }, () => {
  let el: HTMLElement;

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('renders the create form on load with no reveal or cancel control', async () => {
    el = await mountPage();

    const form = formOf(el);
    expect(form.hidden).toBe(false);
    expect(el.shadowRoot!.getElementById('createBtn')).toBeNull();
    expect(form.shadowRoot!.getElementById('cancelBtn')).toBeNull();
  });
});

describe('pm-guardian-relationships-page — keeps the create form ready after a create', { tags: ['240UC2'] }, () => {
  let el: HTMLElement;

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('clears the input and leaves the form in place once the type is created', async () => {
    const created: GuardianRelationship = { guardianRelationshipId: 'r3', name: 'Foster Parent' };
    vi.mocked(createGuardianRelationship).mockResolvedValue(created);
    el = await mountPage();
    mockGetGuardianRelationships.mockResolvedValue([mother, father, created]);

    await submitCreateForm(el, 'Foster Parent');

    expect(createGuardianRelationship).toHaveBeenCalledWith('Foster Parent');
    expect(rowNamesOf(el)).toContain('Foster Parent');
    expect(formOf(el).hidden).toBe(false);
    expect(nameInputOf(el).value).toBe('');
  });
});

describe('pm-guardian-relationships-page — keeps the entered value after a failed create', { tags: ['240UC3'] }, () => {
  let el: HTMLElement;

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('shows the error and leaves the typed name in the form for correction', async () => {
    vi.mocked(createGuardianRelationship).mockRejectedValue(
      new GuardiansError("Guardian relationship 'Mother' already exists.", 400),
    );
    el = await mountPage();

    await submitCreateForm(el, 'Mother');

    expect(errorBannerOf(el).textContent).toContain('already exists');
    expect(formOf(el).hidden).toBe(false);
    expect(nameInputOf(el).value).toBe('Mother');
  });
});

describe('pm-guardian-relationships-page — renames a relationship type', { tags: ['214UC9'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('saves an inline edit and reflects the updated name in the list', async () => {
    const renamed: GuardianRelationship = { guardianRelationshipId: 'r2', name: 'Stepfather' };
    vi.mocked(renameGuardianRelationship).mockResolvedValue(renamed);
    mockGetGuardianRelationships.mockResolvedValue([mother, renamed]);

    el.shadowRoot!.dispatchEvent(
      new CustomEvent('relationship-edit-saved', {
        bubbles: true,
        composed: true,
        detail: { guardianRelationshipId: 'r2', name: 'Stepfather' },
      }),
    );
    await flush();

    expect(renameGuardianRelationship).toHaveBeenCalledWith('r2', 'Stepfather');
    expect(rowNamesOf(el)).toEqual(['Mother', 'Stepfather']);
  });
});

describe('pm-guardian-relationships-page — blocks deleting a type in use', { tags: ['214UC10'] }, () => {
  let el: HTMLElement;

  beforeEach(async () => {
    el = await mountPage();
  });

  afterEach(() => {
    document.body.removeChild(el);
  });

  it('never opens the confirmation modal for a type that is in use', async () => {
    vi.mocked(countGuardianRelationship).mockResolvedValue({ count: 1 });

    clickDeleteOn(el, mother);
    await flush();

    expect(deleteModalOf(el).hasAttribute('open')).toBe(false);
    expect(deleteGuardianRelationship).not.toHaveBeenCalled();
    // The count comes back from the server and is named in the message, so the
    // user is told how many guardians are holding the type.
    expect(errorBannerOf(el).textContent).toContain('cannot be deleted');
    expect(errorBannerOf(el).textContent).toContain('1 guardian(s)');
    expect(rowNamesOf(el)).toContain('Mother');
  });

  it('surfaces the server rejection if a guardian is assigned after the check', async () => {
    vi.mocked(deleteGuardianRelationship).mockRejectedValue(
      new GuardiansError("Guardian relationship 'Mother' is assigned to 2 guardian(s) and cannot be deleted.", 400),
    );

    await confirmDeleteOf(el, mother);
    await flush();

    expect(errorBannerOf(el).textContent).toContain('cannot be deleted');
    expect(rowNamesOf(el)).toContain('Mother');
  });

  it('cancelling the confirmation modal deletes nothing', async () => {
    clickDeleteOn(el, father);
    await flush();
    deleteModalOf(el).shadowRoot!.getElementById('cancelBtn')!.dispatchEvent(new MouseEvent('click'));
    await flush();

    expect(deleteGuardianRelationship).not.toHaveBeenCalled();
    expect(rowNamesOf(el)).toEqual(['Mother', 'Father']);
  });

  it('removes a type that is not in use', async () => {
    vi.mocked(deleteGuardianRelationship).mockResolvedValue(undefined);
    mockGetGuardianRelationships.mockResolvedValue([mother]);

    await confirmDeleteOf(el, father);
    await flush();

    expect(deleteGuardianRelationship).toHaveBeenCalledWith('r2');
    expect(rowNamesOf(el)).toEqual(['Mother']);
  });
});
