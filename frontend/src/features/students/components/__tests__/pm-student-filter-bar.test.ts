import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import '../pm-student-filter-bar';
import type { PmStudentFilterBar } from '../pm-student-filter-bar';
import type { AssignableTeacher } from '../../services/enrollments';

const teachers: AssignableTeacher[] = [
  { teacherId: 't-anna', firstName: 'Anna', surname: 'Venter', isActive: true },
  { teacherId: 't-ravi', firstName: 'Ravi', surname: 'Naidoo', isActive: true },
  { teacherId: 't-lerato', firstName: 'Lerato', surname: 'Smit', isActive: true },
];

let bar: PmStudentFilterBar;

function teacherSelect(): HTMLSelectElement {
  return bar.shadowRoot!.getElementById('teacher') as HTMLSelectElement;
}

beforeEach(() => {
  bar = document.createElement('pm-student-filter-bar') as PmStudentFilterBar;
  document.body.appendChild(bar);
});

afterEach(() => {
  document.body.removeChild(bar);
});

describe('pm-student-filter-bar — the Teacher filter', { tags: ['341UC3'] }, () => {
  it('follows Class and lists the controls in order', () => {
    const ids = [...bar.shadowRoot!.querySelector('.filter-bar__card')!.children].map((child) => child.id);

    expect(ids).toEqual(['name', 'grade', 'phase', 'class', 'teacher']);
  });

  it('offers All Teachers then each given teacher, with All Teachers selected', () => {
    bar.teachers = teachers;

    const options = [...teacherSelect().options];
    expect(options.map((o) => o.textContent)).toEqual(['All Teachers', 'Anna Venter', 'Ravi Naidoo', 'Lerato Smit']);
    expect(options.map((o) => o.value)).toEqual(['', 't-anna', 't-ravi', 't-lerato']);
    expect(teacherSelect().value).toBe('');
  });

  it('keeps the chosen teacher when the teachers are supplied again', () => {
    bar.teachers = teachers;
    teacherSelect().value = 't-ravi';

    bar.teachers = [...teachers];

    expect(teacherSelect().value).toBe('t-ravi');
  });

  it('emits the chosen teacher id, and no teacher id for All Teachers', () => {
    bar.teachers = teachers;
    const details: Array<{ teacherId?: string }> = [];
    bar.addEventListener('filter-changed', (event) => details.push((event as CustomEvent).detail));

    teacherSelect().value = 't-anna';
    teacherSelect().dispatchEvent(new Event('change'));
    teacherSelect().value = '';
    teacherSelect().dispatchEvent(new Event('change'));

    expect(details.map((d) => d.teacherId)).toEqual(['t-anna', undefined]);
  });
});
