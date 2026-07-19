using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Handlers;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class GetStudentByIdHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly GetStudentByIdHandler _handler;

	public GetStudentByIdHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<GetStudentByIdHandler>();
	}

	[Fact]
	[Trait("AC", "200UC2")]
	public async Task HandleAsync_ExistingStudent_ReturnsStudentProfile()
	{
		var student = StudentFactory.Create(
			firstName: "Julian",
			lastName: "Thorne",
			dateOfBirth: new DateOnly(2013, 9, 5),
			grade: GradeType.Grade5,
			@class: ClassType.E1,
			phase: PhaseType.Senior,
			language: Language.Afrikaans);
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);

		var result = await _handler.HandleAsync(student.StudentId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.StudentId.ShouldBe(student.StudentId),
			() => result.FirstName.ShouldBe("Julian"),
			() => result.LastName.ShouldBe("Thorne"),
			() => result.DateOfBirth.ShouldBe(new DateOnly(2013, 9, 5)),
			() => result.Grade.ShouldBe(GradeType.Grade5),
			() => result.Class.ShouldBe(ClassType.E1),
			() => result.Phase.ShouldBe(PhaseType.Senior),
			() => result.Language.ShouldBe(Language.Afrikaans));
	}

	[Fact]
	[Trait("AC", "200UC2")]
	public async Task HandleAsync_UnknownStudent_ThrowsEntityNotFoundException()
	{
		var studentId = Guid.NewGuid();
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(studentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((Domain.Entities.Student?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(studentId, TestContext.Current.CancellationToken));
	}
}