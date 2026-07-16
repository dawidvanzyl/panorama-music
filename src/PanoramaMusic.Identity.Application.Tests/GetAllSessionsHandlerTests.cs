using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Enums;
using PanoramaMusic.Identity.Tests;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Application.Tests;

public class GetAllSessionsHandlerTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly GetAllSessionsHandler _handler;

	public GetAllSessionsHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<GetAllSessionsHandler>();
	}

	[Fact]
	[Trait("AC", "M1.4UC8")]
	public async Task HandleAsync_SessionsAcrossMultipleUsers_ReturnsAllWithOwningUserIdentified()
	{
		var userAId = Guid.NewGuid();
		var userBId = Guid.NewGuid();
		var sessionA = new SessionWithOwner(Guid.NewGuid(), userAId, "a@test.com", [Role.Teacher], DateTime.UtcNow, DateTime.UtcNow, DateTime.UtcNow.AddDays(7), null, null);
		var sessionB = new SessionWithOwner(Guid.NewGuid(), userBId, "b@test.com", [Role.Admin], DateTime.UtcNow, DateTime.UtcNow, DateTime.UtcNow.AddDays(7), null, null);

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.GetAllActiveWithOwnerAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([sessionA, sessionB]);

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync((RefreshToken?)null);

		var result = await _handler.HandleAsync(new GetAllSessionsCommand(null), TestContext.Current.CancellationToken);

		result.Count.ShouldBe(2);
		result.ShouldSatisfyAllConditions(
			result => result.Single(s => s.TokenId == sessionA.TokenId).UserEmail.ShouldBe("a@test.com"),
			result => result.Single(s => s.TokenId == sessionB.TokenId).UserEmail.ShouldBe("b@test.com"));
	}
}