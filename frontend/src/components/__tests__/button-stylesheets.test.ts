/// <reference types="vite/client" />
import { describe, expect, it } from 'vitest';
import { modalChromeStyles } from '../modal-chrome-styles';
import { formButtonStyles } from '../form-button-styles';
import { compactButtonStyles } from '../compact-button-styles';
import { pageButtonStyles } from '../page-button-styles';
import globalCss from '../../styles/global.css?raw';

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

describe('the page button stylesheet keeps a hidden page button hidden', { tags: ['381UC13'] }, () => {
  it('has a .page-btn[hidden] rule with display none', () => {
    const rule = Array.from(pageButtonStyles.cssRules).find(
      (candidate): candidate is CSSStyleRule =>
        'selectorText' in candidate && candidate.selectorText === '.page-btn[hidden]',
    );

    expect(rule?.style.display).toBe('none');
  });
});

function findRule(sheet: CSSStyleSheet, selector: string): CSSStyleRule | undefined {
  return Array.from(sheet.cssRules).find(
    (candidate): candidate is CSSStyleRule => 'selectorText' in candidate && candidate.selectorText === selector,
  );
}

function ruleIndex(sheet: CSSStyleSheet, selector: string): number {
  return Array.from(sheet.cssRules).findIndex(
    (candidate) => 'selectorText' in candidate && (candidate as CSSStyleRule).selectorText === selector,
  );
}

describe('the form stylesheet has a warning variant', { tags: ['387UC1'] }, () => {
  it('reads the warning token for the border and the text, and the soft token on hover', () => {
    const rule = findRule(formButtonStyles, '.form-btn--warning');
    const hover = findRule(formButtonStyles, '.form-btn--warning:hover:not(:disabled)');

    expect(rule?.style.borderColor).toBe('var(--pm-warning)');
    expect(rule?.style.color).toBe('var(--pm-warning)');
    expect(hover?.style.background).toBe('var(--pm-warning-soft)');
  });

  it('declares the warning rules after the secondary rules so they win', () => {
    const secondary = ruleIndex(formButtonStyles, '.form-btn--secondary:hover:not(:disabled)');

    expect(ruleIndex(formButtonStyles, '.form-btn--warning')).toBeGreaterThan(secondary);
    expect(ruleIndex(formButtonStyles, '.form-btn--warning:hover:not(:disabled)')).toBeGreaterThan(secondary);
  });
});

describe('the compact stylesheet has a warning variant', { tags: ['387UC2'] }, () => {
  it('reads the warning token for the border and the text, and the soft token on hover', () => {
    const rule = findRule(compactButtonStyles, '.compact-btn--warning');
    const hover = findRule(compactButtonStyles, '.compact-btn--warning:hover:not(:disabled)');

    expect(rule?.style.borderColor).toBe('var(--pm-warning)');
    expect(rule?.style.color).toBe('var(--pm-warning)');
    expect(hover?.style.background).toBe('var(--pm-warning-soft)');
  });

  it('declares the warning rules after the base rules so they win', () => {
    const base = ruleIndex(compactButtonStyles, '.compact-btn:hover:not(:disabled)');

    expect(ruleIndex(compactButtonStyles, '.compact-btn--warning')).toBeGreaterThan(base);
    expect(ruleIndex(compactButtonStyles, '.compact-btn--warning:hover:not(:disabled)')).toBeGreaterThan(base);
  });
});

describe('the base compact button keeps the accent colour', { tags: ['387UC3'] }, () => {
  it('reads the accent token for the border and the accent text token for the text', () => {
    const rule = findRule(compactButtonStyles, '.compact-btn');

    expect(rule?.style.border).toBe('1px solid var(--pm-accent)');
    expect(rule?.style.color).toBe('var(--pm-accent-text)');
  });
});

describe('modal and page button sheets do not read the warning token', { tags: ['387UC4'] }, () => {
  it.each([
    ['modalChromeStyles', modalChromeStyles],
    ['pageButtonStyles', pageButtonStyles],
  ] as const)('%s has no rule that reads --pm-warning', (_name, sheet) => {
    const text = Array.from(sheet.cssRules)
      .map((rule) => rule.cssText)
      .join('\n');

    expect(text).not.toContain('--pm-warning');
  });
});

describe('the warning token has a print value and its buttons stay hidden', { tags: ['387UC5'] }, () => {
  const printStart = globalCss.indexOf('@media print');
  const screenCss = globalCss.slice(0, printStart);
  const printCss = globalCss.slice(printStart);

  it('declares the screen value in the base root block', () => {
    expect(screenCss).toMatch(/--pm-warning:\s*#ffb305;/);
  });

  it('declares the print value in the root block inside the print media rule', () => {
    expect(printCss).toMatch(/:root\s*\{[^}]*--pm-warning:\s*#946200;/);
  });

  it('hides the base button classes that every warning button carries', () => {
    const formSelectors = printRules(formButtonStyles).flatMap((rule) =>
      rule.selectorText.split(',').map((selector) => selector.trim()),
    );
    const compactSelectors = printRules(compactButtonStyles).flatMap((rule) =>
      rule.selectorText.split(',').map((selector) => selector.trim()),
    );

    expect(formSelectors).toContain('.form-btn');
    expect(compactSelectors).toContain('.compact-btn');
    expect([...formSelectors, ...compactSelectors].some((selector) => selector.includes('--warning'))).toBe(false);
  });
});
