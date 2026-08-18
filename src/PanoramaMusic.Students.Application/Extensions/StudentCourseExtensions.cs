using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.ValueObjects;

namespace PanoramaMusic.Students.Application.Extensions;

public static class StudentCourseExtensions
{
	public static StudentCourseResult ToResult(this StudentCourse enrollment, DirectoryTeacher teacher) =>
		new(
			enrollment.StudentCourseId,
			enrollment.StudentId,
			enrollment.Course.CourseId,
			enrollment.Course.CourseType,
			enrollment.Course.LessonStructure.LessonStructureId,
			enrollment.Course.LessonStructure.LessonType,
			enrollment.Course.LessonStructure.DurationType,
			enrollment.Course.LessonStructure.OccurrenceType,
			teacher.TeacherId,
			teacher.FirstName,
			teacher.Surname,
			enrollment.Instrument?.InstrumentType,
			enrollment.Instrument?.StepType,
			enrollment.EnrolledDate);
}