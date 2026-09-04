using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.Guardians;
using PanoramaMusic.Students.Application.Handlers.Guardians;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.Guardians;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class UnlinkGuardianHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly UnlinkGuardianHandler _handler;

	public UnlinkGuardianHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<UnlinkGuardianHandler>();
	}

	[Fact]
	[Trait("AC", "212UC9")]
	public async Task HandleAsync_GuardianStillLinkedToOtherStudents_UnlinksWithoutDeletingRecord()
	{
		var student = StudentFactory.Create();
		var guardian = GuardianFactory.Create();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetGuardiansByStudentIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([guardian]);
		// Counted before this unlink, so a second link is what makes the record survive it.
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetLinkCountAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(2);

		await _handler.HandleAsync(new UnlinkGuardianCommand(student.StudentId, guardian.GuardianId), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.DeleteAsync(
					It.Is<StudentGuardian>(l => l.StudentId == student.StudentId && l.GuardianId == guardian.GuardianId),
					It.IsAny<CancellationToken>()),
				Times.Once),
			() => _context.Repositories.GuardianRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<Guardian>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "212UC11")]
	public async Task HandleAsync_LastRemainingLink_DeletesGuardianRecord()
	{
		var student = StudentFactory.Create();
		var guardian = GuardianFactory.Create();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetGuardiansByStudentIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([guardian]);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetLinkCountAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(1);

		await _handler.HandleAsync(new UnlinkGuardianCommand(student.StudentId, guardian.GuardianId), TestContext.Current.CancellationToken);

		_context.Repositories.GuardianRepositoryMock.Verify(
			r => r.DeleteAsync(It.Is<Guardian>(g => g.GuardianId == guardian.GuardianId), It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	public async Task HandleAsync_GuardianNotLinkedToThisStudent_ThrowsWithoutUnlinkingOrRaisingAnEvent()
	{
		var student = StudentFactory.Create();
		var guardian = GuardianFactory.Create();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetGuardiansByStudentIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);

		await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(new UnlinkGuardianCommand(student.StudentId, guardian.GuardianId), TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<StudentGuardian>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.GuardianRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<Guardian>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "300UC4")]
	public async Task HandleAsync_CoordinatorUnlinkingAGuardianAnEnrolledStudentHolds_UnlinksThisStudentOnly()
	{
		_context.ActAsCoordinator();

		var student = StudentFactory.Create();
		var guardian = GuardianFactory.Create();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetGuardiansByStudentIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([guardian]);
		// The enrolled sibling's link is the one that survives, so a link
		// remains after this student's is gone.
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetLinkCountAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(2);

		await _handler.HandleAsync(
			new UnlinkGuardianCommand(student.StudentId, guardian.GuardianId), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.DeleteAsync(
					It.Is<StudentGuardian>(l => l.StudentId == student.StudentId && l.GuardianId == guardian.GuardianId),
					It.IsAny<CancellationToken>()),
				Times.Once),
			// An unlink touches one student's association, never the shared row
			// the enrolled student also holds, so the restriction does not reach
			// it and enrolment is not consulted.
			() => _context.Repositories.GuardianRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<Guardian>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.HasEnrolledLinkAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "300UC19")]
	public async Task HandleAsync_CoordinatorUnlinkingTheLastLinkOfAGuardianAnEnrolledStudentHolds_IsRefusedAndBothSurvive()
	{
		// The cascade would destroy the shared row, which is the deletion this
		// caller is refused on the guardian's own route.
		_context.ActAsCoordinator();

		var student = StudentFactory.Create();
		var guardian = GuardianFactory.Create(firstName: "Nomvula", surname: "Dube");
		guardian.DrainEvents();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetGuardiansByStudentIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([guardian]);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetLinkCountAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(1);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.HasEnrolledLinkAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);

		await Should.ThrowAsync<ForbiddenException>(
			() => _handler.HandleAsync(new UnlinkGuardianCommand(student.StudentId, guardian.GuardianId), TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			// Refused whole: the link is not removed either, so the operation
			// cannot leave a student unlinked from a guardian that survives.
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<StudentGuardian>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.GuardianRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<Guardian>(), It.IsAny<CancellationToken>()), Times.Never),
			() => guardian.DrainEvents().ShouldNotContain(e => e is GuardianDeleted));
	}

	[Fact]
	[Trait("AC", "300UC20")]
	public async Task HandleAsync_CoordinatorUnlinkingTheLastLinkOfAGuardianNoEnrolledStudentHolds_DeletesTheGuardian()
	{
		_context.ActAsCoordinator();

		var student = StudentFactory.Create();
		var guardian = GuardianFactory.Create();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetGuardiansByStudentIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([guardian]);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetLinkCountAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(1);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.HasEnrolledLinkAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(false);

		await _handler.HandleAsync(
			new UnlinkGuardianCommand(student.StudentId, guardian.GuardianId), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<StudentGuardian>(), It.IsAny<CancellationToken>()), Times.Once),
			// A guardian only waiting-list students hold is this caller's to delete.
			() => _context.Repositories.GuardianRepositoryMock.Verify(
				r => r.DeleteAsync(It.Is<Guardian>(g => g.GuardianId == guardian.GuardianId), It.IsAny<CancellationToken>()), Times.Once));
	}

	[Fact]
	[Trait("AC", "300UC17")]
	public async Task HandleAsync_AGuardianUnlinkedFromAWaitingListStudent_NamesTheWaitingListOnTheUnlinkAndTheDeletion()
	{
		var (unlinked, deleted) = await UnlinkTheLastGuardianOf(onTheWaitingList: true);

		ShouldlyHelpers.Satisfy(
			() => unlinked.Source.ShouldBe(StudentWriteSource.WaitingList),
			// A guardian never exists standalone, so losing its last link deletes
			// the row — a consequence of this student's unlink, and named as such.
			() => deleted.Source.ShouldBe(StudentWriteSource.WaitingList));
	}

	[Fact]
	[Trait("AC", "300UC14")]
	public async Task HandleAsync_AGuardianUnlinkedFromARosterStudent_NamesTheRosterOnTheUnlinkAndTheDeletion()
	{
		var (unlinked, deleted) = await UnlinkTheLastGuardianOf(onTheWaitingList: false);

		ShouldlyHelpers.Satisfy(
			() => unlinked.Source.ShouldBe(StudentWriteSource.Roster),
			() => deleted.Source.ShouldBe(StudentWriteSource.Roster));
	}

	private async Task<(GuardianUnlinked Unlinked, GuardianDeleted Deleted)> UnlinkTheLastGuardianOf(bool onTheWaitingList)
	{
		var student = StudentFactory.Create();
		var guardian = GuardianFactory.Create();
		guardian.DrainEvents();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetGuardiansByStudentIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([guardian]);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetLinkCountAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(1);

		if (onTheWaitingList)
			_context.GivenAWaitingListStudent(student);

		StudentGuardian? deletedLink = null;
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.DeleteAsync(It.IsAny<StudentGuardian>(), It.IsAny<CancellationToken>()))
			.Callback<StudentGuardian, CancellationToken>((link, _) => deletedLink = link)
			.Returns(Task.CompletedTask);

		await _handler.HandleAsync(
			new UnlinkGuardianCommand(student.StudentId, guardian.GuardianId), TestContext.Current.CancellationToken);

		return (
			deletedLink.ShouldNotBeNull().DrainEvents().OfType<GuardianUnlinked>().Single(),
			guardian.DrainEvents().OfType<GuardianDeleted>().Single());
	}
}