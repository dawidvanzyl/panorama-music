using PanoramaMusic.Students.Application.Models;
using PanoramaMusic.Students.Domain.Entities;

namespace PanoramaMusic.Students.Application.Extensions;

public static class LessonStructureExtensions
{
	public static LessonStructureResult ToResult(this LessonStructure lessonStructure) =>
		new(
			lessonStructure.LessonStructureId,
			lessonStructure.LessonType,
			lessonStructure.DurationType,
			lessonStructure.OccurrenceType);
}