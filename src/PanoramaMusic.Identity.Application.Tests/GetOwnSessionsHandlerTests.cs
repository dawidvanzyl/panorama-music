using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Identity.Application.Commands.Sessions;
using PanoramaMusic.Identity.Application.Handlers.Sessions;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Tests;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Application.Tests;

public class GetOwnSessionsHandlerTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly GetOwnSessionsHandler _handler;

	public GetOwnSessionsHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();
		_handler = _context.ServiceProvider.GetRequiredService<GetOwnSessionsHandler>();
	}

	[Fact]
	[Trait("AC", "M1.4UC6")]
	public async Task HandleAsync_UserHasActiveSessions_ReturnsOnlyThatUsersSessionsWithCurrentIdentifiable()
	{
		var userId = Guid.NewGuid();
		var currentToken = new RefreshToken(Guid.NewGuid(), userId, "current-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, "Chrome", "127.0.0.1");
		var otherToken = new RefreshToken(Guid.NewGuid(), userId, "other-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, "Firefox", "127.0.0.2");

		_context.Contexts.UserContextMock
			.SetupGet(c => c.UserId)
			.Returns(userId);

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.GetActiveByUserIdAsync(userId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([currentToken, otherToken]);

		_context.Repositories.RefreshTokenRepositoryMock
			.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(currentToken);

		var result = await _handler.HandleAsync(
			new GetOwnSessionsCommand("raw-current-token"),
			TestContext.Current.CancellationToken);

		result.Count.ShouldBe(2);
		result.ShouldSatisfyAllConditions(
			result => result.ShouldAllBe(s => s.TokenId == currentToken.TokenId || s.TokenId == otherToken.TokenId),
			result => result.Single(s => s.TokenId == currentToken.TokenId).IsCurrent.ShouldBeTrue(),
			result => result.Single(s => s.TokenId == otherToken.TokenId).IsCurrent.ShouldBeFalse());
	}
}