import { describe, it, expect } from 'vitest';
import { filterCourses } from '../filter-courses';
import type { Course } from '../courses';

const theoryGroupHourDuring: Course = {
  courseId: 'c1',
  courseType: 'Theory',
  cost: '120.00',
  lessonStructureId: 'ls1',
  lessonType: 'Group',
  durationType: 'Hour',
  occurrenceType: 'DuringSchool',
};

const instrumentIndividualHalfAfter: Course = {
  courseId: 'c2',
  courseType: 'Instrument',
  cost: '450.50',
  lessonStructureId: 'ls2',
  lessonType: 'Individual',
  durationType: 'HalfHour',
  occurrenceType: 'AfterSchool',
};

const theoryIndividualHourAfter: Course = {
  courseId: 'c3',
  courseType: 'Theory',
  cost: '300.00',
  lessonStructureId: 'ls3',
  lessonType: 'Individual',
  durationType: 'Hour',
  occurrenceType: 'AfterSchool',
};

const catalogue = [theoryGroupHourDuring, instrumentIndividualHalfAfter, theoryIndividualHourAfter];

describe('filterCourses — narrows the catalogue by course type', { tags: ['257UC6'] }, () => {
  it('keeps only courses of the selected type', () => {
    expect(filterCourses(catalogue, { courseType: 'Theory' })).toEqual([
      theoryGroupHourDuring,
      theoryIndividualHourAfter,
    ]);
  });

  it('leaves the catalogue whole when no filter is selected', () => {
    expect(filterCourses(catalogue, {})).toEqual(catalogue);
  });
});

describe('filterCourses — narrows by lesson structure and combines', { tags: ['257UC7'] }, () => {
  it('keeps only courses whose lesson structure matches each single filter', () => {
    expect(filterCourses(catalogue, { lessonType: 'Group' })).toEqual([theoryGroupHourDuring]);
    expect(filterCourses(catalogue, { durationType: 'HalfHour' })).toEqual([instrumentIndividualHalfAfter]);
    expect(filterCourses(catalogue, { occurrenceType: 'DuringSchool' })).toEqual([theoryGroupHourDuring]);
  });

  it('combines the four dimensions rather than treating them as alternatives', () => {
    expect(
      filterCourses(catalogue, {
        courseType: 'Theory',
        lessonType: 'Individual',
        durationType: 'Hour',
        occurrenceType: 'AfterSchool',
      }),
    ).toEqual([theoryIndividualHourAfter]);

    // The same selection but for a course type nothing in the catalogue pairs with.
    expect(
      filterCourses(catalogue, {
        courseType: 'Instrument',
        lessonType: 'Individual',
        durationType: 'Hour',
        occurrenceType: 'AfterSchool',
      }),
    ).toEqual([]);
  });
});
