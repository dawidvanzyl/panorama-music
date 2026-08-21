import { INSTRUMENT_TYPE_LABELS, STEP_TYPE_LABELS, courseLabel, teacherLabel } from './enrollment-options';
import type { EnrollmentResult } from '../services/enrollments';

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
    .summary__item-assignment {
      font-size: 13px;
      color: var(--pm-text-muted);
    }
    .summary__item-enrolled {
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

  <div class="summary__label">Courses</div>
  <ul class="summary__list" id="list" hidden></ul>
  <p class="summary__empty" id="empty">No course enrollments.</p>
`;

export class PmStudentCoursesSummary extends HTMLElement {
  private list: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private _enrollments: EnrollmentResult[] = [];

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

  set enrollments(value: EnrollmentResult[]) {
    this._enrollments = value;
    this.render();
  }

  get enrollments(): EnrollmentResult[] {
    return this._enrollments;
  }

  private render(): void {
    if (!this.list || !this.emptyMessage) return;

    this.list.innerHTML = '';
    const hasEnrollments = this._enrollments.length > 0;
    this.list.hidden = !hasEnrollments;
    this.emptyMessage.hidden = hasEnrollments;

    for (const enrollment of this._enrollments) {
      this.list.appendChild(this.buildItem(enrollment));
    }
  }

  /**
   * One block per enrollment: the course, then the teacher with whichever of the
   * instrument and step the course type records, then the date enrolled.
   */
  private buildItem(enrollment: EnrollmentResult): HTMLLIElement {
    const item = document.createElement('li');
    item.classList.add('summary__item');

    const heading = document.createElement('span');
    heading.classList.add('summary__item-heading');
    heading.textContent = courseLabel(enrollment);
    item.appendChild(heading);

    const assignment = document.createElement('span');
    assignment.classList.add('summary__item-assignment');
    assignment.textContent = [
      teacherLabel(enrollment),
      enrollment.instrumentType ? INSTRUMENT_TYPE_LABELS[enrollment.instrumentType] : null,
      enrollment.stepType ? `Step ${STEP_TYPE_LABELS[enrollment.stepType]}` : null,
    ]
      .filter((part) => part !== null && part !== '')
      .join(' · ');
    item.appendChild(assignment);

    const enrolled = document.createElement('span');
    enrolled.classList.add('summary__item-enrolled');
    enrolled.textContent = `Enrolled ${enrollment.enrolledDate}`;
    item.appendChild(enrolled);

    return item;
  }
}

customElements.define('pm-student-courses-summary', PmStudentCoursesSummary);
