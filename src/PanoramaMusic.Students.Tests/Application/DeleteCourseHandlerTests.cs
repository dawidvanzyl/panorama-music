using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.Courses;
using PanoramaMusic.Students.Application.Handlers.Courses;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class DeleteCourseHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly DeleteCourseHandler _handler;

	public DeleteCourseHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<DeleteCourseHandler>();
	}

	[Fact]
	[Trait("AC", "258UC5")]
	public async Task HandleAsync_ExistingCourse_RemovesTheCourseAndLeavesItsLessonStructureAlone()
	{
		var structure = LessonStructureFactory.Create();
		var course = CourseFactory.Create(lessonStructure: structure);
		_context.Repositories.CourseRepositoryMock
			.Setup(r => r.GetByIdAsync(course.CourseId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(course);

		await _handler.HandleAsync(new DeleteCourseCommand(course.CourseId), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.CourseRepositoryMock.Verify(
				r => r.DeleteAsync(
					It.Is<Course>(c => c.CourseId == course.CourseId), It.IsAny<CancellationToken>()),
				Times.Once),
			// The seeded structure the course pointed at is reference data; a course
			// deletion never reaches it.
			() => _context.Repositories.LessonStructureRepositoryMock.VerifyNoOtherCalls());
	}

	[Fact]
	[Trait("AC", "258UC6")]
	public async Task HandleAsync_UnknownCourseId_ThrowsEntityNotFoundExceptionAndDeletesNothing()
	{
		var courseId = Guid.NewGuid();
		_context.Repositories.CourseRepositoryMock
			.Setup(r => r.GetByIdAsync(courseId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((Course?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(new DeleteCourseCommand(courseId), TestContext.Current.CancellationToken));

		_context.Repositories.CourseRepositoryMock.Verify(
			r => r.DeleteAsync(It.IsAny<Course>(), It.IsAny<CancellationToken>()),
			Times.Never);
	}
}