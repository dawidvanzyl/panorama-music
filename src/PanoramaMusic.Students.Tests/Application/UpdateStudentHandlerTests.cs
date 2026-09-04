using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.Students;
using PanoramaMusic.Students.Application.Handlers.Students;
using PanoramaMusic.Students.Application.Requests.Students;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.StudentExtraCurriculars;
using PanoramaMusic.Students.Domain.Events.Students;
using PanoramaMusic.Students.Tests.Factories;
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
		updated.Source.ShouldBe(StudentWriteSource.Roster);
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

		await Should.ThrowAsync<Domain.Exceptions.EntityNotFoundException>(
			() => _handler.HandleAsync(new UpdateStudentCommand(studentId, request), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "277UC24")]
	public async Task HandleAsync_GradeChangedToPrivate_DeletesEveryOneOfTheStudentsExtraCurricularAssignments()
	{
		var student = GivenStudent(GradeType.Grade4);
		var assignments = GivenAssignments(student, "Choir", "String Orchestra");
		var deletedFor = CaptureBulkDeletes();

		await _handler.HandleAsync(
			new UpdateStudentCommand(student.StudentId, RequestFor(GradeType.Private)),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			// A Private-grade student is not part of the school, so the whole set
			// goes — and in one write, not a delete per assignment.
			() => deletedFor.ShouldBe([student.StudentId]),
			() => _context.Repositories.StudentExtraCurricularRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<StudentExtraCurricular>(), It.IsAny<CancellationToken>()), Times.Never),
			// Every removal is still audited individually: the trail names the
			// activities the student stopped taking part in, not a bare count.
			() => assignments
				.SelectMany(assignment => assignment.DrainEvents())
				.OfType<StudentRemovedFromExtraCurricular>()
				.Select(removed => removed.Assignment.ExtraCurricular.Description)
				.ShouldBe(["Choir", "String Orchestra"]));
	}

	[Fact]
	[Trait("AC", "277UC24")]
	public async Task HandleAsync_GradeChangedToPrivateWithNoAssignments_WritesNothingAtAll()
	{
		var student = GivenStudent(GradeType.Grade4);
		GivenAssignments(student);
		var deletedFor = CaptureBulkDeletes();

		await _handler.HandleAsync(
			new UpdateStudentCommand(student.StudentId, RequestFor(GradeType.Private)),
			TestContext.Current.CancellationToken);

		// Nothing to discard, so no write is issued for it.
		deletedFor.ShouldBeEmpty();
	}

	[Fact]
	[Trait("AC", "277UC24")]
	public async Task HandleAsync_GradeChangedButNotToPrivate_LeavesTheAssignmentsAlone()
	{
		var student = GivenStudent(GradeType.Grade4);
		GivenAssignments(student, "Choir");
		var deletedFor = CaptureBulkDeletes();

		await _handler.HandleAsync(
			new UpdateStudentCommand(student.StudentId, RequestFor(GradeType.Grade5, PhaseType.Senior)),
			TestContext.Current.CancellationToken);

		// Junior-to-Senior movement is a re-check of which activities still fit,
		// which this story explicitly leaves alone. Only Private discards.
		deletedFor.ShouldBeEmpty();
	}

	[Fact]
	[Trait("AC", "277UC25")]
	public async Task HandleAsync_UpdateRejectedForAnyOtherReason_LeavesTheAssignmentsUntouched()
	{
		var student = GivenStudent(GradeType.Grade4);
		GivenAssignments(student, "Choir", "String Orchestra");
		var deletedFor = CaptureBulkDeletes();
		// The student's own write fails. The discard is sequenced after it, so it
		// is never reached — and on the request's ambient transaction, a failure
		// here would take the whole update back with it either way.
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
		await Should.ThrowAsync<Domain.Exceptions.EntityNotFoundException>(() => _handler.HandleAsync(
			new UpdateStudentCommand(unknownStudent, RequestFor(GradeType.Private)),
			TestContext.Current.CancellationToken));

		deletedFor.ShouldBeEmpty();
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

	private List<StudentExtraCurricular> GivenAssignments(Student student, params string[] descriptions)
	{
		var assignments = descriptions
			.Select(description => new StudentExtraCurricular(
				student.StudentId, ExtraCurricularFactory.Create(description: description)))
			.ToList();

		_context.Repositories.StudentExtraCurricularRepositoryMock
			.Setup(r => r.GetByStudentIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(assignments);

		return assignments;
	}

	/// <summary>The students whose whole assignment set the handler asked to be discarded.</summary>
	private List<Guid> CaptureBulkDeletes()
	{
		var captured = new List<Guid>();

		_context.Repositories.StudentExtraCurricularRepositoryMock
			.Setup(r => r.DeleteAllByStudentIdAsync(
				It.IsAny<Guid>(), It.IsAny<IEnumerable<StudentExtraCurricular>>(), It.IsAny<CancellationToken>()))
			.Callback<Guid, IEnumerable<StudentExtraCurricular>, CancellationToken>((studentId, _, _) => captured.Add(studentId))
			.Returns(Task.CompletedTask);

		return captured;
	}
}