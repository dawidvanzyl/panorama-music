using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Infrastructure.Dtos;

namespace PanoramaMusic.Students.Infrastructure.Extensions;

internal static class CourseDtoExtensions
{
	internal static Course MapToCourse(this CourseDto dto) =>
		new(
			dto.Course_Id,
			Enum.Parse<CourseType>(dto.Course_Type),
			dto.Cost,
			new LessonStructure(
				dto.Lesson_Structure_Id,
				Enum.Parse<LessonType>(dto.Lesson_Type),
				Enum.Parse<DurationType>(dto.Duration_Type),
				Enum.Parse<OccurrenceType>(dto.Occurrence_Type)));
}
