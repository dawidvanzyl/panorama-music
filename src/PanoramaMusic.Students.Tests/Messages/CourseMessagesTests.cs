using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Messages;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Messages;

public class CourseMessagesTests
{
	[Theory]
	[Trait("AC", "308UC1")]
	[InlineData(CourseType.Theory, LessonType.Individual, DurationType.Hour, OccurrenceType.DuringSchool,
		"A Theory course already exists for Individual · Hour · During School.")]
	[InlineData(CourseType.GREEnrichment, LessonType.Individual, DurationType.HalfHour, OccurrenceType.AfterSchool,
		"A GR Enrichment course already exists for Individual · Half Hour · After School.")]
	[InlineData(CourseType.G1Enrichment, LessonType.Group, DurationType.Hour, OccurrenceType.AfterSchool,
		"A Grade 1 Enrichment course already exists for Group · Hour · After School.")]
	[InlineData(CourseType.G2Recorder, LessonType.Group, DurationType.HalfHour, OccurrenceType.DuringSchool,
		"A Grade 2 Recorder course already exists for Group · Half Hour · During School.")]
	[InlineData(CourseType.Instrument, LessonType.Group, DurationType.Hour, OccurrenceType.DuringSchool,
		"A Instrument course already exists for Group · Hour · During School.")]
	public void AlreadyExists_AnyCourseTypeAndStructure_NamesThemWithTheScreenLabels(
		CourseType courseType,
		LessonType lessonType,
		DurationType durationType,
		OccurrenceType occurrenceType,
		string expected)
	{
		var structure = LessonStructureFactory.Create(
			lessonType: lessonType,
			durationType: durationType,
			occurrenceType: occurrenceType);

		var message = CourseMessages.AlreadyExists(courseType, structure);

		message.ShouldBe(expected);
	}
}
