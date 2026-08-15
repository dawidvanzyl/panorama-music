import { COURSE_TYPES, COURSE_TYPE_LABELS, lessonStructureOptionLabel } from '../services/course-display';
import type { CourseType, LessonStructure } from '../services/courses';

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      padding: 24px;
      background: var(--pm-surface);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      font-family: 'Inter', system-ui, sans-serif;
    }
    .course-form__heading {
      font-size: 1.125rem;
      font-weight: 600;
      color: var(--pm-text);
      margin: 0 0 16px;
    }
    .course-form__row {
      display: grid;
      grid-template-columns: 1fr 1fr 1.4fr;
      gap: 20px;
      align-items: start;
    }
    .course-form__field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .course-form__label {
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-text-muted);
    }
    .course-form__input,
    .course-form__select {
      box-sizing: border-box;
      width: 100%;
      height: 44px;
      padding: 0 12px;
      background: var(--pm-surface-2);
      border: 1px solid var(--pm-border);
      border-radius: var(--pm-radius);
      color: var(--pm-text);
      font-size: 14px;
      font-family: inherit;
      outline: none;
    }
    .course-form__input:focus,
    .course-form__select:focus {
      border-color: transparent;
      box-shadow: 0 0 0 2px var(--pm-accent);
    }
    .course-form__error {
      display: none;
      align-items: center;
      gap: 8px;
      background: rgba(224, 82, 82, 0.1);
      border: 1px solid var(--pm-danger);
      border-radius: var(--pm-radius);
      padding: 10px 14px;
      margin-top: 16px;
      font-size: 13px;
      font-weight: 500;
      color: var(--pm-danger);
    }
    .course-form__error--visible {
      display: flex;
    }
    .course-form__actions {
      display: flex;
      justify-content: flex-end;
      margin-top: 20px;
    }
    .course-form__submit {
      height: 44px;
      padding: 0 24px;
      border: none;
      border-radius: var(--pm-radius);
      background: var(--pm-accent);
      color: #fff;
      font-size: 14px;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
    }
    .course-form__submit:hover {
      filter: brightness(1.1);
    }
  `);

const template = document.createElement('template');
template.innerHTML = `

  <h2 class="course-form__heading">Create Course</h2>
  <div class="course-form__row">
    <div class="course-form__field">
      <label class="course-form__label" for="courseType">Course Type</label>
      <select class="course-form__select" id="courseType">
        <option value="">Select a course type</option>
      </select>
    </div>
    <div class="course-form__field">
      <label class="course-form__label" for="cost">Cost (ZAR)</label>
      <input class="course-form__input" type="text" id="cost" placeholder="0.00" inputmode="decimal" />
    </div>
    <div class="course-form__field">
      <label class="course-form__label" for="lessonStructure">Lesson Structure</label>
      <select class="course-form__select" id="lessonStructure">
        <option value="">Select a lesson structure</option>
      </select>
    </div>
  </div>
  <div class="course-form__error" id="error"></div>
  <div class="course-form__actions">
    <button type="button" class="course-form__submit" id="createBtn">Create Course</button>
  </div>
`;

const COST_PATTERN = /^\d+(\.\d{1,2})?$/;
const COST_ERROR = 'Cost must be an amount with at most two decimals.';
const MISSING_ERROR = 'Select a course type and a lesson structure.';

export class PmCourseForm extends HTMLElement {
  private courseTypeSelect: HTMLSelectElement | null = null;
  private costInput: HTMLInputElement | null = null;
  private structureSelect: HTMLSelectElement | null = null;
  private errorSlot: HTMLElement | null = null;
  private createBtn: HTMLButtonElement | null = null;
  private _structures: LessonStructure[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
  }

  connectedCallback(): void {
    this.courseTypeSelect = this.shadowRoot!.getElementById('courseType') as HTMLSelectElement;
    this.costInput = this.shadowRoot!.getElementById('cost') as HTMLInputElement;
    this.structureSelect = this.shadowRoot!.getElementById('lessonStructure') as HTMLSelectElement;
    this.errorSlot = this.shadowRoot!.getElementById('error') as HTMLElement;
    this.createBtn = this.shadowRoot!.getElementById('createBtn') as HTMLButtonElement;

    for (const courseType of COURSE_TYPES) {
      const option = document.createElement('option');
      option.value = courseType;
      option.textContent = COURSE_TYPE_LABELS[courseType];
      this.courseTypeSelect.appendChild(option);
    }

    this.renderStructures();
    this.createBtn.addEventListener('click', this.handleCreate);
  }

  disconnectedCallback(): void {
    this.createBtn?.removeEventListener('click', this.handleCreate);
  }

  set structures(value: LessonStructure[]) {
    this._structures = value;
    this.renderStructures();
  }

  /** Clears the entered values, leaving the form open for the next course. */
  reset(): void {
    if (!this.courseTypeSelect) return;
    this.courseTypeSelect.value = '';
    this.costInput!.value = '';
    this.structureSelect!.value = '';
    this.clearError();
  }

  showError(message: string): void {
    this.errorSlot!.textContent = message;
    this.errorSlot!.classList.add('course-form__error--visible');
  }

  clearError(): void {
    this.errorSlot!.textContent = '';
    this.errorSlot!.classList.remove('course-form__error--visible');
  }

  private renderStructures(): void {
    if (!this.structureSelect) return;

    const selected = this.structureSelect.value;
    this.structureSelect.innerHTML = '<option value="">Select a lesson structure</option>';
    for (const structure of this._structures) {
      const option = document.createElement('option');
      option.value = structure.lessonStructureId;
      option.textContent = lessonStructureOptionLabel(structure);
      this.structureSelect.appendChild(option);
    }
    this.structureSelect.value = selected;
  }

  private handleCreate = (): void => {
    const courseType = this.courseTypeSelect!.value as CourseType | '';
    const cost = this.costInput!.value.trim();
    const lessonStructureId = this.structureSelect!.value;

    if (!courseType || !lessonStructureId) {
      this.showError(MISSING_ERROR);
      return;
    }
    if (!COST_PATTERN.test(cost)) {
      this.showError(COST_ERROR);
      return;
    }

    this.clearError();
    this.dispatchEvent(
      new CustomEvent('course-form-submitted', {
        bubbles: true,
        composed: true,
        detail: { courseType, cost, lessonStructureId },
      }),
    );
  };
}

customElements.define('pm-course-form', PmCourseForm);
