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
		UserContext = new Mock<IUserContext>();

		UserId = Guid.NewGuid();
		UserContext.SetupGet(c => c.UserId).Returns(UserId);

		Handler = new RevokeOwnOtherSessionsHandler(RefreshRepo.Object, UserContext.Object, new CurrentSessionResolver(RefreshRepo.Object));
	}

	public Mock<IRefreshTokenRepository> RefreshRepo { get; }
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
			.Setup(r => r.RevokeAllForUserExceptAsync(UserId, currentToken.TokenId, It.IsAny<IReadOnlyList<RevokedAccessToken>>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		await Handler.HandleAsync(
			new RevokeOwnOtherSessionsCommand("raw-current-token"),
			TestContext.Current.CancellationToken);

		RefreshRepo.Verify(
			r => r.RevokeAllForUserExceptAsync(
				UserId,
				currentToken.TokenId,
				It.Is<IReadOnlyList<RevokedAccessToken>>(list => list.Count == 1 && list[0].Jti == accessTokenJti && list[0].ExpiresAt == accessTokenExpiresAt),
				It.IsAny<CancellationToken>()),
			Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task HandleAsync_ExcludesSessionsWithoutALiveAccessTokenFromTheDenylistList()
	{
		var currentToken = new RefreshToken(Guid.NewGuid(), UserId, "current-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null);
		var sessionWithoutAccessToken = new RefreshToken(Guid.NewGuid(), UserId, "no-token-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null);
		var sessionWithExpiredAccessToken = new RefreshToken(
			Guid.NewGuid(), UserId, "expired-token-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null,
			Guid.NewGuid(), DateTime.UtcNow.AddMinutes(-1));

		RefreshRepo.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(currentToken);
		RefreshRepo
			.Setup(r => r.GetActiveByUserIdAsync(UserId, It.IsAny<CancellationToken>()))
			.ReturnsAsync([currentToken, sessionWithoutAccessToken, sessionWithExpiredAccessToken]);
		RefreshRepo
			.Setup(r => r.RevokeAllForUserExceptAsync(UserId, currentToken.TokenId, It.IsAny<IReadOnlyList<RevokedAccessToken>>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		await Handler.HandleAsync(
			new RevokeOwnOtherSessionsCommand("raw-current-token"),
			TestContext.Current.CancellationToken);

		RefreshRepo.Verify(
			r => r.RevokeAllForUserExceptAsync(
				UserId,
				currentToken.TokenId,
				It.Is<IReadOnlyList<RevokedAccessToken>>(list => list.Count == 0),
				It.IsAny<CancellationToken>()),
			Times.Once);
	}
}