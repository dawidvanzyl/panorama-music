using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.GuardianRelationships;
using PanoramaMusic.Students.Application.Handlers.GuardianRelationships;
using PanoramaMusic.Students.Application.Requests.GuardianRelationships;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class RenameGuardianRelationshipHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly RenameGuardianRelationshipHandler _handler;

	public RenameGuardianRelationshipHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<RenameGuardianRelationshipHandler>();
	}

	[Fact]
	[Trait("AC", "214UC2")]
	public async Task HandleAsync_ExistingRelationship_PersistsTheNewName()
	{
		var relationship = GuardianRelationshipFactory.Create(name: "Legal Guardian");

		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(relationship);
		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByNameAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((GuardianRelationship?)null);

		var request = new UpdateGuardianRelationshipRequest("Court-Appointed Guardian");
		var result = await _handler.HandleAsync(
			new RenameGuardianRelationshipCommand(relationship.GuardianRelationshipId, request), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Name.ShouldBe("Court-Appointed Guardian"),
			() => _context.Repositories.GuardianRelationshipRepositoryMock.Verify(
				r => r.UpdateAsync(
					It.Is<GuardianRelationship>(g => g.GuardianRelationshipId == relationship.GuardianRelationshipId && g.Name == "Court-Appointed Guardian"),
					It.IsAny<CancellationToken>()),
				Times.Once));
	}

	[Fact]
	[Trait("AC", "214UC2")]
	public async Task HandleAsync_NameAlreadyUsedByAnotherRelationship_ThrowsDomainException()
	{
		var relationship = GuardianRelationshipFactory.Create(name: "Legal Guardian");

		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(relationship);
		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByNameAsync("Mother", It.IsAny<CancellationToken>()))
			.ReturnsAsync(GuardianRelationshipFactory.Create(name: "Mother"));

		var request = new UpdateGuardianRelationshipRequest("Mother");

		await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(
				new RenameGuardianRelationshipCommand(relationship.GuardianRelationshipId, request), TestContext.Current.CancellationToken));
	}

	[Fact]
	[Trait("AC", "214UC2")]
	public async Task HandleAsync_UnknownRelationshipId_ThrowsEntityNotFoundException()
	{
		var guardianRelationshipId = Guid.NewGuid();

		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(guardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((GuardianRelationship?)null);

		var request = new UpdateGuardianRelationshipRequest("Stepmother");

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(
				new RenameGuardianRelationshipCommand(guardianRelationshipId, request), TestContext.Current.CancellationToken));
	}
}