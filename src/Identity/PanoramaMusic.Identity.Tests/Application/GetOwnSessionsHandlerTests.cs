using Moq;
using PanoramaMusic.Identity.Application.Commands.Sessions;
using PanoramaMusic.Identity.Application.Handlers.Sessions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class GetOwnSessionsHandlerTests
{
	public GetOwnSessionsHandlerTests()
	{
		RefreshRepo = new Mock<IRefreshTokenRepository>();
		UserContext = new Mock<IUserContext>();

		UserId = Guid.NewGuid();
		UserContext.SetupGet(c => c.UserId).Returns(UserId);

		Handler = new GetOwnSessionsHandler(RefreshRepo.Object, UserContext.Object, new CurrentSessionResolver(RefreshRepo.Object));
	}

	public Mock<IRefreshTokenRepository> RefreshRepo { get; }
	public Mock<IUserContext> UserContext { get; }
	public Guid UserId { get; }
	public GetOwnSessionsHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1.4UC6")]
	public async Task HandleAsync_UserHasActiveSessions_ReturnsOnlyThatUsersSessionsWithCurrentIdentifiable()
	{
		var currentToken = new RefreshToken(Guid.NewGuid(), UserId, "current-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, "Chrome", "127.0.0.1");
		var otherToken = new RefreshToken(Guid.NewGuid(), UserId, "other-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, "Firefox", "127.0.0.2");

		RefreshRepo
			.Setup(r => r.GetActiveByUserIdAsync(UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([currentToken, otherToken]);
		RefreshRepo
			.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()))
			.ReturnsAsync(currentToken);

		var result = await Handler.HandleAsync(
			new GetOwnSessionsCommand("raw-current-token"),
			TestContext.Current.CancellationToken);

		result.Count.ShouldBe(2);
		result.ShouldAllBe(s => s.TokenId == currentToken.TokenId || s.TokenId == otherToken.TokenId);
		result.Single(s => s.TokenId == currentToken.TokenId).IsCurrent.ShouldBeTrue();
		result.Single(s => s.TokenId == otherToken.TokenId).IsCurrent.ShouldBeFalse();
	}
}