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

public class DeleteGuardianHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly DeleteGuardianHandler _handler;

	public DeleteGuardianHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<DeleteGuardianHandler>();
	}

	[Fact]
	[Trait("AC", "212UC10")]
	public async Task HandleAsync_SharedGuardian_DeletesTheRecordAndEveryLink()
	{
		var guardian = GuardianFactory.Create();

		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);

		await _handler.HandleAsync(new DeleteGuardianCommand(guardian.GuardianId), TestContext.Current.CancellationToken);

		_context.Repositories.GuardianRepositoryMock.Verify(
			r => r.DeleteAsync(It.Is<Guardian>(g => g.GuardianId == guardian.GuardianId), It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	public async Task HandleAsync_UnknownGuardianId_ThrowsEntityNotFoundException()
	{
		var guardianId = Guid.NewGuid();

		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((Guardian?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(new DeleteGuardianCommand(guardianId), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "300UC18")]
	public async Task HandleAsync_CoordinatorDeletingAGuardianAnEnrolledStudentHolds_IsRefusedAndTheRecordSurvives()
	{
		// Destroying the shared row reaches every linked student, which is
		// strictly more than the edit the same caller is refused, so it answers
		// to the same rule.
		_context.ActAsCoordinator();

		var guardian = GuardianFactory.Create(firstName: "Nomvula", surname: "Dube");

		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.HasEnrolledLinkAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(true);

		await Should.ThrowAsync<ForbiddenException>(
			() => _handler.HandleAsync(new DeleteGuardianCommand(guardian.GuardianId), TestContext.Current.CancellationToken));

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.GuardianRepositoryMock.Verify(
				r => r.DeleteAsync(It.IsAny<Guardian>(), It.IsAny<CancellationToken>()), Times.Never),
			() => guardian.DrainEvents().ShouldNotContain(e => e is GuardianDeleted));
	}

	[Fact]
	public async Task HandleAsync_CoordinatorDeletingAGuardianNoEnrolledStudentHolds_DeletesTheRecord()
	{
		_context.ActAsCoordinator();

		var guardian = GuardianFactory.Create();

		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.HasEnrolledLinkAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(false);

		await _handler.HandleAsync(new DeleteGuardianCommand(guardian.GuardianId), TestContext.Current.CancellationToken);

		_context.Repositories.GuardianRepositoryMock.Verify(
			r => r.DeleteAsync(It.Is<Guardian>(g => g.GuardianId == guardian.GuardianId), It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	[Trait("AC", "300UC17")]
	public async Task HandleAsync_AGuardianOnlyWaitingListStudentsHold_RaisesTheDeletionNamingTheWaitingList()
	{
		var deleted = await DeleteAGuardian(waitingListOnly: true);

		deleted.Source.ShouldBe(StudentWriteSource.WaitingList);
	}

	[Fact]
	[Trait("AC", "300UC14")]
	public async Task HandleAsync_AGuardianARosterStudentHolds_RaisesTheDeletionNamingTheRoster()
	{
		var deleted = await DeleteAGuardian(waitingListOnly: false);

		deleted.Source.ShouldBe(StudentWriteSource.Roster);
	}

	/// <summary>
	/// The route names a guardian and no student, so it is the guardian's own
	/// links that say which surface could have reached it.
	/// </summary>
	private async Task<GuardianDeleted> DeleteAGuardian(bool waitingListOnly)
	{
		var guardian = GuardianFactory.Create();
		guardian.DrainEvents();

		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.GetByIdAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(guardian);
		_context.Repositories.StudentGuardianRepositoryMock
			.Setup(r => r.BelongsToWaitingListOnlyAsync(guardian.GuardianId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(waitingListOnly);

		await _handler.HandleAsync(new DeleteGuardianCommand(guardian.GuardianId), TestContext.Current.CancellationToken);

		return guardian.DrainEvents().OfType<GuardianDeleted>().Single();
	}
}