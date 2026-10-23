import { describe, expect, it } from 'vitest';
import { modalChromeStyles } from '../modal-chrome-styles';
import { formButtonStyles } from '../form-button-styles';
import { compactButtonStyles } from '../compact-button-styles';
import { pageButtonStyles } from '../page-button-styles';

const sheets: Array<[string, CSSStyleSheet, string, string]> = [
  ['modalChromeStyles', modalChromeStyles, '.modal__btn', '.modal__actions'],
  ['formButtonStyles', formButtonStyles, '.form-btn', '.form-actions'],
  ['compactButtonStyles', compactButtonStyles, '.compact-btn', '.compact-actions'],
  ['pageButtonStyles', pageButtonStyles, '.page-btn', '.page-actions'],
];

function printRules(sheet: CSSStyleSheet): CSSStyleRule[] {
  return Array.from(sheet.cssRules)
    .filter((rule): rule is CSSMediaRule => 'media' in rule && (rule as CSSMediaRule).media.mediaText === 'print')
    .flatMap((rule) => Array.from(rule.cssRules) as CSSStyleRule[]);
}

describe('the compact stylesheet hides the Actions column in print', { tags: ['380UC12'] }, () => {
  it('lists the column class beside the button and action-row classes in its print rule', () => {
    const hidden = printRules(compactButtonStyles).filter((rule) => rule.style.display === 'none');
    const selectors = hidden.flatMap((rule) => rule.selectorText.split(',').map((selector) => selector.trim()));

    expect(selectors).toEqual(expect.arrayContaining(['.compact-btn', '.compact-actions', '.compact-actions-col']));
  });

  it('right-aligns the Actions column on screen', () => {
    const rule = Array.from(compactButtonStyles.cssRules).find(
      (candidate): candidate is CSSStyleRule =>
        'selectorText' in candidate && candidate.selectorText === '.compact-actions-col',
    );

    expect(rule?.style.textAlign).toBe('right');
  });
});

describe('button stylesheets hide buttons and action rows in print', { tags: ['377UC5'] }, () => {
  it.each(sheets)('%s hides its button class and its action-row class', (_name, sheet, buttonClass, rowClass) => {
    const hidden = printRules(sheet).filter((rule) => rule.style.display === 'none');
    const selectors = hidden.flatMap((rule) => rule.selectorText.split(',').map((selector) => selector.trim()));

    expect(selectors).toContain(buttonClass);
    expect(selectors).toContain(rowClass);
  });
});
