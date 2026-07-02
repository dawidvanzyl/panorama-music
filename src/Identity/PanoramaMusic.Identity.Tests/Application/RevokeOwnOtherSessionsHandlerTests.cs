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

public class RevokeOwnOtherSessionsHandlerTests
{
	public RevokeOwnOtherSessionsHandlerTests()
	{
		RefreshRepo = new Mock<IRefreshTokenRepository>();
		RevokedAccessTokenRepo = new Mock<IRevokedAccessTokenRepository>();
		UserContext = new Mock<IUserContext>();

		UserId = Guid.NewGuid();
		UserContext.SetupGet(c => c.UserId).Returns(UserId);

		Handler = new RevokeOwnOtherSessionsHandler(RefreshRepo.Object, RevokedAccessTokenRepo.Object, UserContext.Object, new CurrentSessionResolver(RefreshRepo.Object));
	}

	public Mock<IRefreshTokenRepository> RefreshRepo { get; }
	public Mock<IRevokedAccessTokenRepository> RevokedAccessTokenRepo { get; }
	public Mock<IUserContext> UserContext { get; }
	public Guid UserId { get; }
	public RevokeOwnOtherSessionsHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task HandleAsync_RevokesEveryOtherSessionButNeverTheCurrentOne()
	{
		var currentToken = new RefreshToken(Guid.NewGuid(), UserId, "current-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null);
		var accessTokenJti = Guid.NewGuid();
		var accessTokenExpiresAt = DateTime.UtcNow.AddMinutes(10);
		var otherToken = new RefreshToken(
			Guid.NewGuid(), UserId, "other-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null,
			accessTokenJti, accessTokenExpiresAt);

		RefreshRepo.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(currentToken);
		RefreshRepo
			.Setup(r => r.GetActiveByUserIdAsync(UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([currentToken, otherToken]);
		RefreshRepo
			.Setup(r => r.RevokeAllForUserExceptAsync(UserId, currentToken.TokenId, It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		await Handler.HandleAsync(
			new RevokeOwnOtherSessionsCommand("raw-current-token"),
			TestContext.Current.CancellationToken);

		RefreshRepo.Verify(r => r.RevokeAllForUserExceptAsync(UserId, currentToken.TokenId, It.IsAny<CancellationToken>()), Times.Once);
		RevokedAccessTokenRepo.Verify(
			r => r.AddAsync(It.Is<RevokedAccessToken>(t => t.Jti == accessTokenJti && t.ExpiresAt == accessTokenExpiresAt), It.IsAny<CancellationToken>()),
			Times.Once);
	}
}