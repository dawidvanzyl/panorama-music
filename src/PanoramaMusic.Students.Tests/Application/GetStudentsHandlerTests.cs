using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Handlers;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class GetStudentsHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly GetStudentsHandler _handler;

	public GetStudentsHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<GetStudentsHandler>();
	}

	[Fact]
	[Trait("AC", "200UC8")]
	public async Task HandleAsync_StudentsExist_ReturnsFullRoster()
	{
		var alice = StudentFactory.Create(firstName: "Alice", lastName: "Vance", grade: GradeType.Grade4);
		var julian = StudentFactory.Create(firstName: "Julian", lastName: "Thorne", grade: GradeType.Grade5);
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([alice, julian]);

		var result = await _handler.HandleAsync(TestContext.Current.CancellationToken);

		result.Select(s => s.StudentId).ShouldBe([alice.StudentId, julian.StudentId]);
	}

	[Fact]
	[Trait("AC", "200UC8")]
	public async Task HandleAsync_NoStudents_ReturnsEmptyList()
	{
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetAllAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);

		var result = await _handler.HandleAsync(TestContext.Current.CancellationToken);

		result.ShouldBeEmpty();
	}
}