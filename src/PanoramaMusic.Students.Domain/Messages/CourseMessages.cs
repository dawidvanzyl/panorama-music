using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;

namespace PanoramaMusic.Students.Domain.Messages;

/// <summary>
/// Why a course was refused. The wording uses the labels the course screen shows,
/// so a refusal names the course the way the Coordinator picked it.
/// </summary>
public static class CourseMessages
{
	/// <summary>
	/// Names the course type and the lesson structure that are already taken, e.g.
	/// A Grade 2 Recorder course already exists for Group · Half Hour · During School.
	/// </summary>
	public static string AlreadyExists(CourseType courseType, LessonStructure lessonStructure) =>
		$"A {Label(courseType)} course already exists for "
		+ $"{Label(lessonStructure.LessonType)} · {Label(lessonStructure.DurationType)} · {Label(lessonStructure.OccurrenceType)}.";

	private static string Label(CourseType courseType) => courseType switch
	{
		CourseType.Theory => "Theory",
		CourseType.GREEnrichment => "GR Enrichment",
		CourseType.G1Enrichment => "Grade 1 Enrichment",
		CourseType.G2Recorder => "Grade 2 Recorder",
		CourseType.Instrument => "Instrument",
		_ => throw new ArgumentOutOfRangeException(nameof(courseType), courseType, null),
	};

	private static string Label(LessonType lessonType) => lessonType switch
	{
		LessonType.Individual => "Individual",
		LessonType.Group => "Group",
		_ => throw new ArgumentOutOfRangeException(nameof(lessonType), lessonType, null),
	};

	private static string Label(DurationType durationType) => durationType switch
	{
		DurationType.Hour => "Hour",
		DurationType.HalfHour => "Half Hour",
		_ => throw new ArgumentOutOfRangeException(nameof(durationType), durationType, null),
	};

	private static string Label(OccurrenceType occurrenceType) => occurrenceType switch
	{
		OccurrenceType.DuringSchool => "During School",
		OccurrenceType.AfterSchool => "After School",
		_ => throw new ArgumentOutOfRangeException(nameof(occurrenceType), occurrenceType, null),
	};
}