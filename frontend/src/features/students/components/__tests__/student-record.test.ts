import { describe, it, expect } from 'vitest';
import {
  activitiesLine,
  courseEntry,
  guardianColumnCount,
  guardianEntry,
  siblingsLine,
  TWO_COLUMN_WIDTH_PX,
  FIT_ALLOWANCE_PX,
} from '../student-record';
import { PmStudentSiblingsSummary } from '../pm-student-siblings-summary';
import { PmStudentCoursesSummary } from '../pm-student-courses-summary';
import { PmStudentGuardiansSummary } from '../pm-student-guardians-summary';
import type { StudentResult } from '../../services/students';
import type { EnrollmentResult } from '../../services/enrollments';
import type { GuardianRelationship, GuardianResult } from '../../services/guardians';
import type { StudentExtraCurricular } from '../../services/student-extra-curriculars';

function sibling(firstName: string, grade: StudentResult['grade'], cls: StudentResult['class']): StudentResult {
  return {
    studentId: firstName,
    firstName,
    lastName: 'Mokoena',
    dateOfBirth: '2015-03-12',
    grade,
    class: cls,
    phase: 'Junior',
    language: 'English',
  };
}

const relationships: GuardianRelationship[] = [{ guardianRelationshipId: 'r1', name: 'Mother' }];

function guardian(overrides: Partial<GuardianResult> = {}): GuardianResult {
  return {
    guardianId: 'g1',
    guardianRelationshipId: 'r1',
    firstName: 'Nomsa',
    surname: 'Mokoena',
    cell: '082 555 0101',
    email: 'nomsa@example.com',
    receivesCorrespondence: true,
    responsibleForPayment: false,
    married: true,
    restricted: false,
    ...overrides,
  };
}

function textsOf(root: ShadowRoot, selector: string): string[] {
  return Array.from(root.querySelectorAll(selector)).map((element) => element.textContent ?? '');
}

describe('student record siblings line', { tags: ['346UC5'] }, () => {
  it('joins the siblings as the extended view names them', () => {
    const siblings = [sibling('Naledi', 'Grade7', 'A1'), sibling('Jabu', 'Grade4', 'E1')];

    expect(siblingsLine(siblings)).toBe('Naledi Mokoena 7A1, Jabu Mokoena 4E1');

    const summary = new PmStudentSiblingsSummary();
    document.body.appendChild(summary);
    summary.siblings = siblings;
    expect(textsOf(summary.shadowRoot!, '.summary__item').join(', ')).toBe(siblingsLine(siblings));
  });
});

describe('student record course entry', { tags: ['346UC6'] }, () => {
  it('reads the same three lines as the courses summary', () => {
    const enrollment: EnrollmentResult = {
      studentCourseId: 'sc1',
      studentId: 's1',
      courseId: 'c1',
      courseType: 'Instrument',
      lessonType: 'Individual',
      durationType: 'HalfHour',
      occurrenceType: 'DuringSchool',
      teacherId: 't1',
      teacherFirstName: 'Anna',
      teacherSurname: 'Venter',
      instrumentType: 'Piano',
      stepType: 'Step3A',
      enrolledDate: '2024-01-22',
    };

    const entry = courseEntry(enrollment);

    expect(entry).toEqual({
      heading: 'Piano · Individual · Half Hour · During School',
      assignment: 'Anna Venter · Step 3A',
      enrolled: 'Enrolled 2024-01-22',
    });

    const summary = new PmStudentCoursesSummary();
    document.body.appendChild(summary);
    summary.enrollments = [enrollment];
    expect(textsOf(summary.shadowRoot!, '.summary__item-heading')).toEqual([entry.heading]);
    expect(textsOf(summary.shadowRoot!, '.summary__item-assignment')).toEqual([entry.assignment]);
    expect(textsOf(summary.shadowRoot!, '.summary__item-enrolled')).toEqual([entry.enrolled]);
  });
});

describe('student record guardian entry', { tags: ['346UC7'] }, () => {
  it('reads the same heading, contact and flags as the guardians summary', () => {
    const summary = new PmStudentGuardiansSummary();
    document.body.appendChild(summary);
    summary.relationships = relationships;
    summary.guardians = [guardian()];

    const entry = guardianEntry(guardian(), relationships);

    expect(entry).toEqual({
      heading: 'Nomsa Mokoena · Mother',
      cell: '082 555 0101',
      email: 'nomsa@example.com',
      flags: 'Correspondence, Married',
    });
    expect(textsOf(summary.shadowRoot!, '.summary__item-heading')).toEqual([entry.heading]);
    expect(textsOf(summary.shadowRoot!, '.summary__item-contact')).toEqual([`${entry.cell} · ${entry.email}`]);
    expect(textsOf(summary.shadowRoot!, '.summary__item-flags')).toEqual([entry.flags]);
  });

  it('has no flags when none is set', () => {
    const none = guardian({ receivesCorrespondence: false, married: false });

    expect(guardianEntry(none, relationships).flags).toBeNull();
  });
});

describe('student record activities line', { tags: ['346UC8'] }, () => {
  it('lists descriptions only, without practice times', () => {
    const activities: StudentExtraCurricular[] = [
      {
        extraCurricularId: 'e1',
        description: 'Choir',
        phase: 'Junior',
        practiceTimes: [{ practiceTimeId: 'p1', day: 'Monday', startTime: '14:00:00' }],
      },
      {
        extraCurricularId: 'e2',
        description: 'Recorder Ensemble',
        phase: 'Junior',
        practiceTimes: [{ practiceTimeId: 'p1', day: 'Friday', startTime: '13:30:00' }],
      },
    ];

    expect(activitiesLine(activities)).toBe('Choir, Recorder Ensemble');
  });
});

describe('student record guardian columns when every email fits', { tags: ['346UC10'] }, () => {
  it('uses two columns, including exactly at the boundary', () => {
    const boundary = TWO_COLUMN_WIDTH_PX - FIT_ALLOWANCE_PX;

    expect(guardianColumnCount([40, 120])).toBe(2);
    expect(guardianColumnCount([boundary])).toBe(2);
    expect(guardianColumnCount([])).toBe(2);
  });
});

describe('student record guardian columns when one email is too wide', { tags: ['346UC11'] }, () => {
  it('uses one column when any email exceeds a column', () => {
    const boundary = TWO_COLUMN_WIDTH_PX - FIT_ALLOWANCE_PX;

    expect(guardianColumnCount([40, boundary + 1])).toBe(1);
  });
});
