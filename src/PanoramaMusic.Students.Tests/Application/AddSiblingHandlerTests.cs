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

public class AddSiblingHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly AddSiblingHandler _handler;

	public AddSiblingHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<AddSiblingHandler>();
	}

	[Fact]
	[Trait("AC", "201UC1")]
	public async Task HandleAsync_TwoDistinctExistingStudents_RecordsSiblingAndReturnsSiblingStudent()
	{
		var student = StudentFactory.Create();
		var siblingStudent = StudentFactory.Create(firstName: "Julian", lastName: "Thorne");

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(siblingStudent.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(siblingStudent);
		_context.Repositories.SiblingRepositoryMock
			.Setup(r => r.GetSiblingsAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);
		_context.Repositories.SiblingRepositoryMock
			.Setup(r => r.AddAsync(It.IsAny<Sibling>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		var result = await _handler.HandleAsync(
			new AddSiblingCommand(student.StudentId, siblingStudent.StudentId),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.StudentId.ShouldBe(siblingStudent.StudentId),
			() => result.FirstName.ShouldBe("Julian"),
			() => _context.Repositories.SiblingRepositoryMock.Verify(
				r => r.AddAsync(
					It.Is<Sibling>(s => s.StudentId == student.StudentId && s.SiblingId == siblingStudent.StudentId),
					TestContext.Current.CancellationToken),
				Times.Once));
	}

	[Fact]
	[Trait("AC", "201UC4")]
	public async Task HandleAsync_SameStudentAsSibling_ThrowsDomainException()
	{
		var student = StudentFactory.Create();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);

		await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(new AddSiblingCommand(student.StudentId, student.StudentId), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "201UC5")]
	public async Task HandleAsync_UnknownStudentId_ThrowsEntityNotFoundException()
	{
		var studentId = Guid.NewGuid();
		var siblingId = Guid.NewGuid();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(studentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((Student?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(new AddSiblingCommand(studentId, siblingId), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "201UC5")]
	public async Task HandleAsync_UnknownSiblingId_ThrowsEntityNotFoundException()
	{
		var student = StudentFactory.Create();
		var siblingId = Guid.NewGuid();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(siblingId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((Student?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(new AddSiblingCommand(student.StudentId, siblingId), TestContext.Current.CancellationToken));
	}

	[Fact]
	public async Task HandleAsync_AlreadyLinkedSibling_ThrowsDomainExceptionAndDoesNotCallAddAsync()
	{
		var student = StudentFactory.Create();
		var siblingStudent = StudentFactory.Create(firstName: "Julian", lastName: "Thorne");

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(siblingStudent.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(siblingStudent);
		_context.Repositories.SiblingRepositoryMock
			.Setup(r => r.GetSiblingsAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([siblingStudent]);

		await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(new AddSiblingCommand(student.StudentId, siblingStudent.StudentId), TestContext.Current.CancellationToken));

		_context.Repositories.SiblingRepositoryMock.Verify(
			r => r.AddAsync(It.IsAny<Sibling>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}