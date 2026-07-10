using Moq;
using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Audit.Domain.Interfaces;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class RevokeAllSessionsHandlerTests
{
	public RevokeAllSessionsHandlerTests()
	{
		RefreshRepo = new Mock<IRefreshTokenRepository>();
		RevokedAccessTokenRepo = new Mock<IRevokedAccessTokenRepository>();
		UserContext = new Mock<IUserContext>();
		UserContext.SetupGet(u => u.UserId).Returns(Guid.NewGuid());
		AuditLogger = new Mock<IAuditLogger>();
		AuditEventFactory = new Mock<IAuditEventFactory>();

		AuditEventFactory
			.Setup(f => f.Create(
				It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<string?>(), It.IsAny<Guid?>(),
				It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<IReadOnlyDictionary<string, object?>?>()))
			.Returns(new AuditEvent(Guid.NewGuid(), DateTime.UtcNow, "test", null, null, null, "127.0.0.1", "test-agent", Guid.NewGuid(), "success", null, new Dictionary<string, object?>()));

		Handler = new RevokeAllSessionsHandler(RefreshRepo.Object, RevokedAccessTokenRepo.Object, new CurrentSessionResolver(RefreshRepo.Object), UserContext.Object, AuditLogger.Object, AuditEventFactory.Object);
	}

	public Mock<IRefreshTokenRepository> RefreshRepo { get; }
	public Mock<IRevokedAccessTokenRepository> RevokedAccessTokenRepo { get; }
	public Mock<IUserContext> UserContext { get; }
	public Mock<IAuditLogger> AuditLogger { get; }
	public Mock<IAuditEventFactory> AuditEventFactory { get; }
	public RevokeAllSessionsHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1.4UC9")]
	public async Task HandleAsync_RevokesEverySessionExceptTheAdminsOwnCurrentOne()
	{
		var adminCurrentToken = new RefreshToken(Guid.NewGuid(), Guid.NewGuid(), "admin-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null);
		var accessTokenJti = Guid.NewGuid();
		var accessTokenExpiresAt = DateTime.UtcNow.AddMinutes(10);
		var otherUserToken = new RefreshToken(
			Guid.NewGuid(), Guid.NewGuid(), "other-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null,
			accessTokenJti, accessTokenExpiresAt);

		RefreshRepo.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(adminCurrentToken);
		RefreshRepo.Setup(r => r.GetAllActiveAsync(It.IsAny<CancellationToken>())).ReturnsAsync([adminCurrentToken, otherUserToken]);
		RefreshRepo
			.Setup(r => r.RevokeAllExceptAsync(adminCurrentToken.TokenId, It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		await Handler.HandleAsync(new RevokeAllSessionsCommand("raw-admin-token"), TestContext.Current.CancellationToken);

		RevokedAccessTokenRepo.Verify(r => r.DeleteExpiredAsync(It.IsAny<CancellationToken>()), Times.Once);
		RevokedAccessTokenRepo.Verify(
			r => r.CreateManyAsync(
				It.Is<IReadOnlyList<RevokedAccessToken>>(list => list.Count == 1 && list[0].Jti == accessTokenJti && list[0].ExpiresAt == accessTokenExpiresAt),
				It.IsAny<CancellationToken>()),
			Times.Once);
		RefreshRepo.Verify(r => r.RevokeAllExceptAsync(adminCurrentToken.TokenId, It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC9")]
	public async Task HandleAsync_ExcludesSessionsWithoutALiveAccessTokenFromTheDenylistList()
	{
		var adminCurrentToken = new RefreshToken(Guid.NewGuid(), Guid.NewGuid(), "admin-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null);
		var sessionWithoutAccessToken = new RefreshToken(Guid.NewGuid(), Guid.NewGuid(), "no-token-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null);
		var sessionWithExpiredAccessToken = new RefreshToken(
			Guid.NewGuid(), Guid.NewGuid(), "expired-token-hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null,
			Guid.NewGuid(), DateTime.UtcNow.AddMinutes(-1));

		RefreshRepo.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(adminCurrentToken);
		RefreshRepo
			.Setup(r => r.GetAllActiveAsync(It.IsAny<CancellationToken>()))
			.ReturnsAsync([adminCurrentToken, sessionWithoutAccessToken, sessionWithExpiredAccessToken]);
		RefreshRepo
			.Setup(r => r.RevokeAllExceptAsync(adminCurrentToken.TokenId, It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		await Handler.HandleAsync(new RevokeAllSessionsCommand("raw-admin-token"), TestContext.Current.CancellationToken);

		RevokedAccessTokenRepo.Verify(r => r.DeleteExpiredAsync(It.IsAny<CancellationToken>()), Times.Never);
		RevokedAccessTokenRepo.Verify(r => r.CreateManyAsync(It.IsAny<IReadOnlyList<RevokedAccessToken>>(), It.IsAny<CancellationToken>()), Times.Never);
		RefreshRepo.Verify(r => r.RevokeAllExceptAsync(adminCurrentToken.TokenId, It.IsAny<CancellationToken>()), Times.Once);
	}
}