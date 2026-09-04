using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.Guardians;
using PanoramaMusic.Students.Application.Handlers.Guardians;
using PanoramaMusic.Students.Application.Requests.Guardians;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Enums;
using PanoramaMusic.Students.Domain.Events.Guardians;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class UpdateGuardianHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly UpdateGuardianHandler _handler;

	public UpdateGuardianHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<UpdateGuardianHandler>();
	}

	[Fact]
	[Trait("AC", "212UC3")]
	public async Task HandleAsync_ExistingGuardian_UpdatesTheSharedRecord()
	{
		var guardian = GuardianFactory.Create(firstName: "Nomvula", surname: "Dube");
		var relationship = new GuardianRelationship(Guid.NewGuid(), "Father");

		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(relationship);

		var request = new UpdateGuardianRequest(
			relationship.GuardianRelationshipId, "Nomvula", "Khumalo", "0839876543", "nomvula.khumalo@example.com", false, true, true);
		var result = await _handler.HandleAsync(new UpdateGuardianCommand(guardian.GuardianId, request), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Surname.ShouldBe("Khumalo"),
			() => result.GuardianRelationshipId.ShouldBe(relationship.GuardianRelationshipId),
			() => _context.Repositories.GuardianRepositoryMock.Verify(
				r => r.UpdateAsync(It.Is<Guardian>(g => g.GuardianId == guardian.GuardianId && g.Surname == "Khumalo"), It.IsAny<CancellationToken>()),
				Times.Once));
	}

	[Fact]
	[Trait("AC", "212UC2")]
	public async Task HandleAsync_UnknownGuardianRelationshipId_ThrowsDomainException()
	{
		var guardian = GuardianFactory.Create();

		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((GuardianRelationship?)null);

		var request = new UpdateGuardianRequest(Guid.NewGuid(), "Nomvula", "Dube", null, null, false, false, false);

		await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(new UpdateGuardianCommand(guardian.GuardianId, request), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "212UC5")]
	public async Task HandleAsync_FlagsProvided_PersistsEachFlagExactlyAsGiven()
	{
		var guardian = GuardianFactory.Create();
		var relationship = new GuardianRelationship(Guid.NewGuid(), "Mother");

		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(relationship);

		var request = new UpdateGuardianRequest(relationship.GuardianRelationshipId, "Nomvula", "Dube", null, null, true, false, true);
		var result = await _handler.HandleAsync(new UpdateGuardianCommand(guardian.GuardianId, request), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.ReceivesCorrespondence.ShouldBeTrue(),
			() => result.ResponsibleForPayment.ShouldBeFalse(),
			() => result.Married.ShouldBeTrue());
	}

	[Fact]
	public async Task HandleAsync_UnknownGuardianId_ThrowsEntityNotFoundException()
	{
		var guardianId = Guid.NewGuid();

		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((Guardian?)null);

		var request = new UpdateGuardianRequest(Guid.NewGuid(), "Nomvula", "Dube", null, null, false, false, false);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(new UpdateGuardianCommand(guardianId, request), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "300UC1")]
	public async Task HandleAsync_CoordinatorEditingAGuardianNoEnrolledStudentHolds_AppliesTheEdit()
	{
		_context.ActAsCoordinator();

		var guardian = GuardianFactory.Create(firstName: "Nomvula", surname: "Dube");
		var relationship = SetupGuardianAndRelationship(guardian);
		SetupEnrolledLink(guardian, hasEnrolledLink: false);

		var request = Request(relationship.GuardianRelationshipId, surname: "Khumalo");
		var result = await _handler.HandleAsync(
			new UpdateGuardianCommand(guardian.GuardianId, request), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Surname.ShouldBe("Khumalo"),
			() => _context.Repositories.GuardianRepositoryMock.Verify(
				r => r.UpdateAsync(It.IsAny<Guardian>(), It.IsAny<CancellationToken>()), Times.Once));
	}

	[Fact]
	[Trait("AC", "300UC2")]
	public async Task HandleAsync_CoordinatorEditingAGuardianAnEnrolledStudentHolds_IsRefusedAndTheRecordIsUnchanged()
	{
		_context.ActAsCoordinator();

		var guardian = GuardianFactory.Create(firstName: "Nomvula", surname: "Dube");
		var relationship = SetupGuardianAndRelationship(guardian);
		SetupEnrolledLink(guardian, hasEnrolledLink: true);

		var request = Request(relationship.GuardianRelationshipId, surname: "Khumalo");

		var exception = await Should.ThrowAsync<ForbiddenException>(() => _handler.HandleAsync(
			new UpdateGuardianCommand(guardian.GuardianId, request), TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => exception.Message.ShouldContain("Nomvula Dube"),
			// The refusal precedes the mutation, so the in-memory record still
			// holds what it held. Nothing partially applied reaches the row.
			() => guardian.Surname.ShouldBe("Dube"),
			() => _context.Repositories.GuardianRepositoryMock.Verify(
				r => r.UpdateAsync(It.IsAny<Guardian>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	[Fact]
	[Trait("AC", "300UC3")]
	public async Task HandleAsync_TeacherEditingAGuardianAnEnrolledStudentHolds_AppliesTheEdit()
	{
		// The fixture's caller is a Teacher. A Teacher maintains the roster those
		// enrolled students belong to, so the restriction never reaches them —
		// including a caller who also holds Coordinator.
		var guardian = GuardianFactory.Create(firstName: "Nomvula", surname: "Dube");
		var relationship = SetupGuardianAndRelationship(guardian);
		SetupEnrolledLink(guardian, hasEnrolledLink: true);

		var request = Request(relationship.GuardianRelationshipId, surname: "Khumalo");
		var result = await _handler.HandleAsync(
			new UpdateGuardianCommand(guardian.GuardianId, request), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Surname.ShouldBe("Khumalo"),
			() => _context.Repositories.GuardianRepositoryMock.Verify(
				r => r.UpdateAsync(It.IsAny<Guardian>(), It.IsAny<CancellationToken>()), Times.Once),
			// Enrolment is never even consulted for a Teacher.
			() => _context.Repositories.StudentGuardianRepositoryMock.Verify(
				r => r.HasEnrolledLinkAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never));
	}

	private GuardianRelationship SetupGuardianAndRelationship(Guardian guardian)
	{
		var relationship = new GuardianRelationship(Guid.NewGuid(), "Mother");

		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(relationship);

		return relationship;
	}

	private void SetupEnrolledLink(Guardian guardian, bool hasEnrolledLink) =>
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.HasEnrolledLinkAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(hasEnrolledLink);

	private static UpdateGuardianRequest Request(Guid guardianRelationshipId, string surname) =>
		new(guardianRelationshipId, "Nomvula", surname, "0839876543", "nomvula@example.com", false, true, true);

	[Fact]
	[Trait("AC", "300UC17")]
	public async Task HandleAsync_AGuardianOnlyWaitingListStudentsHold_RaisesTheUpdateNamingTheWaitingList()
	{
		var updated = await UpdateAGuardian(waitingListOnly: true);

		updated.Source.ShouldBe(StudentWriteSource.WaitingList);
	}

	[Fact]
	[Trait("AC", "300UC14")]
	public async Task HandleAsync_AGuardianARosterStudentHolds_RaisesTheUpdateNamingTheRoster()
	{
		var updated = await UpdateAGuardian(waitingListOnly: false);

		updated.Source.ShouldBe(StudentWriteSource.Roster);
	}

	/// <summary>
	/// The route names a guardian and no student, so it is the guardian's own
	/// links that say which surface could have reached it.
	/// </summary>
	private async Task<GuardianUpdated> UpdateAGuardian(bool waitingListOnly)
	{
		var guardian = GuardianFactory.Create(firstName: "Nomvula", surname: "Dube");
		guardian.DrainEvents();
		var relationship = new GuardianRelationship(Guid.NewGuid(), "Father");

		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(relationship);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.BelongsToWaitingListOnlyAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(waitingListOnly);

		await _handler.HandleAsync(
			new UpdateGuardianCommand(guardian.GuardianId, Request(relationship.GuardianRelationshipId, "Khumalo")),
			TestContext.Current.CancellationToken);

		return guardian.DrainEvents().OfType<GuardianUpdated>().Single();
	}
}