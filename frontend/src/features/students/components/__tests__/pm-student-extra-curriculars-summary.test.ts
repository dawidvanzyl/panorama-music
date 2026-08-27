import { describe, it, expect } from 'vitest';
import { PmStudentExtraCurricularsSummary } from '../pm-student-extra-curriculars-summary';
import { PmStudentsTable } from '../pm-students-table';
import type { StudentExtraCurricular } from '../../services/student-extra-curriculars';
import type { Grade, StudentResult } from '../../services/students';

const choir: StudentExtraCurricular = {
  extraCurricularId: 'ec1',
  description: 'Choir',
  phase: 'Junior',
  practiceTimes: [
    { practiceTimeId: 'pt1', day: 'Monday', startTime: '15:00:00' },
    { practiceTimeId: 'pt2', day: 'Thursday', startTime: '15:00:00' },
  ],
};

const drumline: StudentExtraCurricular = {
  extraCurricularId: 'ec2',
  description: 'Junior Drumline',
  phase: 'Junior',
  practiceTimes: [{ practiceTimeId: 'pt3', day: 'Tuesday', startTime: '13:30:00' }],
};

function mount(extraCurriculars: StudentExtraCurricular[]): PmStudentExtraCurricularsSummary {
  const summary = new PmStudentExtraCurricularsSummary();
  document.body.appendChild(summary);
  summary.extraCurriculars = extraCurriculars;
  return summary;
}

function student(grade: Grade): StudentResult {
  return {
    studentId: 's1',
    firstName: 'Ayanda',
    lastName: 'Dlamini',
    grade,
    phase: grade === 'Private' ? null : 'Junior',
    class: grade === 'Private' ? null : 'A',
    language: 'English',
    dateOfBirth: '2016-04-02',
  } as StudentResult;
}

/** Mounts the roster table with one student and expands their row. */
function mountTableWith(grade: Grade): PmStudentsTable {
  const table = new PmStudentsTable();
  document.body.appendChild(table);
  table.students = [student(grade)];
  (table.shadowRoot!.querySelector('.students-table__chevron-btn') as HTMLButtonElement).click();
  return table;
}

describe('pm-student-extra-curriculars-summary — one entry per activity', { tags: ['278UC20'] }, () => {
  it('lists each activity once with all of its practice times', () => {
    const summary = mount([choir, drumline]);

    const items = summary.shadowRoot!.querySelectorAll('.summary__item');
    // Two activities, not three entries — the one meeting twice appears once.
    expect(items).toHaveLength(2);
    expect(items[0].querySelector('.summary__item-heading')!.textContent).toBe('Choir');
    expect(items[0].querySelector('.summary__item-practice-times')!.textContent).toBe('Monday 15:00 · Thursday 15:00');
    expect(items[1].querySelector('.summary__item-heading')!.textContent).toBe('Junior Drumline');
    expect(items[1].querySelector('.summary__item-practice-times')!.textContent).toBe('Tuesday 13:30');

    document.body.removeChild(summary);
  });
});

describe('pm-student-extra-curriculars-summary — empty state', { tags: ['278UC21'] }, () => {
  it('reads as an empty state when the student takes part in nothing', () => {
    const summary = mount([]);

    const empty = summary.shadowRoot!.getElementById('empty') as HTMLElement;
    const list = summary.shadowRoot!.getElementById('list') as HTMLElement;
    expect(empty.hidden).toBe(false);
    expect(empty.textContent).toBe('No extra-curricular activities assigned.');
    expect(list.hidden).toBe(true);

    document.body.removeChild(summary);
  });
});

describe('pm-students-table — a Private-grade student', { tags: ['278UC22'] }, () => {
  it('shows no extra-curriculars section at all, not an empty one', () => {
    const graded = mountTableWith('Grade4');
    expect(graded.shadowRoot!.querySelector('pm-student-extra-curriculars-summary')).not.toBeNull();
    document.body.removeChild(graded);

    const table = mountTableWith('Private');

    // Absent rather than empty: an empty state would suggest a Private student
    // could hold activities, which they cannot.
    expect(table.shadowRoot!.querySelector('pm-student-extra-curriculars-summary')).toBeNull();
    // The sections that do apply to them are still there.
    expect(table.shadowRoot!.querySelector('pm-student-courses-summary')).not.toBeNull();

    document.body.removeChild(table);
  });
});
