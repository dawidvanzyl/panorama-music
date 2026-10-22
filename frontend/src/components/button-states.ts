const LOADING_ICON_SELECTOR = '.btn-loading-icon';

function createLoadingIcon(): HTMLSpanElement {
  const icon = document.createElement('span');
  icon.className = 'btn-loading-icon';
  icon.setAttribute('aria-hidden', 'true');
  icon.dataset.testid = 'button-loading-icon';
  icon.textContent = 'progress_activity';
  return icon;
}

/**
 * Puts a confirm button and its dismiss button into, or out of, the loading state.
 * The label text of the confirm button is never touched.
 */
export function setButtonsBusy(
  confirm: HTMLButtonElement,
  dismiss: HTMLButtonElement | null,
  busy: boolean,
): void {
  confirm.disabled = busy;
  if (dismiss) {
    dismiss.disabled = busy;
  }
  const existing = confirm.querySelector(LOADING_ICON_SELECTOR);
  if (busy) {
    confirm.setAttribute('aria-busy', 'true');
    if (!existing) {
      confirm.insertBefore(createLoadingIcon(), confirm.firstChild);
    }
  } else {
    confirm.removeAttribute('aria-busy');
    existing?.remove();
  }
}

/**
 * The shared button states for one button class: cursor, transition, disabled, press,
 * label layout and the loading icon.
 */
export function buttonStateRules(buttonSelector: string, pressVariantSelectors: string[]): string {
  const press = pressVariantSelectors
    .map((selector) => `${selector}:active:not(:disabled)`)
    .join(',\n    ');
  return `
    ${buttonSelector} {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      white-space: nowrap;
      cursor: pointer;
      transition:
        background-color 0.15s linear,
        border-color 0.15s linear,
        color 0.15s linear,
        opacity 0.15s linear;
    }
    ${buttonSelector}:disabled {
      opacity: 0.65;
      cursor: not-allowed;
    }
    ${press ? `${press} {\n      transform: scale(0.98);\n    }` : ''}
    ${buttonSelector} .btn-loading-icon {
      font-family: 'Material Symbols Outlined', sans-serif;
      font-variation-settings: 'FILL' 0;
      font-size: 18px;
      line-height: 1;
      animation: spin 0.7s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
  `;
}
