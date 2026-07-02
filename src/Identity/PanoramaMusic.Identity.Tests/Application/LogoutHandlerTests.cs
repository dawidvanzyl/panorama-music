using Moq;
using PanoramaMusic.Identity.Application;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class LogoutHandlerTests
{
	public LogoutHandlerTests()
	{
		RefreshRepo = new Mock<IRefreshTokenRepository>();
		RevokedAccessTokenRepo = new Mock<IRevokedAccessTokenRepository>();
		AccessTokenContext = new Mock<IAccessTokenContext>();

		RefreshRepo
			.Setup(r => r.UpdateAsync(It.IsAny<RefreshToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		RevokedAccessTokenRepo
			.Setup(r => r.AddAsync(It.IsAny<RevokedAccessToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		Jti = Guid.NewGuid();
		AccessTokenExpiresAtUtc = DateTime.UtcNow.AddMinutes(15);
		AccessTokenContext.SetupGet(c => c.Jti).Returns(Jti);
		AccessTokenContext.SetupGet(c => c.ExpiresAtUtc).Returns(AccessTokenExpiresAtUtc);

		Handler = new LogoutHandler(RefreshRepo.Object, RevokedAccessTokenRepo.Object, AccessTokenContext.Object);
	}

	public Mock<IRefreshTokenRepository> RefreshRepo { get; }
	public Mock<IRevokedAccessTokenRepository> RevokedAccessTokenRepo { get; }
	public Mock<IAccessTokenContext> AccessTokenContext { get; }
	public Guid Jti { get; }
	public DateTime AccessTokenExpiresAtUtc { get; }
	public LogoutHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1UC31")]
	public async Task HandleAsync_ValidToken_RevokesRefreshToken()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var userId = Guid.NewGuid();

		var tokenId = Guid.NewGuid();
		var token = new RefreshToken(tokenId, userId, tokenHash, DateTime.UtcNow.AddDays(7), tokenId, DateTime.UtcNow, null, null);
		RefreshRepo
			.Setup(r => r.GetByTokenHashAsync(tokenHash, TestContext.Current.CancellationToken))
			.ReturnsAsync(token);

		await Handler.HandleAsync(new LogoutCommand(rawToken), TestContext.Current.CancellationToken);

		token.IsRevoked.ShouldBeTrue();
		RefreshRepo.Verify(r => r.UpdateAsync(token, TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC3")]
	public async Task HandleAsync_ValidToken_DenylistsCurrentAccessTokenByJti()
	{
		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var tokenId = Guid.NewGuid();
		var token = new RefreshToken(tokenId, Guid.NewGuid(), tokenHash, DateTime.UtcNow.AddDays(7), tokenId, DateTime.UtcNow, null, null);
		RefreshRepo
			.Setup(r => r.GetByTokenHashAsync(tokenHash, TestContext.Current.CancellationToken))
			.ReturnsAsync(token);

		await Handler.HandleAsync(new LogoutCommand(rawToken), TestContext.Current.CancellationToken);

		RevokedAccessTokenRepo.Verify(
			r => r.AddAsync(It.Is<RevokedAccessToken>(t => t.Jti == Jti && t.ExpiresAt == AccessTokenExpiresAtUtc), TestContext.Current.CancellationToken),
			Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC3")]
	public async Task HandleAsync_NoRefreshTokenCookiePresent_StillDenylistsCurrentAccessToken()
	{
		await Handler.HandleAsync(new LogoutCommand(null), TestContext.Current.CancellationToken);

		RefreshRepo.Verify(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
		RevokedAccessTokenRepo.Verify(
			r => r.AddAsync(It.Is<RevokedAccessToken>(t => t.Jti == Jti), TestContext.Current.CancellationToken),
			Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC3")]
	public async Task HandleAsync_AccessTokenAlreadyExpiredSoNoAuthenticatedPrincipal_StillRevokesRefreshTokenWithoutDenylisting()
	{
		AccessTokenContext.SetupGet(c => c.Jti).Returns((Guid?)null);
		AccessTokenContext.SetupGet(c => c.ExpiresAtUtc).Returns((DateTime?)null);

		var rawToken = Guid.NewGuid().ToString();
		var tokenHash = RawToken.From(rawToken).Hash;
		var tokenId = Guid.NewGuid();
		var token = new RefreshToken(tokenId, Guid.NewGuid(), tokenHash, DateTime.UtcNow.AddDays(7), tokenId, DateTime.UtcNow, null, null);
		RefreshRepo
			.Setup(r => r.GetByTokenHashAsync(tokenHash, TestContext.Current.CancellationToken))
			.ReturnsAsync(token);

		await Handler.HandleAsync(new LogoutCommand(rawToken), TestContext.Current.CancellationToken);

		token.IsRevoked.ShouldBeTrue();
		RefreshRepo.Verify(r => r.UpdateAsync(token, TestContext.Current.CancellationToken), Times.Once);
		RevokedAccessTokenRepo.Verify(r => r.AddAsync(It.IsAny<RevokedAccessToken>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}