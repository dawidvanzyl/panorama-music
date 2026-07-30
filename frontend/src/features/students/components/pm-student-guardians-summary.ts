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
      gap: 8px;
      list-style: none;
      margin: 0;
      padding: 0;
    }
    .summary__list[hidden] {
      display: none;
    }
    .summary__item {
      display: flex;
      flex-direction: column;
      gap: 3px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 10px 12px;
    }
    .summary__item-heading {
      font-size: 13px;
      font-weight: 600;
      color: var(--pm-text);
    }
    .summary__item-contact {
      font-size: 13px;
      color: var(--pm-text-muted);
    }
    .summary__item-email {
      color: var(--pm-accent);
    }
    .summary__item-flags {
      font-size: 12px;
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
      this.list.appendChild(this.buildItem(guardian));
    }
  }

  /**
   * One block per guardian: name and relationship, then contact details, then
   * whichever of the three flags are set. Lines with nothing to show are
   * omitted rather than rendered empty.
   */
  private buildItem(guardian: GuardianResult): HTMLLIElement {
    const item = document.createElement('li');
    item.classList.add('summary__item');

    const heading = document.createElement('span');
    heading.classList.add('summary__item-heading');
    heading.textContent = `${guardian.firstName} ${guardian.surname} · ${this.relationshipName(guardian.guardianRelationshipId)}`;
    item.appendChild(heading);

    const contact = this.buildContact(guardian);
    if (contact) item.appendChild(contact);

    const flags = [
      guardian.receivesCorrespondence ? 'Correspondence' : null,
      guardian.responsibleForPayment ? 'Payment' : null,
      guardian.married ? 'Married' : null,
    ].filter((flag) => flag !== null);

    if (flags.length > 0) {
      const flagsLine = document.createElement('span');
      flagsLine.classList.add('summary__item-flags');
      flagsLine.textContent = flags.join(', ');
      item.appendChild(flagsLine);
    }

    return item;
  }

  /** Cell as plain text, email as a mailto link, separated when both are present. */
  private buildContact(guardian: GuardianResult): HTMLSpanElement | null {
    if (!guardian.cell && !guardian.email) return null;

    const contact = document.createElement('span');
    contact.classList.add('summary__item-contact');

    if (guardian.cell) {
      contact.appendChild(document.createTextNode(guardian.cell));
    }

    if (guardian.email) {
      if (guardian.cell) contact.appendChild(document.createTextNode(' · '));

      const email = document.createElement('a');
      email.classList.add('summary__item-email');
      email.href = `mailto:${guardian.email}`;
      email.textContent = guardian.email;
      contact.appendChild(email);
    }

    return contact;
  }
}

customElements.define('pm-student-guardians-summary', PmStudentGuardiansSummary);
