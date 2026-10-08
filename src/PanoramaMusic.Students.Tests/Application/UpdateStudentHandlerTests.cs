using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Domain.Exceptions;
using PanoramaMusic.Students.Application.Commands.Students;
using PanoramaMusic.Students.Application.Handlers.Students;
using PanoramaMusic.Students.Application.Requests.Students;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.StudentExtraCurriculars;
using PanoramaMusic.Students.Domain.Events.Students;
using PanoramaMusic.Students.Domain.Messages;
using PanoramaMusic.Students.Tests.Factories;
using PanoramaMusic.Testing;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class UpdateStudentHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly UpdateStudentHandler _handler;

	public UpdateStudentHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<UpdateStudentHandler>();
	}

	[Fact]
	[Trait("AC", "200UC3")]
	public async Task HandleAsync_ValidUpdate_PersistsChangesAndReturnsUpdatedStudent()
	{
		var student = StudentFactory.Create(firstName: "Alice", lastName: "Vance", grade: GradeType.Grade4);
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.UpdateAsync(It.IsAny<Student>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);
		GivenAssignments(student);

		var request = new UpdateStudentRequest(
			"Alicia",
			"Vance",
			student.DateOfBirth,
			GradeType.Grade5,
			ClassType.E1,
			PhaseType.Senior,
			Language.Afrikaans);

		var result = await _handler.HandleAsync(
			new UpdateStudentCommand(student.StudentId, request),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.ShouldSatisfyAllConditions(
				() => result.FirstName.ShouldBe("Alicia"),
				() => result.Grade.ShouldBe(GradeType.Grade5),
				() => result.Class.ShouldBe(ClassType.E1),
				() => result.Phase.ShouldBe(PhaseType.Senior),
				() => result.Language.ShouldBe(Language.Afrikaans)),
			() => _context.Repositories.StudentRepositoryMock.Verify(
				r => r.UpdateAsync(student, TestContext.Current.CancellationToken), Times.Once));
	}

	[Fact]
	[Trait("AC", "300UC14")]
	public async Task HandleAsync_ARosterEdit_RaisesTheUpdateNamingTheRosterAsItsSource()
	{
		// The roster is where a student record lives, and its source is what
		// makes the audit record it produces byte-identical to what this path
		// emitted before the waiting list needed naming.
		var student = StudentFactory.Create(firstName: "Alice", lastName: "Vance");
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		GivenAssignments(student);

		var request = new UpdateStudentRequest(
			"Alicia",
			"Vance",
			student.DateOfBirth,
			GradeType.Grade5,
			ClassType.E1,
			PhaseType.Senior,
			Language.Afrikaans);

		await _handler.HandleAsync(
			new UpdateStudentCommand(student.StudentId, request),
			TestContext.Current.CancellationToken);

		var updated = student.DrainEvents().OfType<StudentUpdated>().Single();
		updated.Source.ShouldBe(StudentPopulation.Enrolled);
	}

	[Fact]
	[Trait("AC", "200UC3")]
	public async Task HandleAsync_UnknownStudent_ThrowsEntityNotFoundException()
	{
		var studentId = Guid.NewGuid();
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(studentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((Student?)null);

		var request = new UpdateStudentRequest(
			"Alicia", "Vance", new DateOnly(2014, 5, 12), GradeType.Grade5, ClassType.E1, PhaseType.Senior, Language.Afrikaans);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(new UpdateStudentCommand(studentId, request), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "277UC24")]
	[Trait("AC", "344UC4")]
	public async Task HandleAsync_GradeChangedToPrivate_KeepsEveryOneOfTheStudentsExtraCurricularAssignments()
	{
		var student = GivenStudent(GradeType.Grade4);
		var assignments = GivenAssignments(student, "Choir", "String Orchestra");

		var result = await _handler.HandleAsync(
			new UpdateStudentCommand(student.StudentId, RequestFor(GradeType.Private)),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Grade.ShouldBe(GradeType.Private),
			() => _context.Repositories.StudentExtraCurricularRepositoryMock.Invocations.ShouldBeEmpty(),
			() => assignments
				.SelectMany(assignment => assignment.DrainEvents())
				.OfType<StudentRemovedFromExtraCurricular>()
				.ShouldBeEmpty());
	}

	[Fact]
	[Trait("AC", "277UC24")]
	public async Task HandleAsync_GradeChangedToPrivateWithNoAssignments_WritesNothingToTheAssignments()
	{
		var student = GivenStudent(GradeType.Grade4);

		await _handler.HandleAsync(
			new UpdateStudentCommand(student.StudentId, RequestFor(GradeType.Private)),
			TestContext.Current.CancellationToken);

		_context.Repositories.StudentExtraCurricularRepositoryMock.Invocations.ShouldBeEmpty();
	}

	[Fact]
	[Trait("AC", "277UC24")]
	public async Task HandleAsync_GradeChangedToAnotherPhaseWhileHoldingAnActivity_IsRefusedAndWritesNothing()
	{
		var student = GivenStudent(GradeType.Grade4);
		GivenAssignments(student, "Choir");

		await Should.ThrowAsync<DomainException>(() => _handler.HandleAsync(
			new UpdateStudentCommand(student.StudentId, RequestFor(GradeType.Grade5, PhaseType.Senior)),
			TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.StudentRepositoryMock.Verify(
				r => r.UpdateAsync(It.IsAny<Student>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.StudentExtraCurricularRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<StudentExtraCurricular>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.StudentExtraCurricularRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<StudentExtraCurricular>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "345UC1")]
	public async Task HandleAsync_PhaseChangedAwayFromAHeldActivity_IsRefusedAndLeavesTheStudentUnchanged()
	{
		var student = GivenStudent(GradeType.Grade4);
		GivenActivities(student, ExtraCurricularFactory.Create(description: "Choir", phase: PhaseType.Junior));

		var exception = await Should.ThrowAsync<DomainException>(() => _handler.HandleAsync(
			new UpdateStudentCommand(student.StudentId, RequestFor(GradeType.Grade4, PhaseType.Senior)),
			TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => exception.Message.ShouldBe(HeldExtraCurricularsMessages.PhaseMustMatch),
			() => _context.Repositories.StudentRepositoryMock.Verify(
				r => r.UpdateAsync(It.IsAny<Student>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.StudentExtraCurricularRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<StudentExtraCurricular>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.StudentExtraCurricularRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<StudentExtraCurricular>(), It.IsAny<CancellationToken>()), Times.Never),
			() => student.Phase.ShouldBe(PhaseType.Junior),
			() => student.DrainEvents().OfType<StudentUpdated>().ShouldBeEmpty());
	}

	[Fact]
	[Trait("AC", "345UC2")]
	public async Task HandleAsync_PrivateStudentHoldingASeniorActivityMovedToJunior_IsRefused()
	{
		var student = GivenPrivateStudent();
		GivenActivities(student, ExtraCurricularFactory.Create(description: "Orchestra", phase: PhaseType.Senior));

		await Should.ThrowAsync<DomainException>(() => _handler.HandleAsync(
			new UpdateStudentCommand(student.StudentId, RequestFor(GradeType.Grade1, PhaseType.Junior)),
			TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.StudentRepositoryMock.Verify(
				r => r.UpdateAsync(It.IsAny<Student>(), It.IsAny<CancellationToken>()), Times.Never),
			() => student.Grade.ShouldBe(GradeType.Private),
			() => student.Phase.ShouldBeNull());
	}

	[Theory]
	[InlineData(PhaseType.Junior)]
	[InlineData(PhaseType.Senior)]
	[Trait("AC", "345UC3")]
	public async Task HandleAsync_PrivateStudentHoldingActivitiesOfBothPhases_IsRefusedForEitherPhase(PhaseType target)
	{
		var student = GivenPrivateStudent();
		GivenActivities(
			student,
			ExtraCurricularFactory.Create(description: "Choir", phase: PhaseType.Junior),
			ExtraCurricularFactory.Create(description: "Orchestra", phase: PhaseType.Senior));

		await Should.ThrowAsync<DomainException>(() => _handler.HandleAsync(
			new UpdateStudentCommand(student.StudentId, RequestFor(GradeType.Grade1, target)),
			TestContext.Current.CancellationToken));

		_context.Repositories.StudentRepositoryMock.Verify(
			r => r.UpdateAsync(It.IsAny<Student>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "345UC4")]
	public async Task HandleAsync_PrivateStudentHoldingAnActivityMovedToItsPhase_IsAccepted()
	{
		var student = GivenPrivateStudent();
		GivenActivities(student, ExtraCurricularFactory.Create(description: "Choir", phase: PhaseType.Junior));

		var result = await _handler.HandleAsync(
			new UpdateStudentCommand(student.StudentId, RequestFor(GradeType.Grade1, PhaseType.Junior)),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Grade.ShouldBe(GradeType.Grade1),
			() => result.Phase.ShouldBe(PhaseType.Junior),
			() => _context.Repositories.StudentRepositoryMock.Verify(
				r => r.UpdateAsync(student, It.IsAny<CancellationToken>()), Times.Once),
			() => _context.Repositories.StudentExtraCurricularRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<StudentExtraCurricular>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.StudentExtraCurricularRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<StudentExtraCurricular>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "345UC5")]
	public async Task HandleAsync_GradeChangedWithinTheSamePhaseWhileHoldingActivities_IsAccepted()
	{
		var student = GivenStudent(GradeType.Grade4);
		GivenActivities(
			student,
			ExtraCurricularFactory.Create(description: "Choir", phase: PhaseType.Junior),
			ExtraCurricularFactory.Create(description: "Recorders", phase: PhaseType.Junior));
		var request = RequestFor(GradeType.Grade3, PhaseType.Junior) with { FirstName = "Alicia" };

		var result = await _handler.HandleAsync(
			new UpdateStudentCommand(student.StudentId, request),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.FirstName.ShouldBe("Alicia"),
			() => result.Grade.ShouldBe(GradeType.Grade3),
			() => _context.Repositories.StudentRepositoryMock.Verify(
				r => r.UpdateAsync(student, It.IsAny<CancellationToken>()), Times.Once));
	}

	[Fact]
	[Trait("AC", "277UC25")]
	public async Task HandleAsync_UpdateRejectedForAnyOtherReason_LeavesTheAssignmentsUntouched()
	{
		var student = GivenStudent(GradeType.Grade4);
		GivenAssignments(student, "Choir", "String Orchestra");
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.UpdateAsync(It.IsAny<Student>(), It.IsAny<CancellationToken>()))
			.ThrowsAsync(new InvalidOperationException("the update was rejected"));

		await Should.ThrowAsync<InvalidOperationException>(() => _handler.HandleAsync(
			new UpdateStudentCommand(student.StudentId, RequestFor(GradeType.Private)),
			TestContext.Current.CancellationToken));

		var unknownStudent = Guid.NewGuid();
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(unknownStudent, It.IsAny<CancellationToken>()))
			.ReturnsAsync((Student?)null);
		await Should.ThrowAsync<EntityNotFoundException>(() => _handler.HandleAsync(
			new UpdateStudentCommand(unknownStudent, RequestFor(GradeType.Private)),
			TestContext.Current.CancellationToken));

		_context.Repositories.StudentExtraCurricularRepositoryMock.Invocations.ShouldBeEmpty();
	}

	private static UpdateStudentRequest RequestFor(GradeType grade, PhaseType? phase = null)
	{
		var isPrivate = grade == GradeType.Private;
		return new UpdateStudentRequest(
			"Alice",
			"Vance",
			new DateOnly(2014, 5, 12),
			grade,
			isPrivate ? null : ClassType.A1,
			isPrivate ? null : (phase ?? PhaseType.Junior),
			Language.English);
	}

	private Student GivenStudent(GradeType grade)
	{
		var student = StudentFactory.Create(grade: grade);
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.UpdateAsync(It.IsAny<Student>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		return student;
	}

	private Student GivenPrivateStudent()
	{
		var student = StudentFactory.Create(grade: GradeType.Private, @class: null, phase: null);
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.UpdateAsync(It.IsAny<Student>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		return student;
	}

	private List<StudentExtraCurricular> GivenAssignments(Student student, params string[] descriptions) =>
		GivenActivities(
			student,
			[.. descriptions.Select(description => ExtraCurricularFactory.Create(description: description))]);

	private List<StudentExtraCurricular> GivenActivities(Student student, params ExtraCurricular[] activities)
	{
		var assignments = activities
			.Select(activity => new StudentExtraCurricular(student.StudentId, activity))
			.ToList();

		_context.Repositories.StudentExtraCurricularRepositoryMock
			.Setup(r => r.GetByStudentIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(assignments);

		return assignments;
	}
}