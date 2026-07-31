using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Commands.GuardianRelationships;
using PanoramaMusic.Students.Application.Handlers.GuardianRelationships;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class DeleteGuardianRelationshipHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly DeleteGuardianRelationshipHandler _handler;

	public DeleteGuardianRelationshipHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<DeleteGuardianRelationshipHandler>();
	}

	[Fact]
	[Trait("AC", "214UC3")]
	public async Task HandleAsync_RelationshipNotAssignedToAnyGuardian_RemovesIt()
	{
		var relationship = GuardianRelationshipFactory.Create(name: "Foster Parent");

		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(relationship);
		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.CountByRelationshipAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(0);

		await _handler.HandleAsync(
			new DeleteGuardianRelationshipCommand(relationship.GuardianRelationshipId), TestContext.Current.CancellationToken);

		_context.Repositories.GuardianRelationshipRepositoryMock.Verify(
			r => r.DeleteAsync(
				It.Is<GuardianRelationship>(g => g.GuardianRelationshipId == relationship.GuardianRelationshipId),
				It.IsAny<CancellationToken>()),
			Times.Once);
	}

	[Fact]
	[Trait("AC", "214UC4")]
	public async Task HandleAsync_RelationshipAssignedToAGuardian_IsRejectedAndLeavesItInPlace()
	{
		var relationship = GuardianRelationshipFactory.Create(name: "Mother");

		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(relationship);
		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.CountByRelationshipAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(2);

		await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(
				new DeleteGuardianRelationshipCommand(relationship.GuardianRelationshipId), TestContext.Current.CancellationToken));

		_context.Repositories.GuardianRelationshipRepositoryMock.Verify(
			r => r.DeleteAsync(It.IsAny<GuardianRelationship>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "214UC3")]
	public async Task HandleAsync_UnknownRelationshipId_ThrowsEntityNotFoundException()
	{
		var guardianRelationshipId = Guid.NewGuid();

		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(guardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((GuardianRelationship?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(
				new DeleteGuardianRelationshipCommand(guardianRelationshipId), TestContext.Current.CancellationToken));
	}
}