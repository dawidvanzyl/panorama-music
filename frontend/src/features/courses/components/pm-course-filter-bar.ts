import {
  COURSE_TYPES,
  COURSE_TYPE_LABELS,
  DURATION_TYPES,
  DURATION_TYPE_LABELS,
  LESSON_TYPES,
  LESSON_TYPE_LABELS,
  OCCURRENCE_TYPES,
  OCCURRENCE_TYPE_LABELS,
} from '../services/course-display';
import { appendOptions } from './select-options';
import type { CourseType, DurationType, LessonType, OccurrenceType } from '../services/courses';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      font-family: 'Inter', system-ui, sans-serif;
      display: block;
    }
    .course-filter-bar__card {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 16px;
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      padding: 16px 24px;
    }
    .course-filter-bar__select {
      height: 38px;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
      font-family: inherit;
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <div class="course-filter-bar__card">
    <select class="course-filter-bar__select" id="courseType" aria-label="Course type filter">
      <option value="">All Course Types</option>
    </select>
    <select class="course-filter-bar__select" id="lessonType" aria-label="Lesson type filter">
      <option value="">All Lesson Types</option>
    </select>
    <select class="course-filter-bar__select" id="durationType" aria-label="Duration filter">
      <option value="">All Durations</option>
    </select>
    <select class="course-filter-bar__select" id="occurrenceType" aria-label="Occurrence filter">
      <option value="">All Occurrences</option>
    </select>
  </div>
`;

export class PmCourseFilterBar extends HTMLElement {
  private courseTypeSelect: HTMLSelectElement | null = null;
  private lessonTypeSelect: HTMLSelectElement | null = null;
  private durationSelect: HTMLSelectElement | null = null;
  private occurrenceSelect: HTMLSelectElement | null = null;

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.courseTypeSelect = this.shadowRoot!.getElementById('courseType') as HTMLSelectElement;
    this.lessonTypeSelect = this.shadowRoot!.getElementById('lessonType') as HTMLSelectElement;
    this.durationSelect = this.shadowRoot!.getElementById('durationType') as HTMLSelectElement;
    this.occurrenceSelect = this.shadowRoot!.getElementById('occurrenceType') as HTMLSelectElement;

    appendOptions(this.courseTypeSelect, COURSE_TYPES, COURSE_TYPE_LABELS);
    appendOptions(this.lessonTypeSelect, LESSON_TYPES, LESSON_TYPE_LABELS);
    appendOptions(this.durationSelect, DURATION_TYPES, DURATION_TYPE_LABELS);
    appendOptions(this.occurrenceSelect, OCCURRENCE_TYPES, OCCURRENCE_TYPE_LABELS);

    this.courseTypeSelect.addEventListener('change', this.handleChange);
    this.lessonTypeSelect.addEventListener('change', this.handleChange);
    this.durationSelect.addEventListener('change', this.handleChange);
    this.occurrenceSelect.addEventListener('change', this.handleChange);
  }

  disconnectedCallback(): void {
    this.courseTypeSelect?.removeEventListener('change', this.handleChange);
    this.lessonTypeSelect?.removeEventListener('change', this.handleChange);
    this.durationSelect?.removeEventListener('change', this.handleChange);
    this.occurrenceSelect?.removeEventListener('change', this.handleChange);
  }

  /** Returns every select to "All …" without announcing a filter change. */
  reset(): void {
    if (!this.courseTypeSelect) return;
    this.courseTypeSelect.value = '';
    this.lessonTypeSelect!.value = '';
    this.durationSelect!.value = '';
    this.occurrenceSelect!.value = '';
  }

  private handleChange = (): void => {
    this.dispatchEvent(
      new CustomEvent('course-filter-changed', {
        bubbles: true,
        composed: true,
        detail: {
          courseType: (this.courseTypeSelect!.value || undefined) as CourseType | undefined,
          lessonType: (this.lessonTypeSelect!.value || undefined) as LessonType | undefined,
          durationType: (this.durationSelect!.value || undefined) as DurationType | undefined,
          occurrenceType: (this.occurrenceSelect!.value || undefined) as OccurrenceType | undefined,
        },
      }),
    );
  };
}

customElements.define('pm-course-filter-bar', PmCourseFilterBar);
