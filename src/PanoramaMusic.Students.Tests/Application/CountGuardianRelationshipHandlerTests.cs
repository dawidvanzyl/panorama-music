using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Students.Application.Handlers.GuardianRelationships;
using PanoramaMusic.Students.Domain.Entities;
using PanoramaMusic.Students.Domain.Exceptions;
using PanoramaMusic.Students.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Students.Tests.Application;

public class CountGuardianRelationshipHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly CountGuardianRelationshipHandler _handler;

	public CountGuardianRelationshipHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<CountGuardianRelationshipHandler>();
	}

	[Fact]
	[Trait("AC", "214UC4")]
	public async Task HandleAsync_RelationshipAssignedToGuardians_ReturnsHowManyUseIt()
	{
		var relationship = GuardianRelationshipFactory.Create(name: "Mother");

		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(relationship);
		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.CountByRelationshipAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(3);

		var result = await _handler.HandleAsync(relationship.GuardianRelationshipId, TestContext.Current.CancellationToken);

		result.Count.ShouldBe(3);
	}

	[Fact]
	[Trait("AC", "214UC3")]
	public async Task HandleAsync_RelationshipNotAssignedToAnyGuardian_ReturnsZero()
	{
		var relationship = GuardianRelationshipFactory.Create(name: "Foster Parent");

		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(relationship);
		_context.Repositories.GuardianRepositoryMock
			.Setup(r => r.CountByRelationshipAsync(relationship.GuardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync(0);

		var result = await _handler.HandleAsync(relationship.GuardianRelationshipId, TestContext.Current.CancellationToken);

		result.Count.ShouldBe(0);
	}

	[Fact]
	[Trait("AC", "214UC4")]
	public async Task HandleAsync_UnknownRelationshipId_ThrowsEntityNotFoundException()
	{
		var guardianRelationshipId = Guid.NewGuid();

		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByIdAsync(guardianRelationshipId, It.IsAny<CancellationToken>()))
			.ReturnsAsync((GuardianRelationship?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(guardianRelationshipId, TestContext.Current.CancellationToken));
	}
}