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

public class DeleteStudentHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly DeleteStudentHandler _handler;

	public DeleteStudentHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<DeleteStudentHandler>();
	}

	[Fact]
	[Trait("AC", "200UC4")]
	public async Task HandleAsync_ExistingStudent_RemovesStudentProfile()
	{
		var student = StudentFactory.Create();
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.DeleteAsync(It.IsAny<Student>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		await _handler.HandleAsync(new DeleteStudentCommand(student.StudentId), TestContext.Current.CancellationToken);

		_context.Repositories.StudentRepositoryMock.Verify(
			r => r.DeleteAsync(student, TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "200UC4")]
	public async Task HandleAsync_UnknownStudent_ThrowsEntityNotFoundException()
	{
		var studentId = Guid.NewGuid();
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(studentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((Student?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(new DeleteStudentCommand(studentId), TestContext.Current.CancellationToken));
	}
}