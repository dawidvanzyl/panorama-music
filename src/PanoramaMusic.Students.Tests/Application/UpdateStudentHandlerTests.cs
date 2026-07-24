using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands;
using PanoramaMusic.Students.Application.Handlers;
using PanoramaMusic.Students.Application.Requests;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
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
}