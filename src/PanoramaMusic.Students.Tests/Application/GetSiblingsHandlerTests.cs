using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Handlers.Siblings;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Domain.ValueObjects;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class GetSiblingsHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly GetSiblingsHandler _handler;

	public GetSiblingsHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<GetSiblingsHandler>();
	}

	[Fact]
	[Trait("AC", "201UC2")]
	public async Task HandleAsync_StudentWithLinkedSiblings_ReturnsAllLinkedSiblings()
	{
		var student = StudentFactory.Create();
		var siblingOne = StudentFactory.Create(firstName: "Julian", lastName: "Thorne");
		var siblingTwo = StudentFactory.Create(firstName: "Priya", lastName: "Okafor");

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.SiblingRepositoryMock
			.Setup(r => r.GetSiblingStudentsAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([
				new SiblingStudent(siblingOne, StudentPopulation.WaitingList),
				new SiblingStudent(siblingTwo, StudentPopulation.Enrolled),
			]);

		var result = await _handler.HandleAsync(student.StudentId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Select(s => s.StudentId).ShouldBe([siblingOne.StudentId, siblingTwo.StudentId], ignoreOrder: true),
			// Each row's state is the linked student's own, not the subject's.
			() => result.Single(s => s.StudentId == siblingOne.StudentId).Population.ShouldBe(StudentPopulation.WaitingList),
			() => result.Single(s => s.StudentId == siblingTwo.StudentId).Population.ShouldBe(StudentPopulation.Enrolled));
	}

	[Fact]
	[Trait("AC", "201UC2")]
	public async Task HandleAsync_UnknownStudent_ThrowsEntityNotFoundException()
	{
		var studentId = Guid.NewGuid();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(studentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((Student?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(studentId, TestContext.Current.CancellationToken));
	}
}