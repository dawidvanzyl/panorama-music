using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Handlers.Guardians;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.Guardians;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class SyncGuardiansHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly SyncGuardiansHandler _handler;

	public SyncGuardiansHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<SyncGuardiansHandler>();
	}

	[Fact]
	[Trait("AC", "212UC12")]
	public async Task HandleAsync_StudentMissingSiblingGroupGuardians_LinksEveryMissingGuardian()
	{
		var student = StudentFactory.Create();
		var missingOne = GuardianFactory.Create(firstName: "Nomvula", surname: "Dube");
		var missingTwo = GuardianFactory.Create(firstName: "Peter", surname: "Dube");

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetMissingSiblingGuardiansAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([missingOne, missingTwo]);

		var result = await _handler.HandleAsync(student.StudentId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Select(g => g.GuardianId).ShouldBe([missingOne.GuardianId, missingTwo.GuardianId], ignoreOrder: true),
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.CreateAsync(
					It.Is<StudentGuardian>(l => l.StudentId == student.StudentId && l.GuardianId == missingOne.GuardianId),
					It.IsAny<CancellationToken>()),
				Times.Once),
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.CreateAsync(
					It.Is<StudentGuardian>(l => l.StudentId == student.StudentId && l.GuardianId == missingTwo.GuardianId),
					It.IsAny<CancellationToken>()),
				Times.Once));
	}

	[Fact]
	[Trait("AC", "212UC12")]
	public async Task HandleAsync_NoMissingGuardians_LinksNothing()
	{
		var student = StudentFactory.Create();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetMissingSiblingGuardiansAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([]);

		var result = await _handler.HandleAsync(student.StudentId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.ShouldBeEmpty(),
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.CreateAsync(It.IsAny<StudentGuardian>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "300UC6")]
	public async Task HandleAsync_CoordinatorSyncingAgainstAnEnrolledSibling_WritesToTheSyncedStudentOnly()
	{
		_context.ActAsCoordinator();

		var student = StudentFactory.Create();
		// The guardian an enrolled sibling holds — the sync pulls it in, and the
		// sibling it came from is what must stay untouched.
		var sharedGuardian = GuardianFactory.Create(firstName: "Nomvula", surname: "Dube");

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetMissingSiblingGuardiansAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([sharedGuardian]);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetEnrolledLinkedGuardianIdsAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([sharedGuardian.GuardianId]);

		var result = await _handler.HandleAsync(student.StudentId, TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.CreateAsync(
					It.Is<StudentGuardian>(l => l.StudentId == student.StudentId && l.GuardianId == sharedGuardian.GuardianId),
					It.IsAny<CancellationToken>()),
				Times.Once),
			// The pull is one-directional: no link is written for the sibling the
			// guardian came from, and the guardian's own row is never touched.
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.CreateAsync(It.Is<StudentGuardian>(l => l.StudentId != student.StudentId), It.IsAny<CancellationToken>()),
				Times.Never),
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<StudentGuardian>(), It.IsAny<CancellationToken>()), Times.Never),
			() => _context.Repositories.GuardianRepositoryMock.Verify(
				r => r.UpdateAsync(It.IsAny<Guardian>(), It.IsAny<CancellationToken>()), Times.Never),
			// A pulled guardian the enrolled sibling holds comes back flagged, so
			// the screen that just synced knows it cannot be edited.
			() => result.ShouldHaveSingleItem().Restricted.ShouldBeTrue());
	}

	[Fact]
	[Trait("AC", "300UC17")]
	public async Task HandleAsync_AWaitingListStudentSyncing_NamesTheWaitingListOnEveryLinkItWrites()
	{
		var linked = await SyncAGuardianOnto(onTheWaitingList: true);

		linked.Source.ShouldBe(StudentWriteSource.WaitingList);
	}

	[Fact]
	[Trait("AC", "300UC14")]
	public async Task HandleAsync_ARosterStudentSyncing_NamesTheRosterOnEveryLinkItWrites()
	{
		var linked = await SyncAGuardianOnto(onTheWaitingList: false);

		linked.Source.ShouldBe(StudentWriteSource.Roster);
	}

	private async Task<GuardianLinked> SyncAGuardianOnto(bool onTheWaitingList)
	{
		var student = StudentFactory.Create();
		var siblingGuardian = GuardianFactory.Create();

		_context.Repositories.StudentRepositoryMock
			.Setup(r => r.GetByIdAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(student);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.GetMissingSiblingGuardiansAsync(student.StudentId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([siblingGuardian]);

		if (onTheWaitingList)
			_context.GivenAWaitingListStudent(student);

		StudentGuardian? createdLink = null;
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.CreateAsync(It.IsAny<StudentGuardian>(), It.IsAny<CancellationToken>()))
			.Callback<StudentGuardian, CancellationToken>((link, _) => createdLink = link)
			.Returns(Task.CompletedTask);

		await _handler.HandleAsync(student.StudentId, TestContext.Current.CancellationToken);

		return createdLink.ShouldNotBeNull().DrainEvents().OfType<GuardianLinked>().Single();
	}
}