import { NO_ACTIVITIES_ASSIGNED, practiceTimesText } from './extra-curricular-options';
import type { StudentExtraCurricular } from '../services/student-extra-curriculars';

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
      align-items: flex-start;
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
    .summary__item-practice-times {
      font-size: 13px;
      color: var(--pm-text-muted);
    }
    .summary__empty {
      font-size: 13px;
      color: var(--pm-text-muted);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="summary__label">Extra-Curriculars</div>
  <ul class="summary__list" id="list" hidden></ul>
  <p class="summary__empty" id="empty">${NO_ACTIVITIES_ASSIGNED}</p>
`;

/**
 * The activities a student takes part in, read-only, on the expanded roster row
 * — built like the courses summary it sits beside. One entry per activity
 * carrying all of its practice times, never one entry per slot: a student is
 * assigned to an activity, not to one of its meetings.
 *
 * A Private-grade student is given no summary at all rather than an empty one,
 * which is the table's decision — see `pm-students-table`. They take no part in
 * extra-curriculars, and an empty state would suggest they could.
 */
export class PmStudentExtraCurricularsSummary extends HTMLElement {
  private list: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private _extraCurriculars: StudentExtraCurricular[] = [];

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

  set extraCurriculars(value: StudentExtraCurricular[]) {
    this._extraCurriculars = value;
    this.render();
  }

  get extraCurriculars(): StudentExtraCurricular[] {
    return this._extraCurriculars;
  }

  private render(): void {
    if (!this.list || !this.emptyMessage) return;

    this.list.innerHTML = '';
    const hasActivities = this._extraCurriculars.length > 0;
    this.list.hidden = !hasActivities;
    this.emptyMessage.hidden = hasActivities;

    for (const extraCurricular of this._extraCurriculars) {
      this.list.appendChild(this.buildItem(extraCurricular));
    }
  }

  /** One block per activity: its description, then every practice time it keeps. */
  private buildItem(extraCurricular: StudentExtraCurricular): HTMLLIElement {
    const item = document.createElement('li');
    item.classList.add('summary__item');

    const heading = document.createElement('span');
    heading.classList.add('summary__item-heading');
    heading.textContent = extraCurricular.description;
    item.appendChild(heading);

    const practiceTimes = document.createElement('span');
    practiceTimes.classList.add('summary__item-practice-times');
    // Every slot, in the day-then-time order the activity itself keeps and the
    // server sends — not only the first.
    practiceTimes.textContent = practiceTimesText(extraCurricular);
    item.appendChild(practiceTimes);

    return item;
  }
}

customElements.define('pm-student-extra-curriculars-summary', PmStudentExtraCurricularsSummary);
