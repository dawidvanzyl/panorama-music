using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands;
using PanoramaMusic.Students.Application.Handlers;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class RemoveSiblingHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly RemoveSiblingHandler _handler;

	public RemoveSiblingHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<RemoveSiblingHandler>();
	}

	[Fact]
	[Trait("AC", "201UC3")]
	public async Task HandleAsync_ExistingSiblingLink_RemovesLinkInBothDirections()
	{
		var student = StudentFactory.Create();
		var siblingStudent = StudentFactory.Create(firstName: "Julian", lastName: "Thorne");

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.SiblingRepositoryMock
			.Setup(r => r.GetSiblingsAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([siblingStudent]);
		_context.Repositories.SiblingRepositoryMock
			.Setup(r => r.DeleteAsync(It.IsAny<Sibling>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		await _handler.HandleAsync(
			new RemoveSiblingCommand(student.StudentId, siblingStudent.StudentId),
			TestContext.Current.CancellationToken);

		_context.Repositories.SiblingRepositoryMock.Verify(
			r => r.DeleteAsync(
				It.Is<Sibling>(s => s.StudentId == student.StudentId && s.SiblingId == siblingStudent.StudentId),
				TestContext.Current.CancellationToken),
			Times.Once);
	}

	[Fact]
	[Trait("AC", "201UC3")]
	public async Task HandleAsync_NoSuchSiblingLink_ThrowsEntityNotFoundException()
	{
		var student = StudentFactory.Create();
		var siblingId = Guid.NewGuid();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.SiblingRepositoryMock
			.Setup(r => r.GetSiblingsAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(new RemoveSiblingCommand(student.StudentId, siblingId), TestContext.Current.CancellationToken));
	}
}