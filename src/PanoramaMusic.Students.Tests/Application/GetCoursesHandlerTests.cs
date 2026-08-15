using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Handlers.Courses;
using PanoramaMusic.Students.Application.Requests.Courses;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class GetCoursesHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly GetCoursesHandler _handler;

	private readonly LessonStructure _groupHourDuringSchool = LessonStructureFactory.Create(
		lessonType: LessonType.Group, durationType: DurationType.Hour, occurrenceType: OccurrenceType.DuringSchool);

	private readonly LessonStructure _individualHalfHourAfterSchool = LessonStructureFactory.Create(
		lessonType: LessonType.Individual, durationType: DurationType.HalfHour, occurrenceType: OccurrenceType.AfterSchool);

	public GetCoursesHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<GetCoursesHandler>();
	}

	[Fact]
	[Trait("AC", "257UC5")]
	public async Task HandleAsync_NoFilter_ReturnsEveryCourseWithItsLessonStructureDetail()
	{
		var theory = CourseFactory.Create(courseType: CourseType.Theory, cost: 120.00m, lessonStructure: _groupHourDuringSchool);
		var instrument = CourseFactory.Create(courseType: CourseType.Instrument, cost: 450.50m, lessonStructure: _individualHalfHourAfterSchool);
		SetupCourses(CourseFilter.None, theory, instrument);

		var results = await _handler.HandleAsync(
			new GetCoursesRequest(null, null, null, null), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => results.Count.ShouldBe(2),
			() => results[0].CourseType.ShouldBe(CourseType.Theory),
			() => results[0].Cost.ShouldBe(120.00m),
			() => results[0].LessonType.ShouldBe(LessonType.Group),
			() => results[0].DurationType.ShouldBe(DurationType.Hour),
			() => results[0].OccurrenceType.ShouldBe(OccurrenceType.DuringSchool),
			() => results[1].CourseType.ShouldBe(CourseType.Instrument),
			() => results[1].Cost.ShouldBe(450.50m),
			() => results[1].LessonType.ShouldBe(LessonType.Individual),
			() => results[1].DurationType.ShouldBe(DurationType.HalfHour),
			() => results[1].OccurrenceType.ShouldBe(OccurrenceType.AfterSchool));
	}

	[Fact]
	[Trait("AC", "257UC6")]
	public async Task HandleAsync_CourseTypeFilter_NarrowsTheReadToThatCourseType()
	{
		var instrument = CourseFactory.Create(courseType: CourseType.Instrument, lessonStructure: _individualHalfHourAfterSchool);
		var filter = new CourseFilter(CourseType.Instrument, null, null, null);
		SetupCourses(filter, instrument);

		var results = await _handler.HandleAsync(
			new GetCoursesRequest(CourseType.Instrument, null, null, null), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => results.ShouldHaveSingleItem().CourseType.ShouldBe(CourseType.Instrument),
			() => _context.Repositories.CourseRepositoryMock.Verify(
				r => r.GetAllAsync(filter, It.IsAny<CancellationToken>()), Times.Once));
	}

	[Fact]
	[Trait("AC", "257UC7")]
	public async Task HandleAsync_LessonTypeDurationAndOccurrenceFilters_CombineIntoOneNarrowedRead()
	{
		var course = CourseFactory.Create(courseType: CourseType.Theory, lessonStructure: _groupHourDuringSchool);
		var filter = new CourseFilter(null, LessonType.Group, DurationType.Hour, OccurrenceType.DuringSchool);
		SetupCourses(filter, course);

		var results = await _handler.HandleAsync(
			new GetCoursesRequest(null, LessonType.Group, DurationType.Hour, OccurrenceType.DuringSchool),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => results.ShouldHaveSingleItem().LessonType.ShouldBe(LessonType.Group),
			() => results[0].DurationType.ShouldBe(DurationType.Hour),
			() => results[0].OccurrenceType.ShouldBe(OccurrenceType.DuringSchool),
			() => _context.Repositories.CourseRepositoryMock.Verify(
				r => r.GetAllAsync(filter, It.IsAny<CancellationToken>()), Times.Once));
	}

	[Fact]
	[Trait("AC", "257UC8")]
	public async Task HandleAsync_ManyCourses_ReadsEveryLessonStructureInTheOneListQuery()
	{
		var courses = Enumerable
			.Range(0, 5)
			.Select(_ => CourseFactory.Create(lessonStructure: LessonStructureFactory.Create()))
			.ToArray();
		SetupCourses(CourseFilter.None, courses);

		var results = await _handler.HandleAsync(
			new GetCoursesRequest(null, null, null, null), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => results.Count.ShouldBe(5),
			// The list read is the only repository call — the structure detail
			// comes back with it rather than through a lookup per row.
			() => _context.Repositories.CourseRepositoryMock.Verify(
				r => r.GetAllAsync(It.IsAny<CourseFilter>(), It.IsAny<CancellationToken>()), Times.Once),
			() => _context.Repositories.LessonStructureRepositoryMock.Verify(
				r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	private void SetupCourses(CourseFilter filter, params Course[] courses)
	{
		_context.Repositories.CourseRepositoryMock
			.Setup(r => r.GetAllAsync(filter, It.IsAny<CancellationToken>()))
			.ReturnsAsync(courses);
	}
}