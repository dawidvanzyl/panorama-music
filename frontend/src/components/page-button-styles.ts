import { buttonStateRules } from './button-states';

const pageButtonStyles = new CSSStyleSheet();
pageButtonStyles.replaceSync(`
    .page-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
    }
    .page-btn {
      box-sizing: border-box;
      height: 40px;
      padding: 0 16px;
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      line-height: 1;
    }
    .page-btn__icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-variation-settings: 'FILL' 0;
      font-size: 18px;
      line-height: 1;
    }
    .page-btn--primary {
      background: var(--pm-accent-solid);
      border-color: var(--pm-accent-solid);
      color: var(--pm-on-solid);
    }
    .page-btn--primary:hover:not(:disabled) {
      background: var(--pm-accent-solid-hover);
      border-color: var(--pm-accent-solid-hover);
    }
    .page-btn--secondary {
      background: transparent;
      border-color: var(--pm-border);
      color: var(--pm-text);
    }
    .page-btn--secondary:hover:not(:disabled) {
      background: var(--pm-surface-2);
    }
    .page-btn--destructive {
      background: transparent;
      border-color: var(--pm-danger);
      color: var(--pm-danger-text);
    }
    .page-btn--destructive:hover:not(:disabled) {
      background: var(--pm-danger-soft);
    }
    ${buttonStateRules('.page-btn', ['.page-btn--primary', '.page-btn--destructive'])}
    @media print {
      .page-btn,
      .page-actions {
        display: none;
      }
    }
  `);

export { pageButtonStyles };
