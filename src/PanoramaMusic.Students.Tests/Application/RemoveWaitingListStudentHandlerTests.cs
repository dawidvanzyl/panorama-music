using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.WaitingList;
using PanoramaMusic.Students.Application.Handlers.WaitingList;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.Students;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class RemoveWaitingListStudentHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly RemoveWaitingListStudentHandler _handler;

	public RemoveWaitingListStudentHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<RemoveWaitingListStudentHandler>();
	}

	[Fact]
	[Trait("AC", "294UC6")]
	public async Task HandleAsync_AWaitingListStudent_BothTheEntryAndTheStudentRecordAreDeleted()
	{
		var student = StudentFactory.Create();
		var entry = WaitingListEntryFactory.Create(student: student);
		_context.Repositories.WaitingListRepositoryMock
			.Setup(r => r.GetByStudentIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(entry);

		await _handler.HandleAsync(
			new RemoveWaitingListStudentCommand(student.StudentId),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.WaitingListRepositoryMock.Verify(
				r => r.DeleteAsync(entry, TestContext.Current.CancellationToken), Times.Once),
			() => _context.Repositories.StudentRepositoryMock.Verify(
				r => r.DeleteAsync(student, TestContext.Current.CancellationToken), Times.Once));
	}

	[Fact]
	[Trait("AC", "294UC7")]
	public async Task HandleAsync_AStudentWhoHoldsNoWaitingListEntry_IsRefusedAndNothingIsDeleted()
	{
		var studentId = Guid.NewGuid();
		_context.Repositories.WaitingListRepositoryMock
			.Setup(r => r.GetByStudentIdAsync(studentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((WaitingListEntry?)null);

		await Should.ThrowAsync<EntityNotFoundException>(() =>
			_handler.HandleAsync(
				new RemoveWaitingListStudentCommand(studentId),
				TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.WaitingListRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<WaitingListEntry>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.StudentRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<Student>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "300UC13")]
	public async Task HandleAsync_AWaitingListRemoval_RaisesTheDeletionNamingTheWaitingListAsItsSource()
	{
		var student = StudentFactory.Create();
		var entry = WaitingListEntryFactory.Create(student: student);
		_context.Repositories.WaitingListRepositoryMock
			.Setup(r => r.GetByStudentIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(entry);

		await _handler.HandleAsync(
			new RemoveWaitingListStudentCommand(student.StudentId),
			TestContext.Current.CancellationToken);

		// This is the irreversible half, and the one whose audit record would
		// otherwise be indistinguishable from a Teacher deleting from the roster.
		var deleted = student.DrainEvents().OfType<StudentDeleted>().Single();
		deleted.Source.ShouldBe(StudentWriteSource.WaitingList);
	}
}