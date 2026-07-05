using Moq;
using PanoramaMusic.Identity.Application.Commands.Admin;
using PanoramaMusic.Identity.Application.Handlers.Admin;
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
		Handler = new RevokeSessionHandler(RefreshRepo.Object, RevokedAccessTokenRepo.Object);
	}

	public Mock<IRefreshTokenRepository> RefreshRepo { get; }
	public Mock<IRevokedAccessTokenRepository> RevokedAccessTokenRepo { get; }
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