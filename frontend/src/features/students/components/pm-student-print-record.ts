import type { GuardianRelationship } from '../services/guardians';
import { NO_COURSE_ENROLLMENTS } from './enrollment-options';
import { CONTACT_SEPARATOR, NO_GUARDIANS_LINKED } from './guardian-options';
import {
  activitiesLine,
  COLUMN_GAP_PX,
  contactFitsOneLine,
  courseEntry,
  guardianColumnCount,
  guardianEntry,
  PRINTABLE_WIDTH_PX,
  printedOnLine,
  recordDetails,
  siblingsLine,
  TWO_COLUMN_WIDTH_PX,
  type GuardianEntry,
  type StudentRecordSource,
} from './student-record';
import { NO_SIBLINGS_LINKED } from './student-options';
import { NO_ACTIVITIES_ASSIGNED } from './extra-curricular-options';

const BODY_FONT_FAMILY = "'Inter', system-ui, sans-serif";
const BODY_FONT = `13px ${BODY_FONT_FAMILY}`;

const styles = new CSSStyleSheet();
styles.replaceSync(`
    :host {
      display: block;
      font: 13px/1.45 ${BODY_FONT_FAMILY};
      color: var(--pm-text);
      hyphens: manual;
    }
    .print-record__printed-on {
      font-size: 12px;
    }
    .print-record__name {
      font-size: 24px;
      font-weight: 700;
      margin: 8px 0 12px;
    }
    .print-record__details {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 4px 16px;
    }
    .print-record__label {
      font-size: 10.5px;
      color: var(--pm-text-muted);
    }
    .print-record__heading {
      font-size: 15px;
      font-weight: 700;
      margin: 22px 0 8px;
      padding-bottom: 3px;
      border-bottom: 1px solid var(--pm-text);
      break-after: avoid;
    }
    .print-record__entries {
      display: grid;
      column-gap: ${COLUMN_GAP_PX}px;
      grid-template-columns: minmax(0, 1fr);
    }
    .print-record__entries[data-columns='2'] {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
    .print-record__entry {
      break-inside: avoid;
      margin: 0 0 10px;
      padding: 0 0 8px;
      border-bottom: 1px solid var(--pm-border);
    }
    .print-record__entry-heading {
      font-weight: 700;
    }
    .print-record__word {
      display: inline-block;
      max-width: 100%;
      overflow-wrap: anywhere;
    }
    .print-record__empty {
      color: var(--pm-text-muted);
    }
  `);

const template = document.createElement('template');
template.innerHTML = '<div id="root"></div>';

let measureContext: OffscreenCanvasRenderingContext2D | null | undefined;

function measureText(text: string): number {
  if (typeof OffscreenCanvas === 'undefined') return 0;
  if (measureContext === undefined) {
    measureContext = new OffscreenCanvas(1, 1).getContext('2d');
    if (measureContext) measureContext.font = BODY_FONT;
  }
  return measureContext ? measureContext.measureText(text).width : 0;
}

/**
 * Each run of non-space characters becomes an atomic box capped at its line's
 * width: a word that fits is never broken, and one that does not wraps inside
 * itself instead of running past the page edge.
 */
function appendWords(parent: HTMLElement, text: string): void {
  for (const part of text.split(/(\s+)/)) {
    if (part === '') continue;
    if (/^\s+$/.test(part)) {
      parent.appendChild(document.createTextNode(part));
      continue;
    }
    const word = document.createElement('span');
    word.classList.add('print-record__word');
    word.textContent = part;
    parent.appendChild(word);
  }
}

function line(className: string, text: string, id?: string): HTMLDivElement {
  const element = document.createElement('div');
  element.classList.add(className);
  if (id) element.id = id;
  appendWords(element, text);
  return element;
}

function section(id: string, title: string): HTMLElement {
  const element = document.createElement('section');
  element.id = id;
  const heading = document.createElement('h2');
  heading.classList.add('print-record__heading');
  heading.textContent = title;
  element.appendChild(heading);
  return element;
}

export class PmStudentPrintRecord extends HTMLElement {
  private root: HTMLElement;
  private _relationships: GuardianRelationship[] = [];

  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this.shadowRoot!.adoptedStyleSheets = [styles];
    this.shadowRoot!.appendChild(template.content.cloneNode(true));
    this.root = this.shadowRoot!.getElementById('root') as HTMLElement;
  }

  set relationships(value: GuardianRelationship[]) {
    this._relationships = value;
  }

  show(source: StudentRecordSource, printedOn: string): void {
    this.root.replaceChildren(
      line('print-record__printed-on', printedOnLine(printedOn), 'printedOn'),
      line('print-record__name', `${source.student.firstName} ${source.student.lastName}`, 'studentName'),
      this.buildDetails(source),
      this.buildSiblings(source),
      this.buildGuardians(source),
      this.buildCourses(source),
      this.buildExtraCurriculars(source),
    );
  }

  private buildDetails(source: StudentRecordSource): HTMLElement {
    const details = document.createElement('div');
    details.id = 'details';
    details.classList.add('print-record__details');
    for (const { label, value } of recordDetails(source.student)) {
      const detail = document.createElement('div');
      detail.classList.add('print-record__detail');
      detail.append(line('print-record__label', label), line('print-record__value', value));
      details.appendChild(detail);
    }
    return details;
  }

  private buildSiblings(source: StudentRecordSource): HTMLElement {
    const result = section('siblingsSection', 'Siblings');
    result.appendChild(
      source.siblings.length === 0
        ? line('print-record__empty', NO_SIBLINGS_LINKED)
        : line('print-record__siblings', siblingsLine(source.siblings), 'siblings'),
    );
    return result;
  }

  private buildExtraCurriculars(source: StudentRecordSource): HTMLElement {
    const result = section('extraCurricularsSection', 'Extra-Curriculars');
    result.appendChild(
      source.extraCurriculars.length === 0
        ? line('print-record__empty', NO_ACTIVITIES_ASSIGNED)
        : line('print-record__activities', activitiesLine(source.extraCurriculars), 'extraCurriculars'),
    );
    return result;
  }

  private buildGuardians(source: StudentRecordSource): HTMLElement {
    const result = section('guardiansSection', 'Guardians');
    if (source.guardians.length === 0) {
      result.appendChild(line('print-record__empty', NO_GUARDIANS_LINKED));
      return result;
    }

    const entries = source.guardians.map((guardian) => guardianEntry(guardian, this._relationships));
    const columns = guardianColumnCount(entries.flatMap((entry) => (entry.email ? [measureText(entry.email)] : [])));
    const columnWidth = columns === 2 ? TWO_COLUMN_WIDTH_PX : PRINTABLE_WIDTH_PX;

    const list = document.createElement('div');
    list.id = 'guardians';
    list.classList.add('print-record__entries');
    list.dataset.columns = String(columns);
    for (const entry of entries) list.appendChild(this.buildGuardian(entry, columnWidth));
    result.appendChild(list);
    return result;
  }

  private buildGuardian(entry: GuardianEntry, columnWidth: number): HTMLElement {
    const element = document.createElement('div');
    element.classList.add('print-record__entry');
    element.appendChild(line('print-record__entry-heading', entry.heading));

    const cell = entry.cell ? this.inline('print-record__cell', entry.cell) : null;
    const email = entry.email ? this.inline('print-record__email', entry.email) : null;
    if (cell && email) {
      const sameLine = contactFitsOneLine(measureText(`${entry.cell}${CONTACT_SEPARATOR}${entry.email}`), columnWidth);
      const first = this.contactLine();
      first.appendChild(cell);
      if (sameLine) {
        first.appendChild(document.createTextNode(CONTACT_SEPARATOR));
        first.appendChild(email);
        element.appendChild(first);
      } else {
        const second = this.contactLine();
        second.appendChild(email);
        element.append(first, second);
      }
    } else if (cell || email) {
      const only = this.contactLine();
      only.appendChild((cell ?? email)!);
      element.appendChild(only);
    }

    if (entry.flags !== null) element.appendChild(line('print-record__flags', entry.flags));
    return element;
  }

  private contactLine(): HTMLDivElement {
    const element = document.createElement('div');
    element.classList.add('print-record__contact');
    return element;
  }

  private inline(className: string, text: string): HTMLSpanElement {
    const element = document.createElement('span');
    element.classList.add(className);
    appendWords(element, text);
    return element;
  }

  private buildCourses(source: StudentRecordSource): HTMLElement {
    const result = section('coursesSection', 'Courses');
    if (source.enrollments.length === 0) {
      result.appendChild(line('print-record__empty', NO_COURSE_ENROLLMENTS));
      return result;
    }

    const list = document.createElement('div');
    list.id = 'courses';
    list.classList.add('print-record__entries');
    list.dataset.columns = '2';
    for (const enrollment of source.enrollments) {
      const entry = courseEntry(enrollment);
      const element = document.createElement('div');
      element.classList.add('print-record__entry');
      element.append(
        line('print-record__entry-heading', entry.heading),
        line('print-record__assignment', entry.assignment),
        line('print-record__enrolled', entry.enrolled),
      );
      list.appendChild(element);
    }
    result.appendChild(list);
    return result;
  }
}

customElements.define('pm-student-print-record', PmStudentPrintRecord);
