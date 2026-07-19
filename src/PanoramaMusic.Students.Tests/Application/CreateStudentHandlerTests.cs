using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands;
using PanoramaMusic.Students.Application.Handlers;
using PanoramaMusic.Students.Application.Requests;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class CreateStudentHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly CreateStudentHandler _handler;

	public CreateStudentHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<CreateStudentHandler>();
	}

	[Fact]
	[Trait("AC", "200UC1")]
	public async Task HandleAsync_ValidRequest_PersistsAndReturnsNewStudent()
	{
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<Student>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		var request = new CreateStudentRequest(
			"Alice",
			"Vance",
			new DateOnly(2014, 5, 12),
			GradeType.Grade4,
			ClassType.A1,
			PhaseType.Junior,
			Language.English);

		var result = await _handler.HandleAsync(
			new CreateStudentCommand(request),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.ShouldNotBeNull().ShouldSatisfyAllConditions(
				() => result.StudentId.ShouldNotBe(Guid.Empty),
				() => result.FirstName.ShouldBe("Alice"),
				() => result.LastName.ShouldBe("Vance"),
				() => result.Grade.ShouldBe(GradeType.Grade4),
				() => result.Class.ShouldBe(ClassType.A1),
				() => result.Phase.ShouldBe(PhaseType.Junior),
				() => result.Language.ShouldBe(Language.English)),
			() => _context.Repositories.StudentRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<Student>(), TestContext.Current.CancellationToken), Times.Once));
	}
}