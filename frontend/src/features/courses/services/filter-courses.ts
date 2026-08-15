import type { Course, CourseType, DurationType, LessonType, OccurrenceType } from './courses';

export interface CourseFilters {
  courseType?: CourseType;
  lessonType?: LessonType;
  durationType?: DurationType;
  occurrenceType?: OccurrenceType;
}

/** Applies the course type, lesson type, duration and occurrence filters to a
 * cached catalogue — a client-side concern, not a server round trip. */
export function filterCourses(courses: Course[], filters: CourseFilters): Course[] {
  return courses.filter((course) => {
    if (filters.courseType && course.courseType !== filters.courseType) return false;
    if (filters.lessonType && course.lessonType !== filters.lessonType) return false;
    if (filters.durationType && course.durationType !== filters.durationType) return false;
    if (filters.occurrenceType && course.occurrenceType !== filters.occurrenceType) return false;
    return true;
  });
}
