using Moq;
using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Identity.Application.Commands.Sessions;
using PanoramaMusic.Identity.Application.Handlers.Sessions;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Application.Services.Sessions;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Interfaces;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class RevokeOwnOtherSessionsHandlerTests
{
	public RevokeOwnOtherSessionsHandlerTests()
	{
		RefreshRepo = new Mock<IRefreshTokenRepository>();
		RevokedAccessTokenRepo = new Mock<IRevokedAccessTokenRepository>();
		UserContext = new Mock<IUserContext>();
		AuditLogger = new Mock<IAuditLogger>();
		AuditEventFactory = new Mock<IAuditEventFactory>();

		UserId = Guid.NewGuid();
		UserContext.SetupGet(c => c.UserId).Returns(UserId);

		AuditEventFactory
			.Setup(f => f.Create(
				It.IsAny<string>(), It.IsAny<Guid?>(), It.IsAny<string?>(), It.IsAny<Guid?>(),
				It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<IReadOnlyDictionary<string, object?>?>()))
			.Returns(new AuditEvent(Guid.NewGuid(), DateTime.UtcNow, "test", null, null, null, "127.0.0.1", "test-agent", Guid.NewGuid(), "success", null, new Dictionary<string, object?>()));

		Handler = new RevokeOwnOtherSessionsHandler(
			RefreshRepo.Object,
			RevokedAccessTokenRepo.Object,
			UserContext.Object,
			new CurrentSessionResolver(RefreshRepo.Object),
			AuditLogger.Object,
			AuditEventFactory.Object);
	}

	public Mock<IRefreshTokenRepository> RefreshRepo { get; }
	public Mock<IRevokedAccessTokenRepository> RevokedAccessTokenRepo { get; }
	public Mock<IUserContext> UserContext { get; }
	public Mock<IAuditLogger> AuditLogger { get; }
	public Mock<IAuditEventFactory> AuditEventFactory { get; }
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

		RevokedAccessTokenRepo.Verify(r => r.DeleteExpiredAsync(It.IsAny<CancellationToken>()), Times.Once);
		RevokedAccessTokenRepo.Verify(
			r => r.CreateManyAsync(
				It.Is<IReadOnlyList<RevokedAccessToken>>(list => list.Count == 1 && list[0].Jti == accessTokenJti && list[0].ExpiresAt == accessTokenExpiresAt),
				It.IsAny<CancellationToken>()),
			Times.Once);
		RefreshRepo.Verify(
			r => r.RevokeAllForUserExceptAsync(UserId, currentToken.TokenId, It.IsAny<CancellationToken>()),
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
			.Setup(r => r.RevokeAllForUserExceptAsync(UserId, currentToken.TokenId, It.IsAny<CancellationToken>()))
			.Returns(Task.CompletedTask);

		await Handler.HandleAsync(
			new RevokeOwnOtherSessionsCommand("raw-current-token"),
			TestContext.Current.CancellationToken);

		RevokedAccessTokenRepo.Verify(r => r.DeleteExpiredAsync(It.IsAny<CancellationToken>()), Times.Never);
		RevokedAccessTokenRepo.Verify(r => r.CreateManyAsync(It.IsAny<IReadOnlyList<RevokedAccessToken>>(), It.IsAny<CancellationToken>()), Times.Never);
		RefreshRepo.Verify(
			r => r.RevokeAllForUserExceptAsync(UserId, currentToken.TokenId, It.IsAny<CancellationToken>()),
			Times.Once);
	}
}