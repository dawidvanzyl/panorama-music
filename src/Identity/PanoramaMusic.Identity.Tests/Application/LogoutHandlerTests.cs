using Moq;
using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Audit.Domain.Interfaces;
using PanoramaMusic.Identity.Application.Commands.Auth;
using PanoramaMusic.Identity.Application.Handlers.Auth;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using PanoramaMusic.Identity.Domain.ValueObjects;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class LogoutHandlerTests
{
	public LogoutHandlerTests()
	{
		RefreshRepo = new Mock<IRefreshTokenRepository>();
		RevokedAccessTokenRepo = new Mock<IRevokedAccessTokenRepository>();
		AccessTokenContext = new Mock<IAccessTokenContext>();
		UserContext = new Mock<IUserContext>();
		AuditLogger = new Mock<IAuditLogger>();
		AuditEventFactory = new Mock<IAuditEventFactory>();

		AuditEventFactory
			.Setup(f => f.Create(
				It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<string?>(), It.IsAny<Guid?>(),
				It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<IReadOnlyDictionary<string, object?>?>()))
			.Returns(new AuditEvent(Guid.NewGuid(), DateTime.UtcNow, "test", null, null, null, "127.0.0.1", "test-agent", Guid.NewGuid(), "success", null, new Dictionary<string, object?>()));

		RefreshRepo
			.Setup(r => r.RevokeAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		RevokedAccessTokenRepo
			.Setup(r => r.CreateAsync(It.IsAny<RevokedAccessToken>(), It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		Jti = Guid.NewGuid();
		AccessTokenExpiresAtUtc = DateTime.UtcNow.AddMinutes(15);
		AccessTokenContext.SetupGet(c => c.Jti).Returns(Jti);
		AccessTokenContext.SetupGet(c => c.ExpiresAtUtc).Returns(AccessTokenExpiresAtUtc);

		Handler = new LogoutHandler(RefreshRepo.Object, RevokedAccessTokenRepo.Object, AccessTokenContext.Object, UserContext.Object, AuditLogger.Object, AuditEventFactory.Object);
	}

	public Mock<IRefreshTokenRepository> RefreshRepo { get; }
	public Mock<IRevokedAccessTokenRepository> RevokedAccessTokenRepo { get; }
	public Mock<IAccessTokenContext> AccessTokenContext { get; }
	public Mock<IUserContext> UserContext { get; }
	public Mock<IAuditLogger> AuditLogger { get; }
	public Mock<IAuditEventFactory> AuditEventFactory { get; }
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

		RefreshRepo.Verify(r => r.RevokeAsync(tokenId, TestContext.Current.CancellationToken), Times.Once);
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

		RevokedAccessTokenRepo.Verify(r => r.DeleteExpiredAsync(TestContext.Current.CancellationToken), Times.Once);
		RevokedAccessTokenRepo.Verify(
			r => r.CreateAsync(
				It.Is<RevokedAccessToken>(t => t.Jti == Jti && t.ExpiresAt == AccessTokenExpiresAtUtc),
				TestContext.Current.CancellationToken),
			Times.Once);
		RefreshRepo.Verify(r => r.RevokeAsync(tokenId, TestContext.Current.CancellationToken), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC3")]
	public async Task HandleAsync_NoRefreshTokenCookiePresent_StillDenylistsCurrentAccessToken()
	{
		await Handler.HandleAsync(new LogoutCommand(null), TestContext.Current.CancellationToken);

		RefreshRepo.Verify(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
		RevokedAccessTokenRepo.Verify(
			r => r.CreateAsync(It.Is<RevokedAccessToken>(t => t.Jti == Jti), TestContext.Current.CancellationToken),
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

		RefreshRepo.Verify(r => r.RevokeAsync(tokenId, TestContext.Current.CancellationToken), Times.Once);
		RevokedAccessTokenRepo.Verify(r => r.CreateAsync(It.IsAny<RevokedAccessToken>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}