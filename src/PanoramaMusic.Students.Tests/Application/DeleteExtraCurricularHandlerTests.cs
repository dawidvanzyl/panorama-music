using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.ExtraCurriculars;
using PanoramaMusic.Students.Application.Handlers.ExtraCurriculars;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class DeleteExtraCurricularHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly DeleteExtraCurricularHandler _deleteHandler;
	private readonly CountExtraCurricularStudentsHandler _countHandler;

	public DeleteExtraCurricularHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_deleteHandler = _context.ServiceProvider.GetRequiredService<DeleteExtraCurricularHandler>();
		_countHandler = _context.ServiceProvider.GetRequiredService<CountExtraCurricularStudentsHandler>();
	}

	[Fact]
	[Trait("AC", "278UC4")]
	public async Task CountHandleAsync_ActivityWithAssignedStudents_ReturnsHowManyTakePartInIt()
	{
		var activity = GivenActivity(assignedStudents: 24);

		var result = await _countHandler.HandleAsync(activity.ExtraCurricularId, TestContext.Current.CancellationToken);

		result.Count.ShouldBe(24);
	}

	[Fact]
	[Trait("AC", "278UC5")]
	public async Task HandleAsync_NoAssignedStudents_DeletesTheActivityAndItsPracticeTimesGoWithIt()
	{
		var activity = GivenActivity(
			assignedStudents: 0,
			slots: [(DayOfWeek.Monday, new TimeOnly(15, 0)), (DayOfWeek.Thursday, new TimeOnly(15, 0))]);
		var deleted = CaptureDeleted();

		await _deleteHandler.HandleAsync(
			new DeleteExtraCurricularCommand(activity.ExtraCurricularId),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => deleted.Activity.ShouldNotBeNull(),
			() => deleted.Activity!.ExtraCurricularId.ShouldBe(activity.ExtraCurricularId),
			// One delete, not a slot-by-slot sweep: the slots go with the activity
			// through the schema's cascade, which is what leaves no orphan.
			() => _context.Repositories.ExtraCurricularRepositoryMock.Verify(
				r => r.DeletePracticeTimeAsync(It.IsAny<ExtraCurricular>(), It.IsAny<ExtraCurricularPracticeTime>(), It.IsAny<CancellationToken>()),
				Times.Never),
			// The activity handed to the write still carries its slots, so the
			// audit record can name what went with it.
			() => deleted.Activity!.PracticeTimes.Count.ShouldBe(2));
	}

	[Fact]
	[Trait("AC", "278UC6")]
	public async Task HandleAsync_AtLeastOneAssignedStudent_ThrowsDomainExceptionNamingTheActivityAndChangesNothing()
	{
		var activity = GivenActivity(assignedStudents: 24, description: "Choir");
		var deleted = CaptureDeleted();

		var exception = await Should.ThrowAsync<DomainException>(async () => await _deleteHandler.HandleAsync(
			new DeleteExtraCurricularCommand(activity.ExtraCurricularId),
			TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			// The same words the row-level banner shows.
			() => exception.Message.ShouldBe("Choir has 24 assigned student(s) and cannot be deleted."),
			() => deleted.Activity.ShouldBeNull(),
			// The assignments are only counted here, never touched.
			() => _context.Repositories.StudentExtraCurricularRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<StudentExtraCurricular>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "278UC7")]
	public async Task HandleAsync_UnknownActivity_ThrowsEntityNotFoundAndDeletesNothing()
	{
		_context.Repositories.ExtraCurricularRepositoryMock
			.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((ExtraCurricular?)null);
		var deleted = CaptureDeleted();

		await Should.ThrowAsync<EntityNotFoundException>(async () => await _deleteHandler.HandleAsync(
			new DeleteExtraCurricularCommand(Guid.NewGuid()),
			TestContext.Current.CancellationToken));

		deleted.Activity.ShouldBeNull();
	}

	/// <summary>An activity the repository reads back, with that many students assigned to it.</summary>
	private ExtraCurricular GivenActivity(
		int assignedStudents,
		string description = "Recorder Group",
		(DayOfWeek Day, TimeOnly StartTime)[]? slots = null)
	{
		var activity = ExtraCurricularFactory.Create(Guid.NewGuid(), description, PhaseType.Junior, slots ?? []);

		_context.Repositories.ExtraCurricularRepositoryMock
			.Setup(r => r.GetByIdAsync(activity.ExtraCurricularId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(activity);

		_context.Repositories.StudentExtraCurricularRepositoryMock
			.Setup(r => r.CountByExtraCurricularIdAsync(activity.ExtraCurricularId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(assignedStudents);

		return activity;
	}

	/// <summary>The activity the handler asked the repository to delete, once it did.</summary>
	private CapturedDelete CaptureDeleted()
	{
		var captured = new CapturedDelete();

		_context.Repositories.ExtraCurricularRepositoryMock
			.Setup(r => r.DeleteAsync(It.IsAny<ExtraCurricular>(), It.IsAny<CancellationToken>()))
			.Callback<ExtraCurricular, CancellationToken>((extraCurricular, _) => captured.Activity = extraCurricular)
			.Returns(Task.CompletedTask);

		return captured;
	}

	private sealed class CapturedDelete
	{
		public ExtraCurricular? Activity { get; set; }
	}
}