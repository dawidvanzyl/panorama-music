import { describe, it, expect } from 'vitest';
import { PmSiblingsStep } from '../pm-siblings-step';
import { PmSiblingList } from '../pm-sibling-list';

function localStyleSheetFor(shadowRoot: ShadowRoot): CSSStyleSheet {
  const [localSheet] = shadowRoot.adoptedStyleSheets;
  return localSheet;
}

function ruleFor(sheet: CSSStyleSheet, selector: string): CSSStyleRule {
  const rule = Array.from(sheet.cssRules).find((r) => (r as CSSStyleRule).selectorText === selector);
  if (!rule) throw new Error(`No rule found for selector ${selector}`);
  return rule as CSSStyleRule;
}

describe('pm-siblings-step internal scroll layout', { tags: ['207UC3'] }, () => {
  it('lets the sibling list flex to fill the step while the section stretches to the full step height', () => {
    const step = new PmSiblingsStep();
    const localSheet = localStyleSheetFor(step.shadowRoot!);

    const sectionRule = ruleFor(localSheet, '.siblings-step__section--visible');
    expect(sectionRule.style.getPropertyValue('flex')).toBe('1 1 0%');
    expect(sectionRule.style.getPropertyValue('min-height')).toBe('0px');

    const listRule = ruleFor(localSheet, 'pm-sibling-list');
    expect(listRule.style.getPropertyValue('flex')).toBe('1 1 0%');
    expect(listRule.style.getPropertyValue('min-height')).toBe('0px');
  });

  it('gives pm-sibling-list its own internal scroll container instead of growing unbounded', () => {
    const list = new PmSiblingList();
    const [localSheet] = list.shadowRoot!.adoptedStyleSheets;

    const scrollRule = ruleFor(localSheet, '.sibling-list__scroll');
    expect(scrollRule.style.getPropertyValue('overflow-y')).toBe('auto');
    expect(scrollRule.style.getPropertyValue('flex')).toBe('1 1 0%');
  });
});

describe('pm-siblings-step keeps search/add pinned above the scrolling list', { tags: ['207UC4'] }, () => {
  it('marks the search-select as non-shrinking so it never scrolls out of view with the list', () => {
    const step = new PmSiblingsStep();
    const localSheet = localStyleSheetFor(step.shadowRoot!);

    const searchRule = ruleFor(localSheet, 'pm-student-search-select');
    expect(searchRule.style.getPropertyValue('flex-shrink')).toBe('0');
  });
});
