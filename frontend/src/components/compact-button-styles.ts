import { buttonStateRules } from './button-states';

const compactButtonStyles = new CSSStyleSheet();
compactButtonStyles.replaceSync(`
    .compact-actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    .compact-actions-col {
      text-align: right;
      white-space: nowrap;
    }
    .compact-btn {
      box-sizing: border-box;
      height: 32px;
      padding: 0 12px;
      background: transparent;
      border: 1px solid var(--pm-accent);
      border-radius: var(--pm-radius);
      color: var(--pm-accent-text);
      font-family: inherit;
      font-size: 13px;
      font-weight: 600;
      line-height: 1;
    }
    .compact-btn:hover:not(:disabled) {
      background: var(--pm-accent-soft);
    }
    .compact-btn--destructive {
      border-color: var(--pm-danger);
      color: var(--pm-danger-text);
    }
    .compact-btn--destructive:hover:not(:disabled) {
      background: var(--pm-danger-soft);
    }
    .compact-btn--warning {
      border-color: var(--pm-warning);
      color: var(--pm-warning);
    }
    .compact-btn--warning:hover:not(:disabled) {
      background: var(--pm-warning-soft);
    }
    ${buttonStateRules('.compact-btn', ['.compact-btn--destructive'])}
    @media print {
      .compact-btn,
      .compact-actions,
      .compact-actions-col {
        display: none;
      }
    }
  `);

export { compactButtonStyles };
