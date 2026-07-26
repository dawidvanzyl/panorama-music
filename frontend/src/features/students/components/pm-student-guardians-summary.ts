import type { GuardianRelationship, GuardianResult } from '../services/guardians';

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
      flex-direction: column;
      gap: 6px;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .summary__list[hidden] {
      display: none;
    }
    .summary__item {
      font-size: 13px;
      color: var(--pm-text);
    }
    .summary__item-name {
      font-weight: 500;
    }
    .summary__item-detail {
      color: var(--pm-text-muted);
    }
    .summary__empty {
      font-size: 13px;
      color: var(--pm-text-muted);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="summary__label">Guardians</div>
  <ul class="summary__list" id="list" hidden></ul>
  <p class="summary__empty" id="empty">No guardians linked.</p>
`;

export class PmStudentGuardiansSummary extends HTMLElement {
  private list: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private _guardians: GuardianResult[] = [];
  private _relationships: GuardianRelationship[] = [];

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

  set guardians(value: GuardianResult[]) {
    this._guardians = value;
    this.render();
  }

  get guardians(): GuardianResult[] {
    return this._guardians;
  }

  set relationships(value: GuardianRelationship[]) {
    this._relationships = value;
    this.render();
  }

  private relationshipName(id: string): string {
    return this._relationships.find((r) => r.guardianRelationshipId === id)?.name ?? '—';
  }

  private render(): void {
    if (!this.list || !this.emptyMessage) return;

    this.list.innerHTML = '';
    const hasGuardians = this._guardians.length > 0;
    this.list.hidden = !hasGuardians;
    this.emptyMessage.hidden = hasGuardians;

    for (const guardian of this._guardians) {
      const item = document.createElement('li');
      item.classList.add('summary__item');

      const name = document.createElement('span');
      name.classList.add('summary__item-name');
      name.textContent = `${guardian.firstName} ${guardian.surname}`;

      const contact = [guardian.cell, guardian.email].filter(Boolean).join(' · ');
      const detail = document.createElement('span');
      detail.classList.add('summary__item-detail');
      detail.textContent = ` — ${this.relationshipName(guardian.guardianRelationshipId)}${contact ? ` · ${contact}` : ''}`;

      item.append(name, detail);
      this.list.appendChild(item);
    }
  }
}

customElements.define('pm-student-guardians-summary', PmStudentGuardiansSummary);
