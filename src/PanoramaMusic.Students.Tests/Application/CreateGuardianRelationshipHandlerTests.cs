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

public class CreateGuardianRelationshipHandlerTests : IClassFixture<StudentsTestFixture>
{
	private readonly StudentsTestContext _context;
	private readonly CreateGuardianRelationshipHandler _handler;

	public CreateGuardianRelationshipHandlerTests(StudentsTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<CreateGuardianRelationshipHandler>();
	}

	[Fact]
	[Trait("AC", "214UC1")]
	public async Task HandleAsync_ValidName_PersistsTheNewRelationshipType()
	{
		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByNameAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((GuardianRelationship?)null);

		var request = new CreateGuardianRelationshipRequest("Foster Parent");
		var result = await _handler.HandleAsync(new CreateGuardianRelationshipCommand(request), TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => result.Name.ShouldBe("Foster Parent"),
			() => result.GuardianRelationshipId.ShouldNotBe(Guid.Empty),
			() => _context.Repositories.GuardianRelationshipRepositoryMock.Verify(
				r => r.CreateAsync(It.Is<GuardianRelationship>(g => g.Name == "Foster Parent"), It.IsAny<CancellationToken>()),
				Times.Once));
	}

	[Fact]
	[Trait("AC", "214UC1")]
	public async Task HandleAsync_NameAlreadyInUse_ThrowsDomainException()
	{
		_context.Repositories.GuardianRelationshipRepositoryMock
			.Setup(r => r.GetByNameAsync("Mother", It.IsAny<CancellationToken>()))
			.ReturnsAsync(GuardianRelationshipFactory.Create(name: "Mother"));

		var request = new CreateGuardianRelationshipRequest("Mother");

		await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(new CreateGuardianRelationshipCommand(request), TestContext.Current.CancellationToken));
	}
}