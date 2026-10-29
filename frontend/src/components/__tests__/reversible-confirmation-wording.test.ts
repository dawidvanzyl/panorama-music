import { afterEach, describe, expect, it } from 'vitest';
import '../../features/teachers/components/pm-unlink-account-modal';
import '../../features/admin/components/pm-deactivate-user-modal';

function mount(tag: string, ...args: unknown[]): HTMLElement {
  const modal = document.createElement(tag);
  document.body.appendChild(modal);
  (modal as unknown as { show: (...a: unknown[]) => void }).show(...args);
  return modal;
}

function root(modal: HTMLElement): ShadowRoot {
  return modal.shadowRoot!;
}

function collapse(text: string | null | undefined): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

function title(modal: HTMLElement): string {
  return collapse(root(modal).getElementById('modalTitle')!.textContent);
}

function icon(modal: HTMLElement): HTMLElement {
  return root(modal).querySelector<HTMLElement>('.modal__header .modal__icon')!;
}

function body(modal: HTMLElement): HTMLElement {
  return root(modal).querySelector<HTMLElement>('.modal__body')!;
}

function strongTexts(modal: HTMLElement): string[] {
  return Array.from(body(modal).querySelectorAll('strong')).map((s) => collapse(s.textContent));
}

function actionRow(modal: HTMLElement): Element {
  return root(modal).querySelector('[data-testid="modal-actions"]')!;
}

function expectReversibleIcon(modal: HTMLElement): void {
  expect(icon(modal).textContent).toBe('info');
  expect(icon(modal).classList.contains('modal__icon--reversible')).toBe(true);
  expect(icon(modal).getAttribute('aria-hidden')).toBe('true');
}

function expectPrimaryConfirm(modal: HTMLElement, id: string, label: string): void {
  const confirm = root(modal).getElementById(id) as HTMLButtonElement;
  const cancel = root(modal).getElementById('cancelBtn') as HTMLButtonElement;

  expect(confirm.textContent).toBe(label);
  expect(confirm.classList.contains('modal__btn--primary')).toBe(true);
  expect(confirm.classList.contains('modal__btn--destructive')).toBe(false);
  expect(Array.from(actionRow(modal).children)).toEqual([cancel, confirm]);
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('pm-unlink-account-modal — wording', { tags: ['393UC1'] }, () => {
  it('uses the reversible family and says the account can be linked again', () => {
    const modal = mount('pm-unlink-account-modal', 't@b.com');

    expectReversibleIcon(modal);
    expect(title(modal)).toBe('Unlink Account');
    expect(collapse(body(modal).textContent)).toBe(
      "t@b.com will be unlinked from this teacher. The teacher loses self-service access to this profile and its banking details. The teacher record and the account's Teacher role stay. You can link it again later.",
    );
    expect(strongTexts(modal)).toEqual(['t@b.com']);
    expect(body(modal).querySelector('br')).toBeNull();
    expect(collapse(body(modal).textContent)).not.toContain('cannot be undone');
  });

  it('names the account generically when no email is known', () => {
    const modal = mount('pm-unlink-account-modal', null);

    expect(strongTexts(modal)).toEqual(['This account']);
  });
});

describe('pm-unlink-account-modal — confirm action', { tags: ['393UC2'] }, () => {
  it('confirms with the primary Unlink button', () => {
    expectPrimaryConfirm(mount('pm-unlink-account-modal', 't@b.com'), 'unlinkBtn', 'Unlink');
  });
});

describe('pm-deactivate-user-modal — wording', { tags: ['393UC3'] }, () => {
  it('uses the reversible family and says the user can be reactivated', () => {
    const modal = mount('pm-deactivate-user-modal', 'u1', 'a@b.com');

    expectReversibleIcon(modal);
    expect(title(modal)).toBe('Deactivate User');
    expect(collapse(body(modal).textContent)).toBe(
      'The user a@b.com will be deactivated. They can no longer sign in. You can reactivate this user later.',
    );
    expect(strongTexts(modal)).toEqual(['a@b.com']);
    expect(collapse(body(modal).textContent).startsWith('Are you sure')).toBe(false);
    expect(collapse(body(modal).textContent)).not.toContain('cannot be undone');
  });
});

describe('pm-deactivate-user-modal — confirm action', { tags: ['393UC4'] }, () => {
  it('confirms with the primary Deactivate button', () => {
    expectPrimaryConfirm(mount('pm-deactivate-user-modal', 'u1', 'a@b.com'), 'deactivateBtn', 'Deactivate');
  });
});
