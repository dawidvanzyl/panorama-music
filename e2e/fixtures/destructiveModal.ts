import type { Locator } from '@playwright/test';
import { expect } from './base';

export interface DestructiveWording {
  title: string;
  /** The whole visible body paragraph, whitespace collapsed. */
  body: string | RegExp;
  /** The accessible name of the one confirm button. */
  confirm: 'Delete' | 'Remove' | 'Withdraw';
}

/** The visible body paragraph. A guardian modal holds three, of which one shows. */
export function visibleBody(modal: Locator): Locator {
  return modal.locator('.modal__body').filter({ visible: true });
}

/** The header icon: its text is the icon ligature. */
export function headerIcon(modal: Locator): Locator {
  return modal.locator('.modal__header .modal__icon');
}

/**
 * The shared destructive template: the delete_forever icon hidden from
 * assistive technology, a heading title, one body paragraph, and one
 * destructive confirm button named by its verb alone, after Cancel.
 */
export async function expectDestructiveTemplate(modal: Locator, wording: DestructiveWording): Promise<void> {
  await expect(modal.locator('.modal__card')).toBeVisible();

  await expect(headerIcon(modal)).toHaveText('delete_forever');
  await expect(headerIcon(modal)).toHaveAttribute('aria-hidden', 'true');

  await expect(modal.getByRole('heading', { level: 2 })).toHaveCount(1);
  await expect(modal.getByRole('heading', { level: 2 })).toHaveText(wording.title);

  await expect(visibleBody(modal)).toHaveCount(1);
  await expect(visibleBody(modal)).toHaveText(wording.body);

  const confirm = modal.getByRole('button', { name: wording.confirm, exact: true });
  await expect(confirm).toHaveCount(1);
  await expect(confirm).toHaveClass(/modal__btn--destructive/);
  await expect(modal.getByTestId('modal-actions').getByRole('button')).toHaveText(['Cancel', wording.confirm]);
}

/** The element is a strong element and reads exactly this text. */
export async function expectBold(name: Locator, text: string): Promise<void> {
  await expect(name).toHaveJSProperty('tagName', 'STRONG');
  await expect(name).toHaveText(text);
}

/** Clicks Cancel and waits until the modal card is gone. */
export async function cancelModal(modal: Locator): Promise<void> {
  await modal.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(modal.locator('.modal__card')).toBeHidden();
}
