import {
  COURSE_TYPE_LABELS,
  OCCURRENCE_TYPE_LABELS,
  costText,
  lessonStructureColumnText,
} from '../services/course-display';
import type { Course } from '../services/courses';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
    }
    .course-table__card {
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 24px;
    }
    table {
      width: 100%;
      table-layout: fixed;
      border-collapse: collapse;
    }
    th, td {
      box-sizing: border-box;
      text-align: left;
      padding: 12px 4px;
      font-size: 14px;
      color: var(--pm-text);
      border-bottom: 1px solid var(--pm-border);
    }
    th {
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      color: var(--pm-text-muted);
      padding-top: 0;
    }
    td.course-table__structure,
    td.course-table__occurrence {
      color: var(--pm-text-muted);
    }
    .course-table__actions-header,
    .course-table__actions {
      text-align: right;
      width: 220px;
    }
    .course-table__empty {
      color: var(--pm-text-muted);
      font-size: 14px;
      margin: 16px 0 0;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="course-table__card">
    <table>
      <thead>
        <tr>
          <th>Course Type</th>
          <th>Lesson Structure</th>
          <th>Occurrence</th>
          <th>Cost</th>
          <th class="course-table__actions-header" id="actionsHeader" hidden>Actions</th>
        </tr>
      </thead>
      <tbody id="rows"></tbody>
    </table>
    <p class="course-table__empty" id="empty" hidden>No courses found.</p>
  </div>
`;

export class PmCourseTable extends HTMLElement {
  private rowsBody: HTMLElement | null = null;
  private emptyMessage: HTMLElement | null = null;
  private actionsHeader: HTMLElement | null = null;
  private _courses: Course[] = [];
  private _showActions = false;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.rowsBody = this.shadowRoot!.getElementById('rows') as HTMLElement;
    this.emptyMessage = this.shadowRoot!.getElementById('empty') as HTMLElement;
    this.actionsHeader = this.shadowRoot!.getElementById('actionsHeader') as HTMLElement;

    // A property assigned before this element upgraded lands as an own property
    // that shadows the accessor below, so it is replayed through the setter here.
    this.upgradeProperty('courses');
    this.upgradeProperty('showActions');

    this.render();
  }

  set courses(value: Course[]) {
    this._courses = value;
    this.render();
  }

  get courses(): Course[] {
    return this._courses;
  }

  /**
   * Whether the actions column exists at all. A staff user who may not maintain
   * courses gets no column rather than a disabled one, matching how the
   * endpoints answer. The column stays empty until the row actions land with
   * the change-and-remove story.
   */
  set showActions(value: boolean) {
    this._showActions = value;
    this.render();
  }

  private upgradeProperty(name: string): void {
    if (!Object.hasOwn(this, name)) return;

    const self = this as unknown as Record<string, unknown>;
    const value = self[name];
    delete self[name];
    self[name] = value;
  }

  private render(): void {
    if (!this.rowsBody || !this.emptyMessage || !this.actionsHeader) return;

    this.actionsHeader.hidden = !this._showActions;
    this.emptyMessage.hidden = this._courses.length > 0;
    this.rowsBody.innerHTML = '';

    for (const course of this._courses) {
      this.rowsBody.appendChild(this.buildRow(course));
    }
  }

  private buildRow(course: Course): HTMLTableRowElement {
    const row = document.createElement('tr');

    const typeCell = document.createElement('td');
    typeCell.textContent = COURSE_TYPE_LABELS[course.courseType];

    const structureCell = document.createElement('td');
    structureCell.classList.add('course-table__structure');
    structureCell.textContent = lessonStructureColumnText(course);

    const occurrenceCell = document.createElement('td');
    occurrenceCell.classList.add('course-table__occurrence');
    occurrenceCell.textContent = OCCURRENCE_TYPE_LABELS[course.occurrenceType];

    const costCell = document.createElement('td');
    costCell.textContent = costText(course.cost);

    row.append(typeCell, structureCell, occurrenceCell, costCell);

    if (this._showActions) {
      const actionsCell = document.createElement('td');
      actionsCell.classList.add('course-table__actions');
      row.appendChild(actionsCell);
    }

    return row;
  }
}

customElements.define('pm-course-table', PmCourseTable);
