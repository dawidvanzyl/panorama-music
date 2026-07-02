using Moq;
using PanoramaMusic.Identity.Application.Commands.Sessions;
using PanoramaMusic.Identity.Application.Handlers.Sessions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class RevokeOwnSessionHandlerTests
{
	public RevokeOwnSessionHandlerTests()
	{
		RefreshRepo = new Mock<IRefreshTokenRepository>();
		RevokedAccessTokenRepo = new Mock<IRevokedAccessTokenRepository>();
		UserContext = new Mock<IUserContext>();

		UserId = Guid.NewGuid();
		UserContext.SetupGet(c => c.UserId).Returns(UserId);

		Handler = new RevokeOwnSessionHandler(RefreshRepo.Object, RevokedAccessTokenRepo.Object, UserContext.Object, new CurrentSessionResolver(RefreshRepo.Object));
	}

	public Mock<IRefreshTokenRepository> RefreshRepo { get; }
	public Mock<IRevokedAccessTokenRepository> RevokedAccessTokenRepo { get; }
	public Mock<IUserContext> UserContext { get; }
	public Guid UserId { get; }
	public RevokeOwnSessionHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task HandleAsync_OwnNonCurrentSession_RevokesIt()
	{
		var currentToken = new RefreshToken(Guid.NewGuid(), UserId, "current-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null);
		var otherToken = new RefreshToken(Guid.NewGuid(), UserId, "other-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null);

		RefreshRepo.Setup(r => r.GetByTokenIdAsync(otherToken.TokenId, It.IsAny<CancellationToken>())).ReturnsAsync(otherToken);
		RefreshRepo.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(currentToken);
		RefreshRepo.Setup(r => r.RevokeAsync(otherToken.TokenId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

		await Handler.HandleAsync(
			new RevokeOwnSessionCommand(otherToken.TokenId, "raw-current-token"),
			TestContext.Current.CancellationToken);

		RefreshRepo.Verify(r => r.RevokeAsync(otherToken.TokenId, It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task HandleAsync_OwnNonCurrentSessionWithLiveAccessToken_DenylistsTheAccessToken()
	{
		var currentToken = new RefreshToken(Guid.NewGuid(), UserId, "current-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null);
		var accessTokenJti = Guid.NewGuid();
		var accessTokenExpiresAt = DateTime.UtcNow.AddMinutes(10);
		var otherToken = new RefreshToken(
			Guid.NewGuid(), UserId, "other-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null,
			accessTokenJti, accessTokenExpiresAt);

		RefreshRepo.Setup(r => r.GetByTokenIdAsync(otherToken.TokenId, It.IsAny<CancellationToken>())).ReturnsAsync(otherToken);
		RefreshRepo.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(currentToken);
		RefreshRepo.Setup(r => r.RevokeAsync(otherToken.TokenId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

		await Handler.HandleAsync(
			new RevokeOwnSessionCommand(otherToken.TokenId, "raw-current-token"),
			TestContext.Current.CancellationToken);

		RevokedAccessTokenRepo.Verify(
			r => r.AddAsync(It.Is<RevokedAccessToken>(t => t.Jti == accessTokenJti && t.ExpiresAt == accessTokenExpiresAt), It.IsAny<CancellationToken>()),
			Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task HandleAsync_OwnCurrentSession_ThrowsDomainExceptionAndNeverRevokes()
	{
		var currentToken = new RefreshToken(Guid.NewGuid(), UserId, "current-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null);

		RefreshRepo.Setup(r => r.GetByTokenIdAsync(currentToken.TokenId, It.IsAny<CancellationToken>())).ReturnsAsync(currentToken);
		RefreshRepo.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(currentToken);

		await Should.ThrowAsync<DomainException>(
			() => Handler.HandleAsync(
				new RevokeOwnSessionCommand(currentToken.TokenId, "raw-current-token"),
				TestContext.Current.CancellationToken));

		RefreshRepo.Verify(r => r.RevokeAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task HandleAsync_AnotherUsersSession_ThrowsEntityNotFoundException()
	{
		var otherUsersToken = new RefreshToken(Guid.NewGuid(), Guid.NewGuid(), "other-user-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null);

		RefreshRepo.Setup(r => r.GetByTokenIdAsync(otherUsersToken.TokenId, It.IsAny<CancellationToken>())).ReturnsAsync(otherUsersToken);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => Handler.HandleAsync(
				new RevokeOwnSessionCommand(otherUsersToken.TokenId, "raw-current-token"),
				TestContext.Current.CancellationToken));

		RefreshRepo.Verify(r => r.RevokeAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}