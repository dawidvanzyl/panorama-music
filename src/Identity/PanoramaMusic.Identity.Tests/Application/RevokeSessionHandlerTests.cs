using Moq;
using PanoramaMusic.Audit.Application.Factories;
using PanoramaMusic.Audit.Application.Interfaces;
using PanoramaMusic.Audit.Domain.Entities;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Handlers.Admin;
using PanoramaMusic.Identity.Application.Interfaces;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Domain.Interfaces;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Tests.Application;

public class RevokeSessionHandlerTests
{
	public RevokeSessionHandlerTests()
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

		Handler = new RevokeSessionHandler(RefreshRepo.Object, RevokedAccessTokenRepo.Object, UserContext.Object, AuditLogger.Object, AuditEventFactory.Object);
	}

	public Mock<IRefreshTokenRepository> RefreshRepo { get; }
	public Mock<IRevokedAccessTokenRepository> RevokedAccessTokenRepo { get; }
	public Mock<IUserContext> UserContext { get; }
	public Mock<IAuditLogger> AuditLogger { get; }
	public Mock<IAuditEventFactory> AuditEventFactory { get; }
	public RevokeSessionHandler Handler { get; }

	[Fact]
	[Trait("AC", "M1.4UC9")]
	public async Task HandleAsync_ExistingSession_RevokesIt()
	{
		var session = new RefreshToken(Guid.NewGuid(), Guid.NewGuid(), "hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null);
		RefreshRepo.Setup(r => r.GetByTokenIdAsync(session.TokenId, It.IsAny<CancellationToken>())).ReturnsAsync(session);
		RefreshRepo.Setup(r => r.RevokeAsync(session.TokenId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

		await Handler.HandleAsync(new RevokeSessionCommand(session.TokenId), TestContext.Current.CancellationToken);

		RefreshRepo.Verify(r => r.RevokeAsync(session.TokenId, It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC9")]
	public async Task HandleAsync_SessionWithLiveAccessToken_DenylistsTheAccessToken()
	{
		var accessTokenJti = Guid.NewGuid();
		var accessTokenExpiresAt = DateTime.UtcNow.AddMinutes(10);
		var session = new RefreshToken(
			Guid.NewGuid(), Guid.NewGuid(), "hash", DateTime.UtcNow.AddDays(7), Guid.NewGuid(), DateTime.UtcNow, null, null,
			accessTokenJti, accessTokenExpiresAt);
		RefreshRepo.Setup(r => r.GetByTokenIdAsync(session.TokenId, It.IsAny<CancellationToken>())).ReturnsAsync(session);
		RefreshRepo.Setup(r => r.RevokeAsync(session.TokenId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

		await Handler.HandleAsync(new RevokeSessionCommand(session.TokenId), TestContext.Current.CancellationToken);

		RevokedAccessTokenRepo.Verify(r => r.DeleteExpiredAsync(It.IsAny<CancellationToken>()), Times.Once);
		RevokedAccessTokenRepo.Verify(
			r => r.CreateAsync(
				It.Is<RevokedAccessToken>(t => t.Jti == accessTokenJti && t.ExpiresAt == accessTokenExpiresAt),
				It.IsAny<CancellationToken>()),
			Times.Once);
		RefreshRepo.Verify(r => r.RevokeAsync(session.TokenId, It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC9")]
	public async Task HandleAsync_UnknownSession_ThrowsEntityNotFoundException()
	{
		RefreshRepo.Setup(r => r.GetByTokenIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>())).ReturnsAsync((RefreshToken?)null);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => Handler.HandleAsync(new RevokeSessionCommand(Guid.NewGuid()), TestContext.Current.CancellationToken));
	}
}