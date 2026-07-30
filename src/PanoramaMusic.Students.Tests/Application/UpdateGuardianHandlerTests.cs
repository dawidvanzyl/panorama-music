using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.Guardians;
using PanoramaMusic.Students.Application.Handlers.Guardians;
using PanoramaMusic.Students.Application.Requests.Guardians;
using PanoramaMusic.Students.Domain.Entities;
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
}