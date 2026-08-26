using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.StudentExtraCurriculars;
using PanoramaMusic.Students.Application.Handlers.StudentExtraCurriculars;
using PanoramaMusic.Students.Application.Requests.StudentExtraCurriculars;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

/// <summary>
/// Assigning a student to an extra-curricular activity and removing one of their
/// assignments. Each test starts from what the student already takes part in and
/// asserts what the use case wrote — or refused to write — against it.
/// </summary>
public class StudentExtraCurricularHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly AssignExtraCurricularHandler _assignHandler;
	private readonly RemoveExtraCurricularHandler _removeHandler;
	private readonly GetStudentExtraCurricularsHandler _getHandler;

	public StudentExtraCurricularHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_assignHandler = _context.ServiceProvider.GetRequiredService<AssignExtraCurricularHandler>();
		_removeHandler = _context.ServiceProvider.GetRequiredService<RemoveExtraCurricularHandler>();
		_getHandler = _context.ServiceProvider.GetRequiredService<GetStudentExtraCurricularsHandler>();
	}

	[Fact]
	[Trait("AC", "277UC1")]
	public async Task HandleAsync_ActivityOfTheStudentsOwnPhase_PersistsTheAssignmentAndListsIt()
	{
		var student = GivenStudent(PhaseType.Junior);
		var activity = GivenActivity("Marimba Band", PhaseType.Junior);
		var writes = CaptureWrites();

		var result = await _assignHandler.HandleAsync(
			new AssignExtraCurricularCommand(student.StudentId, new AssignExtraCurricularRequest(activity.ExtraCurricularId)),
			TestContext.Current.CancellationToken);

		// The assignment the write left behind is then what the student's list is
		// read back from, so "persisted" and "returned in the list" are the same
		// row rather than two arrangements that happen to agree.
		GivenAssigned(student, [.. writes.Created.Select(assignment => assignment.ExtraCurricular)]);
		var listed = await _getHandler.HandleAsync(student.StudentId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.ExtraCurricularId.ShouldBe(activity.ExtraCurricularId),
			() => writes.Created.Count.ShouldBe(1),
			() => writes.Created[0].StudentId.ShouldBe(student.StudentId),
			() => writes.Created[0].ExtraCurricular.ExtraCurricularId.ShouldBe(activity.ExtraCurricularId),
			() => writes.Deleted.ShouldBeEmpty(),
			() => listed.Select(entry => entry.ExtraCurricularId).ShouldBe([activity.ExtraCurricularId]));
	}

	[Fact]
	[Trait("AC", "277UC2")]
	public async Task HandleAsync_SecondActivityForAStudentWhoAlreadyHoldsOne_PersistsBothAndReturnsBoth()
	{
		var student = GivenStudent(PhaseType.Junior);
		var held = GivenActivity("Choir", PhaseType.Junior);
		var second = GivenActivity("String Orchestra", PhaseType.Junior);
		GivenAssigned(student, [held]);
		var writes = CaptureWrites();

		await _assignHandler.HandleAsync(
			new AssignExtraCurricularCommand(student.StudentId, new AssignExtraCurricularRequest(second.ExtraCurricularId)),
			TestContext.Current.CancellationToken);

		GivenAssigned(student, [held, second]);
		var listed = await _getHandler.HandleAsync(student.StudentId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			// The second assignment is its own write — it did not replace the first,
			// and nothing was deleted to make room for it.
			() => writes.Created.Count.ShouldBe(1),
			() => writes.Created[0].ExtraCurricular.ExtraCurricularId.ShouldBe(second.ExtraCurricularId),
			() => writes.Deleted.ShouldBeEmpty(),
			() => listed.Select(entry => entry.Description).ShouldBe(["Choir", "String Orchestra"]));
	}

	[Fact]
	[Trait("AC", "277UC3")]
	public async Task HandleAsync_ActivityTheStudentAlreadyTakesPartIn_IsRefusedAndPersistsNoDuplicate()
	{
		var student = GivenStudent(PhaseType.Junior);
		var held = GivenActivity("Choir", PhaseType.Junior);
		GivenAssigned(student, [held]);
		var writes = CaptureWrites();

		var thrown = await Should.ThrowAsync<DomainException>(() => _assignHandler.HandleAsync(
			new AssignExtraCurricularCommand(student.StudentId, new AssignExtraCurricularRequest(held.ExtraCurricularId)),
			TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => thrown.Message.ShouldBe("The student already takes part in this activity."),
			() => writes.Created.ShouldBeEmpty());
	}

	[Fact]
	[Trait("AC", "277UC4")]
	public async Task HandleAsync_OneOfSeveralAssignments_DeletesOnlyThatOneAndLeavesTheRest()
	{
		var student = GivenStudent(PhaseType.Junior);
		var choir = GivenActivity("Choir", PhaseType.Junior);
		// The middle one: removing by position rather than by the activity asked for
		// takes out a neighbour, which targeting the first or the last would hide.
		var drumline = GivenActivity("Junior Drumline", PhaseType.Junior);
		var orchestra = GivenActivity("String Orchestra", PhaseType.Junior);
		GivenAssigned(student, [choir, drumline, orchestra]);
		var writes = CaptureWrites();

		await _removeHandler.HandleAsync(
			new RemoveExtraCurricularCommand(student.StudentId, drumline.ExtraCurricularId),
			TestContext.Current.CancellationToken);

		GivenAssigned(student, [choir, orchestra]);
		var listed = await _getHandler.HandleAsync(student.StudentId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => writes.Deleted.Count.ShouldBe(1),
			() => writes.Deleted[0].StudentId.ShouldBe(student.StudentId),
			() => writes.Deleted[0].ExtraCurricular.ExtraCurricularId.ShouldBe(drumline.ExtraCurricularId),
			() => writes.Created.ShouldBeEmpty(),
			() => listed.Select(entry => entry.Description).ShouldBe(["Choir", "String Orchestra"]));
	}

	[Fact]
	[Trait("AC", "277UC5")]
	public async Task HandleAsync_AssignedActivitiesAreRead_EachCarriesItsDescriptionPhaseAndSlotsInWeekOrder()
	{
		var student = GivenStudent(PhaseType.Senior);
		// Handed over in an order the week does not run in, and led by a Sunday —
		// DayOfWeek numbers Sunday as 0, so a bare enum sort would lead with it.
		var activity = GivenActivity(
			"Senior Band",
			PhaseType.Senior,
			(DayOfWeek.Sunday, new TimeOnly(9, 0)),
			(DayOfWeek.Monday, new TimeOnly(15, 30)),
			(DayOfWeek.Monday, new TimeOnly(7, 5)));
		GivenAssigned(student, [activity]);

		var listed = await _getHandler.HandleAsync(student.StudentId, TestContext.Current.CancellationToken);

		var entry = listed.ShouldHaveSingleItem();
		ShouldlyHelpers.Satisfy(
			() => entry.Description.ShouldBe("Senior Band"),
			() => entry.Phase.ShouldBe(PhaseType.Senior),
			() => entry.PracticeTimes.Select(slot => $"{slot.Day} {slot.StartTime:HH\\:mm}")
				.ShouldBe(["Monday 07:05", "Monday 15:30", "Sunday 09:00"]));
	}

	[Fact]
	[Trait("AC", "277UC7")]
	public async Task HandleAsync_ActivityOfADifferentPhase_IsRefusedAndPersistsNothing()
	{
		var student = GivenStudent(PhaseType.Junior);
		var senior = GivenActivity("Senior Band", PhaseType.Senior);
		GivenAssigned(student, []);
		var writes = CaptureWrites();

		var thrown = await Should.ThrowAsync<DomainException>(() => _assignHandler.HandleAsync(
			new AssignExtraCurricularCommand(student.StudentId, new AssignExtraCurricularRequest(senior.ExtraCurricularId)),
			TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => thrown.Message.ShouldBe("A student can only be assigned to an activity offered to their own phase."),
			() => writes.Created.ShouldBeEmpty());
	}

	[Fact]
	[Trait("AC", "277UC8")]
	public async Task HandleAsync_UnknownStudentOrActivity_IsReportedAsNotFoundAndPersistsNothing()
	{
		var student = GivenStudent(PhaseType.Junior);
		var activity = GivenActivity("Choir", PhaseType.Junior);
		GivenAssigned(student, [activity]);
		var writes = CaptureWrites();
		var unknown = Guid.NewGuid();

		var unknownStudent = await Should.ThrowAsync<EntityNotFoundException>(() => _assignHandler.HandleAsync(
			new AssignExtraCurricularCommand(unknown, new AssignExtraCurricularRequest(activity.ExtraCurricularId)),
			TestContext.Current.CancellationToken));
		var unknownActivity = await Should.ThrowAsync<EntityNotFoundException>(() => _assignHandler.HandleAsync(
			new AssignExtraCurricularCommand(student.StudentId, new AssignExtraCurricularRequest(unknown)),
			TestContext.Current.CancellationToken));
		// A real student asked to give up an assignment they do not hold — the same
		// answer as a student who does not exist, and the only one of the three the
		// removal path can reach on its own.
		var unknownAssignment = await Should.ThrowAsync<EntityNotFoundException>(() => _removeHandler.HandleAsync(
			new RemoveExtraCurricularCommand(student.StudentId, unknown),
			TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => unknownStudent.Message.ShouldContain(unknown.ToString()),
			() => unknownActivity.Message.ShouldContain(unknown.ToString()),
			() => unknownAssignment.Message.ShouldContain(unknown.ToString()),
			() => writes.Created.ShouldBeEmpty(),
			() => writes.Deleted.ShouldBeEmpty());
	}

	/// <summary>
	/// A student the repository will hand back for their own identifier, and for no
	/// other — so a test can ask for one who does not exist without arranging
	/// anything further.
	/// </summary>
	private Student GivenStudent(PhaseType phase)
	{
		var student = StudentFactory.Create(phase: phase);

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);

		return student;
	}

	private ExtraCurricular GivenActivity(
		string description,
		PhaseType phase,
		params (DayOfWeek Day, TimeOnly StartTime)[] slots)
	{
		var activity = ExtraCurricularFactory.Create(description: description, phase: phase, slots: slots);

		_context.Repositories.ExtraCurricularRepositoryMock
			.Setup(r => r.GetByIdAsync(activity.ExtraCurricularId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(activity);

		return activity;
	}

	/// <summary>What the student already takes part in, and — consistently with it —
	/// which of those the membership test answers yes for.</summary>
	private void GivenAssigned(Student student, IList<ExtraCurricular> activities)
	{
		_context.Repositories.StudentExtraCurricularRepositoryMock
			.Setup(r => r.GetByStudentIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([.. activities.Select(activity => new StudentExtraCurricular(student.StudentId, activity))]);

		_context.Repositories.StudentExtraCurricularRepositoryMock
			.Setup(r => r.ExistsAsync(student.StudentId, It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((Guid _, Guid extraCurricularId, CancellationToken _) =>
				activities.Any(activity => activity.ExtraCurricularId == extraCurricularId));
	}

	/// <summary>What the handler asked the repository to write.</summary>
	private CapturedWrites CaptureWrites()
	{
		var captured = new CapturedWrites();

		_context.Repositories.StudentExtraCurricularRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<StudentExtraCurricular>(), It.IsAny<CancellationToken>()))
			.Callback<StudentExtraCurricular, CancellationToken>((assignment, _) => captured.Created.Add(assignment))
			.Returns(Task.CompletedTask);

		_context.Repositories.StudentExtraCurricularRepositoryMock
			.Setup(r => r.DeleteAsync(It.IsAny<StudentExtraCurricular>(), It.IsAny<CancellationToken>()))
			.Callback<StudentExtraCurricular, CancellationToken>((assignment, _) => captured.Deleted.Add(assignment))
			.Returns(Task.CompletedTask);

		return captured;
	}

	private sealed class CapturedWrites
	{
		public List<StudentExtraCurricular> Created { get; } = [];

		public List<StudentExtraCurricular> Deleted { get; } = [];
	}
}
