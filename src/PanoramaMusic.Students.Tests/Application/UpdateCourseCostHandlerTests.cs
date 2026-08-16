using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.Courses;
using PanoramaMusic.Students.Application.Handlers.Courses;
using PanoramaMusic.Students.Application.Requests.Courses;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class UpdateCourseCostHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly UpdateCourseCostHandler _handler;

	public UpdateCourseCostHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<UpdateCourseCostHandler>();
	}

	[Fact]
	[Trait("AC", "258UC1")]
	public async Task HandleAsync_ExistingCourse_PersistsTheNewCostAsAnExactDecimalAndReturnsIt()
	{
		var course = CourseFactory.Create(cost: 450.50m);
		_context.Repositories.CourseRepositoryMock
			.Setup(r => r.GetByIdAsync(course.CourseId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(course);

		var request = new UpdateCourseRequest(499.99m);
		var result = await _handler.HandleAsync(
			new UpdateCourseCostCommand(course.CourseId, request), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Cost.ShouldBe(499.99m),
			// The scale is carried through unshifted, not rounded off a double.
			() => decimal.GetBits(result.Cost)[3].ShouldBe(2 << 16),
			() => _context.Repositories.CourseRepositoryMock.Verify(
				r => r.UpdateCostAsync(
					It.Is<Course>(c => c.CourseId == course.CourseId && c.Cost == 499.99m),
					It.IsAny<CancellationToken>()),
				Times.Once));
	}

	[Fact]
	[Trait("AC", "258UC2")]
	public async Task HandleAsync_CostUpdated_LeavesTheCourseTypeAndLessonStructureLinkUntouched()
	{
		var structure = LessonStructureFactory.Create(
			lessonType: LessonType.Individual,
			durationType: DurationType.HalfHour,
			occurrenceType: OccurrenceType.AfterSchool);
		var course = CourseFactory.Create(courseType: CourseType.Instrument, cost: 450.50m, lessonStructure: structure);
		_context.Repositories.CourseRepositoryMock
			.Setup(r => r.GetByIdAsync(course.CourseId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(course);

		var result = await _handler.HandleAsync(
			new UpdateCourseCostCommand(course.CourseId, new UpdateCourseRequest(600.00m)),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.CourseType.ShouldBe(CourseType.Instrument),
			() => result.LessonStructureId.ShouldBe(structure.LessonStructureId),
			() => result.LessonType.ShouldBe(LessonType.Individual),
			() => result.DurationType.ShouldBe(DurationType.HalfHour),
			() => result.OccurrenceType.ShouldBe(OccurrenceType.AfterSchool));
	}

	[Fact]
	[Trait("AC", "258UC4")]
	public async Task HandleAsync_UnknownCourseId_ThrowsEntityNotFoundExceptionAndPersistsNothing()
	{
		var courseId = Guid.NewGuid();
		_context.Repositories.CourseRepositoryMock
			.Setup(r => r.GetByIdAsync(courseId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((Course?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(
				new UpdateCourseCostCommand(courseId, new UpdateCourseRequest(120.00m)),
				TestContext.Current.CancellationToken));

		_context.Repositories.CourseRepositoryMock.Verify(
			r => r.UpdateCostAsync(It.IsAny<Course>(), It.IsAny<CancellationToken>()),
			Times.Never);
	}
}