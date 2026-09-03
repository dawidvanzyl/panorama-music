using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.WaitingList;
using PanoramaMusic.Students.Application.Handlers.WaitingList;
using PanoramaMusic.Students.Application.Requests.Students;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class UpdateWaitingListStudentHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly UpdateWaitingListStudentHandler _handler;

	public UpdateWaitingListStudentHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<UpdateWaitingListStudentHandler>();
	}

	[Fact]
	[Trait("AC", "294UC1")]
	public async Task HandleAsync_ChangedStudentDetails_TheStudentRecordsTheNewValuesAndTheEntryIsUntouched()
	{
		var student = StudentFactory.Create(firstName: "Amara", lastName: "Pillay");
		var entry = WaitingListEntryFactory.Create(student: student);
		SetupEntry(entry);

		Student? persisted = null;
		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.UpdateAsync(It.IsAny<Student>(), It.IsAny<CancellationToken>()))
			.Callback<Student, CancellationToken>((updated, _) => persisted = updated)
			.Returns(Task.CompletedTask);

		var result = await _handler.HandleAsync(
			new UpdateWaitingListStudentCommand(student.StudentId, Request("Amarah", "Pillay-Naidoo")),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => persisted.ShouldNotBeNull(),
			() => persisted!.FirstName.ShouldBe("Amarah"),
			() => persisted!.LastName.ShouldBe("Pillay-Naidoo"),
			() => result.FirstName.ShouldBe("Amarah"),
			// The waiting-list entry is read to establish the student is on the
			// list, and never written.
			() => _context.Repositories.WaitingListRepositoryMock.Verify(
				r => r.UpdateAsync(It.IsAny<WaitingListEntry>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.WaitingListRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<WaitingListEntry>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "294UC1")]
	public async Task HandleAsync_AStudentWhoHoldsNoWaitingListEntry_IsRefusedAndTheirRecordIsLeftIntact()
	{
		// The route is the Coordinator's; the roster's own update is the
		// Teacher's. Resolving the student through their entry is what keeps an
		// enrolled student's record out of reach from this screen.
		var studentId = Guid.NewGuid();
		_context.Repositories.WaitingListRepositoryMock
			.Setup(r => r.GetByStudentIdAsync(studentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((WaitingListEntry?)null);

		await Should.ThrowAsync<EntityNotFoundException>(() =>
			_handler.HandleAsync(
				new UpdateWaitingListStudentCommand(studentId, Request("Nobody", "NoOne")),
				TestContext.Current.CancellationToken));

		_context.Repositories.StudentRepositoryMock.Verify(
			r => r.UpdateAsync(It.IsAny<Student>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	private void SetupEntry(WaitingListEntry entry) =>
		_context.Repositories.WaitingListRepositoryMock
			.Setup(r => r.GetByStudentIdAsync(entry.Student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(entry);

	private static UpdateStudentRequest Request(string firstName, string lastName) =>
		new(
			firstName,
			lastName,
			new DateOnly(2016, 2, 14),
			GradeType.Grade4,
			ClassType.A1,
			PhaseType.Junior,
			Language.English);
}
