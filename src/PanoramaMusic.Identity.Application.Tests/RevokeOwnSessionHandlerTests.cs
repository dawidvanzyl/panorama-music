using Microsoft.Extensions.DependencyInjection;
using Moq;
using PanoramaMusic.Identity.Application.Commands.Sessions;
using PanoramaMusic.Identity.Application.Handlers.Sessions;
using PanoramaMusic.Identity.Domain.Entities;
using PanoramaMusic.Identity.Domain.Exceptions;
using PanoramaMusic.Identity.Tests;
using PanoramaMusic.Identity.Tests.Factories;
using Shouldly;
using Xunit;

namespace PanoramaMusic.Identity.Application.Tests;

public class RevokeOwnSessionHandlerTests : IClassFixture<IdentityTestFixture>
{
	private readonly IdentityTestContext _context;
	private readonly Guid _userId;
	private readonly RevokeOwnSessionHandler _handler;

	public RevokeOwnSessionHandlerTests(IdentityTestFixture fixture)
	{
		_context = fixture.CreateContext();

		_userId = Guid.NewGuid();
		_context.Contexts.UserContextMock
			.Setup(c => c.UserId)
			.Returns(_userId);

		_handler = _context.ServiceProvider.GetRequiredService<RevokeOwnSessionHandler>();
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task HandleAsync_OwnNonCurrentSession_RevokesIt()
	{
		var currentToken = RefreshTokenFactory.Create(Guid.NewGuid(), _userId, "current-hash");
		var otherToken = RefreshTokenFactory.Create(Guid.NewGuid(), _userId, "other-hash");

		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.GetByTokenIdAsync(otherToken.TokenId, It.IsAny<CancellationToken>())).ReturnsAsync(otherToken);
		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(currentToken);
		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.RevokeAsync(otherToken.TokenId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

		await _handler.HandleAsync(
			new RevokeOwnSessionCommand(otherToken.TokenId, "raw-current-token"),
			TestContext.Current.CancellationToken);

		_context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.RevokeAsync(otherToken.TokenId, It.IsAny<CancellationToken>()), Times.Once);
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task HandleAsync_OwnNonCurrentSessionWithLiveAccessToken_DenylistsTheAccessToken()
	{
		var currentToken = RefreshTokenFactory.Create(Guid.NewGuid(), _userId, "current-hash");
		var accessTokenJti = Guid.NewGuid();
		var accessTokenExpiresAt = DateTime.UtcNow.AddMinutes(10);
		var otherToken = RefreshTokenFactory.Create(
			Guid.NewGuid(), _userId, "other-hash",
			accessTokenJti: accessTokenJti, accessTokenExpiresAt: accessTokenExpiresAt);

		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.GetByTokenIdAsync(otherToken.TokenId, It.IsAny<CancellationToken>())).ReturnsAsync(otherToken);
		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(currentToken);
		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.RevokeAsync(otherToken.TokenId, It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);

		await _handler.HandleAsync(
			new RevokeOwnSessionCommand(otherToken.TokenId, "raw-current-token"),
			TestContext.Current.CancellationToken);

		ShouldlyHelpers.Satisfy(
			() => _context.Repositories.RevokedAccessTokenRepositoryMock.Verify(r => r.DeleteExpiredAsync(It.IsAny<CancellationToken>()), Times.Once),
			() => _context.Repositories.RevokedAccessTokenRepositoryMock.Verify(
				r => r.CreateAsync(
					It.Is<RevokedAccessToken>(t => t.Jti == accessTokenJti && t.ExpiresAt == accessTokenExpiresAt),
					It.IsAny<CancellationToken>()),
				Times.Once),
			() => _context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.RevokeAsync(otherToken.TokenId, It.IsAny<CancellationToken>()), Times.Once));
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task HandleAsync_OwnCurrentSession_ThrowsDomainExceptionAndNeverRevokes()
	{
		var currentToken = RefreshTokenFactory.Create(Guid.NewGuid(), _userId, "current-hash");

		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.GetByTokenIdAsync(currentToken.TokenId, It.IsAny<CancellationToken>())).ReturnsAsync(currentToken);
		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.GetByTokenHashAsync(It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(currentToken);

		await Should.ThrowAsync<DomainException>(
			() => _handler.HandleAsync(
				new RevokeOwnSessionCommand(currentToken.TokenId, "raw-current-token"),
				TestContext.Current.CancellationToken));

		_context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.RevokeAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}

	[Fact]
	[Trait("AC", "M1.4UC7")]
	public async Task HandleAsync_AnotherUsersSession_ThrowsEntityNotFoundException()
	{
		var otherUsersToken = RefreshTokenFactory.Create(Guid.NewGuid(), Guid.NewGuid(), "other-user-hash");

		_context.Repositories.RefreshTokenRepositoryMock.Setup(r => r.GetByTokenIdAsync(otherUsersToken.TokenId, It.IsAny<CancellationToken>())).ReturnsAsync(otherUsersToken);

		await Should.ThrowAsync<EntityNotFoundException>(
			() => _handler.HandleAsync(
				new RevokeOwnSessionCommand(otherUsersToken.TokenId, "raw-current-token"),
				TestContext.Current.CancellationToken));

		_context.Repositories.RefreshTokenRepositoryMock.Verify(r => r.RevokeAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>()), Times.Never);
	}
}