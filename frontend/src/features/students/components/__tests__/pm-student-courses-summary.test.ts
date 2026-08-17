import { describe, it, expect } from 'vitest';
import { PmStudentCoursesSummary } from '../pm-student-courses-summary';
import type { EnrollmentResult } from '../../services/enrollments';

function enrollment(overrides: Partial<EnrollmentResult> = {}): EnrollmentResult {
  return {
    studentCourseId: 'sc1',
    studentId: 's1',
    courseId: 'c1',
    courseType: 'Instrument',
    lessonType: 'Individual',
    durationType: 'HalfHour',
    occurrenceType: 'DuringSchool',
    teacherId: 't1',
    teacherFirstName: 'Dawid',
    teacherSurname: 'van Zyl',
    instrumentType: 'Piano',
    stepType: 'Step2A',
    enrolledDate: '2026-01-19',
    ...overrides,
  };
}

function mount(enrollments: EnrollmentResult[]): PmStudentCoursesSummary {
  const summary = new PmStudentCoursesSummary();
  document.body.appendChild(summary);
  summary.enrollments = enrollments;
  return summary;
}

describe('pm-student-courses-summary enrollment blocks', { tags: ['268UC26'] }, () => {
  it('renders each enrollment as a block naming the course, the assignment, and the enrolled date', () => {
    const summary = mount([
      enrollment(),
      enrollment({
        studentCourseId: 'sc2',
        courseType: 'Theory',
        lessonType: 'Group',
        durationType: 'Hour',
        occurrenceType: 'AfterSchool',
        teacherFirstName: 'Lindiwe',
        teacherSurname: 'Mabaso',
        instrumentType: null,
        stepType: 'Step2B',
        enrolledDate: '2026-02-03',
      }),
    ]);

    const items = summary.shadowRoot!.querySelectorAll('.summary__item');
    expect(items).toHaveLength(2);

    expect(items[0].querySelector('.summary__item-heading')!.textContent).toBe(
      'Instrument · Individual · Half Hour · During School',
    );
    expect(items[0].querySelector('.summary__item-assignment')!.textContent).toBe('Dawid van Zyl · Piano · Step 2A');
    expect(items[0].querySelector('.summary__item-enrolled')!.textContent).toBe('Enrolled 2026-01-19');

    // A theory course records a step alone, so the instrument is simply absent
    // from the line rather than standing in as an empty part.
    expect(items[1].querySelector('.summary__item-heading')!.textContent).toBe('Theory · Group · Hour · After School');
    expect(items[1].querySelector('.summary__item-assignment')!.textContent).toBe('Lindiwe Mabaso · Step 2B');

    document.body.removeChild(summary);
  });

  it('names the teacher alone for a course type that records neither an instrument nor a step', () => {
    const summary = mount([
      enrollment({ courseType: 'G2Recorder', lessonType: 'Group', instrumentType: null, stepType: null }),
    ]);

    expect(summary.shadowRoot!.querySelector('.summary__item-heading')!.textContent).toBe(
      'Grade 2 Recorder · Group · Half Hour · During School',
    );
    expect(summary.shadowRoot!.querySelector('.summary__item-assignment')!.textContent).toBe('Dawid van Zyl');

    document.body.removeChild(summary);
  });
});

describe('pm-student-courses-summary empty state', { tags: ['268UC27'] }, () => {
  it('reads as an empty state, alongside the siblings and guardians ones, when there are no enrollments', () => {
    const summary = mount([]);

    const empty = summary.shadowRoot!.getElementById('empty') as HTMLElement;
    const list = summary.shadowRoot!.getElementById('list') as HTMLElement;
    expect(empty.hidden).toBe(false);
    expect(empty.textContent).toBe('No course enrollments.');
    expect(list.hidden).toBe(true);
    expect(summary.shadowRoot!.querySelectorAll('.summary__item')).toHaveLength(0);

    document.body.removeChild(summary);
  });
});
