import type { StudentResult } from '../services/students';
import { NO_SIBLINGS_LINKED, siblingLabel } from './student-options';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      font-family: 'Inter', system-ui, sans-serif;
      padding: 12px 16px;
    }
    .summary__label {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pm-text-muted);
      margin-bottom: 6px;
    }
    .summary__list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .summary__list[hidden] {
      display: none;
    }
    .summary__item {
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: 9999px;
      padding: 4px 12px;
      font-size: 13px;
      color: var(--pm-text);
    }
    .summary__empty {
      font-size: 13px;
      color: var(--pm-text-muted);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="summary__label">Siblings</div>
  <ul class="summary__list" id="list" hidden></ul>
  <p class="summary__empty" id="empty">${NO_SIBLINGS_LINKED}</p>
`;

export class PmStudentSiblingsSummary extends HTMLElement {
  private list: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private _siblings: StudentResult[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.list = this.shadowRoot!.getElementById('list') as HTMLElement;
    this.emptyMessage = this.shadowRoot!.getElementById('empty') as HTMLElement;
    this.render();
  }

  set siblings(value: StudentResult[]) {
    this._siblings = value;
    this.render();
  }

  get siblings(): StudentResult[] {
    return this._siblings;
  }

  private render(): void {
    if (!this.list || !this.emptyMessage) return;

    this.list.innerHTML = '';
    const hasSiblings = this._siblings.length > 0;
    this.list.hidden = !hasSiblings;
    this.emptyMessage.hidden = hasSiblings;

    for (const sibling of this._siblings) {
      const item = document.createElement('li');
      item.classList.add('summary__item');
      item.textContent = siblingLabel(sibling);
      this.list.appendChild(item);
    }
  }
}

customElements.define('pm-student-siblings-summary', PmStudentSiblingsSummary);
