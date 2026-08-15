using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Application.Extensions;

public static class CourseExtensions
{
	public static CourseResult ToResult(this Course course) =>
		new(
			course.CourseId,
			course.CourseType,
			course.Cost,
			course.LessonStructure.LessonStructureId,
			course.LessonStructure.LessonType,
			course.LessonStructure.DurationType,
			course.LessonStructure.OccurrenceType);
}