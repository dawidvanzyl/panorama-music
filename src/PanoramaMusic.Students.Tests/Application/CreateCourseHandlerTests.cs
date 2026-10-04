using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.Courses;
using PanoramaMusic.Students.Application.Handlers.Courses;
using PanoramaMusic.Students.Application.Requests.Courses;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.Messages;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class CreateCourseHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly CreateCourseHandler _handler;

	public CreateCourseHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<CreateCourseHandler>();
	}

	[Fact]
	[Trait("AC", "257UC1")]
	public async Task HandleAsync_ExistingLessonStructure_PersistsTheCourseAndReturnsItWithItsIdentifier()
	{
		var structure = LessonStructureFactory.Create(
			lessonType: LessonType.Group,
			durationType: DurationType.Hour,
			occurrenceType: OccurrenceType.AfterSchool);
		_context.Repositories.LessonStructureRepositoryMock
			.Setup(r => r.GetByIdAsync(structure.LessonStructureId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(structure);

		var request = new CreateCourseRequest(CourseType.Instrument, 450.50m, structure.LessonStructureId);
		var result = await _handler.HandleAsync(new CreateCourseCommand(request), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.CourseId.ShouldNotBe(Guid.Empty),
			() => result.CourseType.ShouldBe(CourseType.Instrument),
			() => result.Cost.ShouldBe(450.50m),
			() => result.LessonStructureId.ShouldBe(structure.LessonStructureId),
			() => result.LessonType.ShouldBe(LessonType.Group),
			() => result.DurationType.ShouldBe(DurationType.Hour),
			() => result.OccurrenceType.ShouldBe(OccurrenceType.AfterSchool),
			() => _context.Repositories.CourseRepositoryMock.Verify(
				r => r.CreateAsync(
					It.Is<Course>(c => c.CourseType == CourseType.Instrument
						&& c.Cost == 450.50m
						&& c.LessonStructure.LessonStructureId == structure.LessonStructureId),
					It.IsAny<CancellationToken>()),
				Times.Once));
	}

	[Fact]
	[Trait("AC", "257UC2")]
	public async Task HandleAsync_LessonStructureDoesNotExist_ThrowsDomainExceptionAndPersistsNothing()
	{
		_context.Repositories.LessonStructureRepositoryMock
			.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((LessonStructure?)null);

		var request = new CreateCourseRequest(CourseType.Theory, 120.00m, Guid.NewGuid());

		await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(new CreateCourseCommand(request), TestContext.Current.CancellationToken));

		_context.Repositories.CourseRepositoryMock.Verify(
			r => r.CreateAsync(It.IsAny<Course>(), It.IsAny<CancellationToken>()),
			Times.Never);
	}

	[Fact]
	[Trait("AC", "308UC1")]
	public async Task HandleAsync_CourseAlreadyExistsForThePair_ThrowsTheRefusalAndPersistsNothing()
	{
		var structure = LessonStructureFactory.Create(
			lessonType: LessonType.Group,
			durationType: DurationType.HalfHour,
			occurrenceType: OccurrenceType.DuringSchool);
		var existing = CourseFactory.Create(courseType: CourseType.G2Recorder, lessonStructure: structure);
		_context.Repositories.LessonStructureRepositoryMock
			.Setup(r => r.GetByIdAsync(structure.LessonStructureId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(structure);
		_context.Repositories.CourseRepositoryMock
			.Setup(r => r.GetByTypeAndStructureAsync(CourseType.G2Recorder, structure.LessonStructureId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(existing);

		var request = new CreateCourseRequest(CourseType.G2Recorder, 300.00m, structure.LessonStructureId);
		var exception = await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(new CreateCourseCommand(request), TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => exception.Message.ShouldBe(CourseMessages.AlreadyExists(CourseType.G2Recorder, structure)),
			() => _context.Repositories.CourseRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<Course>(), It.IsAny<CancellationToken>()),
				Times.Never));
	}

	[Fact]
	[Trait("AC", "308UC2")]
	public async Task HandleAsync_OtherCourseTypeOnTheSameStructure_IsAccepted()
	{
		var structure = LessonStructureFactory.Create();
		var existing = CourseFactory.Create(courseType: CourseType.Theory, lessonStructure: structure);
		_context.Repositories.LessonStructureRepositoryMock
			.Setup(r => r.GetByIdAsync(structure.LessonStructureId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(structure);
		_context.Repositories.CourseRepositoryMock
			.Setup(r => r.GetByTypeAndStructureAsync(CourseType.Theory, structure.LessonStructureId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(existing);

		var request = new CreateCourseRequest(CourseType.Instrument, 450.00m, structure.LessonStructureId);
		var result = await _handler.HandleAsync(new CreateCourseCommand(request), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.CourseType.ShouldBe(CourseType.Instrument),
			() => _context.Repositories.CourseRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<Course>(), It.IsAny<CancellationToken>()),
				Times.Once));
	}

	[Fact]
	[Trait("AC", "308UC3")]
	public async Task HandleAsync_SameCourseTypeOnAnotherStructure_IsAccepted()
	{
		var heldStructure = LessonStructureFactory.Create();
		var otherStructure = LessonStructureFactory.Create(durationType: DurationType.Hour);
		var existing = CourseFactory.Create(courseType: CourseType.Theory, lessonStructure: heldStructure);
		_context.Repositories.LessonStructureRepositoryMock
			.Setup(r => r.GetByIdAsync(otherStructure.LessonStructureId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(otherStructure);
		_context.Repositories.CourseRepositoryMock
			.Setup(r => r.GetByTypeAndStructureAsync(CourseType.Theory, heldStructure.LessonStructureId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(existing);

		var request = new CreateCourseRequest(CourseType.Theory, 120.00m, otherStructure.LessonStructureId);
		var result = await _handler.HandleAsync(new CreateCourseCommand(request), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.LessonStructureId.ShouldBe(otherStructure.LessonStructureId),
			() => _context.Repositories.CourseRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<Course>(), It.IsAny<CancellationToken>()),
				Times.Once));
	}
}
