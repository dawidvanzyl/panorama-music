import { describe, it, expect } from 'vitest';
import { modalChromeStyles } from '../pm-modal-chrome-styles';
import { PmDeactivateUserModal } from '../../features/admin/components/pm-deactivate-user-modal';
import { PmDeleteUserModal } from '../../features/admin/components/pm-delete-user-modal';
import { PmRevokeAllSessionsModal } from '../../features/sessions/components/pm-revoke-all-sessions-modal';

const EXTRACTED_SELECTORS = ['.modal__backdrop', '.modal__card', '.modal__header', '.modal__icon', '.modal__title', '.modal__email', '.modal__actions', '.modal__btn'];

function localStyleSheetFor(shadowRoot: ShadowRoot): CSSStyleSheet {
  const [, localSheet] = shadowRoot.adoptedStyleSheets;
  return localSheet;
}

function selectorsIn(sheet: CSSStyleSheet): string[] {
  return Array.from(sheet.cssRules).map((rule) => (rule as CSSStyleRule).selectorText);
}

describe('shared modal-chrome stylesheet composition', { tags: ['162UC1'] }, () => {
  it.each([
    ['pm-deactivate-user-modal', () => new PmDeactivateUserModal()],
    ['pm-delete-user-modal', () => new PmDeleteUserModal()],
    ['pm-revoke-all-sessions-modal', () => new PmRevokeAllSessionsModal()],
  ])('%s adopts the shared modal-chrome stylesheet and keeps extracted selectors out of its local sheet', (_name, create) => {
    const modal = create();
    const shadowRoot = modal.shadowRoot!;

    expect(shadowRoot.adoptedStyleSheets).toContain(modalChromeStyles);

    const localSheet = localStyleSheetFor(shadowRoot);
    const localSelectors = selectorsIn(localSheet);

    for (const selector of EXTRACTED_SELECTORS) {
      expect(localSelectors).not.toContain(selector);
    }
  });
});
