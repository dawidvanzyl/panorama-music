using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Tests.Factories;

public static class LessonStructureFactory
{
	public static LessonStructure Create(
		Guid? lessonStructureId = null,
		LessonType lessonType = LessonType.Individual,
		DurationType durationType = DurationType.HalfHour,
		OccurrenceType occurrenceType = OccurrenceType.DuringSchool) =>
		new(lessonStructureId ?? Guid.NewGuid(), lessonType, durationType, occurrenceType);
}